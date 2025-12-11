const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const QRCode = require('qrcode');

const app = express();
const PORT = 9100;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.1.0',
    platform: 'windows',
    timestamp: new Date().toISOString()
  });
});

// Listar impresoras de Windows
app.get('/printers', (req, res) => {
  exec('wmic printer get name,default,printerstatus', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'No se pudieron listar las impresoras',
        details: error.message
      });
    }

    const lines = stdout.split('\n').filter(line => line.trim());
    const printers = [];
    let defaultPrinter = null;

    // Saltar la primera línea (headers)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const match = line.match(/^(TRUE|FALSE)\s+(.+?)\s+(\w+)\s*$/);
      if (match) {
        const isDefault = match[1] === 'TRUE';
        const name = match[2].trim();
        const status = match[3];

        const printer = {
          name,
          isDefault,
          status: status === 'OK' || status === 'Idle' ? 'IDLE' : status
        };

        printers.push(printer);
        if (isDefault) {
          defaultPrinter = name;
        }
      }
    }

    res.json({
      success: true,
      printers,
      default: defaultPrinter,
      count: printers.length
    });
  });
});

// Imprimir ticket
app.post('/print', async (req, res) => {
  try {
    const { data, printerName, template = 'simple' } = req.body;

    if (!data || !data.business || !data.sale) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos. Se requieren data.business y data.sale'
      });
    }

    console.log('🎫 Nueva solicitud de impresión');
    console.log(`   Template: ${template}`);
    console.log(`   Impresora: ${printerName || 'Por defecto'}`);

    // Generar HTML del ticket
    const html = await generateTicketHTML(data);

    // Guardar HTML en archivo temporal
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const htmlFile = path.join(tempDir, `ticket-${Date.now()}.html`);
    fs.writeFileSync(htmlFile, html);

    console.log(`   Archivo generado: ${htmlFile}`);

    // Instrucciones para el usuario
    const instructions = {
      success: true,
      printer: printerName || 'Impresora predeterminada',
      template,
      file: htmlFile,
      message: 'Ticket generado exitosamente',
      instructions: [
        '1. Abrir el archivo HTML generado',
        '2. Presionar Ctrl+P para imprimir',
        '3. Seleccionar la impresora térmica',
        '4. Configurar tamaño de papel (80mm)',
        '5. Imprimir'
      ],
      autoprint: true
    };

    // Enviar respuesta inmediatamente
    res.json(instructions);

    // Intentar abrir el archivo (se abrirá el navegador)
    console.log('📂 Abriendo archivo HTML...');

    exec(`start "" "${htmlFile}"`, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  No se pudo abrir automáticamente. Abrir manualmente:');
        console.log(`   ${htmlFile}`);
        console.log(`   Error:`, error.message);
      } else {
        console.log('✅ Archivo abierto. Usa Ctrl+P para imprimir.');
      }
    });

  } catch (error) {
    console.error('❌ Error al generar ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar ticket',
      details: error.message
    });
  }
});

// Generar HTML del ticket
async function generateTicketHTML(data) {
  const { business, sale } = data;

  let qrDataURL = '';
  if (sale.qrData) {
    try {
      qrDataURL = await QRCode.toDataURL(sale.qrData, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error('Error generando QR:', error);
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket - ${sale.number || ''}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      margin: 0;
      padding: 10mm;
      width: 80mm;
      box-sizing: border-box;
    }

    .center { text-align: center; }
    .left { text-align: left; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .large { font-size: 16px; }
    .small { font-size: 10px; }

    .divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }

    .divider-solid {
      border-top: 2px solid #000;
      margin: 5px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0;
    }

    td {
      padding: 2px;
      font-size: 11px;
    }

    .header {
      margin-bottom: 10px;
    }

    .qr {
      text-align: center;
      margin: 10px 0;
    }

    .qr img {
      width: 150px;
      height: 150px;
    }

    .footer {
      margin-top: 10px;
    }

    @media print {
      body {
        padding: 5mm;
      }
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header center">
    <div class="bold large">${business.name || 'NEGOCIO'}</div>
    ${business.cuit ? `<div class="small">CUIT: ${business.cuit}</div>` : ''}
    ${business.address ? `<div class="small">${business.address}</div>` : ''}
    ${business.phone ? `<div class="small">Tel: ${business.phone}</div>` : ''}
    ${business.email ? `<div class="small">${business.email}</div>` : ''}
  </div>

  <div class="divider-solid"></div>

  <!-- INFO VENTA -->
  <div class="left">
    ${sale.number ? `<div class="bold">Comprobante: ${sale.number}</div>` : ''}
    ${sale.date ? `<div>Fecha: ${sale.date}${sale.time ? ' ' + sale.time : ''}</div>` : ''}
    ${sale.customer ? `<div>Cliente: ${sale.customer}</div>` : ''}
  </div>

  <div class="divider"></div>

  <!-- ITEMS -->
  ${sale.items && sale.items.length > 0 ? `
    <table>
      <thead>
        <tr>
          <td class="left bold">Producto</td>
          <td class="right bold">Cant</td>
          <td class="right bold">P.Unit</td>
          <td class="right bold">Total</td>
        </tr>
      </thead>
      <tbody>
        ${sale.items.map(item => `
          <tr>
            <td class="left">${item.name || item.productName || ''}</td>
            <td class="right">${formatNumber(item.quantity, 2)}</td>
            <td class="right">$${formatNumber(item.unitPrice, 2)}</td>
            <td class="right">$${formatNumber(item.total || item.lineTotal || 0, 2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <div class="divider"></div>

  <!-- TOTALES -->
  <table>
    ${sale.subtotal ? `
      <tr>
        <td class="left">Subtotal:</td>
        <td class="right">$${formatNumber(sale.subtotal, 2)}</td>
      </tr>
    ` : ''}
    ${sale.discountAmount && sale.discountAmount > 0 ? `
      <tr>
        <td class="left">Descuento:</td>
        <td class="right">-$${formatNumber(sale.discountAmount, 2)}</td>
      </tr>
    ` : ''}
    ${sale.taxAmount && sale.taxAmount > 0 ? `
      <tr>
        <td class="left">IVA:</td>
        <td class="right">$${formatNumber(sale.taxAmount, 2)}</td>
      </tr>
    ` : ''}
  </table>

  <div class="divider-solid"></div>

  <table>
    <tr>
      <td class="left bold large">TOTAL:</td>
      <td class="right bold large">$${formatNumber(sale.totalAmount || sale.total || 0, 2)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <!-- FORMAS DE PAGO -->
  ${sale.payments && sale.payments.length > 0 ? `
    <div class="left">
      <div class="bold">FORMAS DE PAGO:</div>
      ${sale.payments.map(payment => `
        <div>${payment.name}: $${formatNumber(payment.amount, 2)}</div>
      `).join('')}
    </div>
    <div class="divider"></div>
  ` : ''}

  <!-- QR CODE -->
  ${qrDataURL ? `
    <div class="qr">
      <img src="${qrDataURL}" alt="QR Code">
    </div>
    <div class="divider"></div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer center small">
    ${sale.caeNumber ? `<div>CAE: ${sale.caeNumber}</div>` : ''}
    ${sale.caeExpiration ? `<div>Vto CAE: ${sale.caeExpiration}</div>` : ''}
    ${sale.notes ? `<div>${sale.notes}</div>` : ''}
    <div class="bold">¡Gracias por su compra!</div>
  </div>
</body>
</html>
  `;
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '0.00';
  return Number(value).toFixed(decimals);
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n🖨️  Axioma Print Manager - Versión Windows');
  console.log('================================================\n');
  console.log(`✅ Print Manager corriendo en http://localhost:${PORT}`);
  console.log(`📋 Ver impresoras: http://localhost:${PORT}/printers`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('\n🎯 Esperando solicitudes de impresión...\n');
});

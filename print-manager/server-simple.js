const express = require('express');
const printer = require('printer');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());

console.log('🖨️  Axioma Print Manager - Versión Simplificada');
console.log('================================================\n');

// Ver impresoras disponibles
app.get('/printers', (req, res) => {
  try {
    const printers = printer.getPrinters();
    console.log('📋 Impresoras disponibles:', printers.length);
    res.json({
      success: true,
      printers: printers,
      default: printers.find(p => p.isDefault)?.name || null
    });
  } catch (error) {
    console.error('❌ Error al listar impresoras:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Imprimir ticket
app.post('/print', async (req, res) => {
  try {
    const { sale, template, printerName } = req.body;

    if (!sale) {
      return res.status(400).json({ error: 'Falta el objeto "sale"' });
    }

    console.log('\n🎫 Nueva solicitud de impresión');
    console.log('   Template:', template || 'simple');
    console.log('   Impresora:', printerName || 'Por defecto');

    // Obtener impresoras
    const printers = printer.getPrinters();

    if (printers.length === 0) {
      console.error('❌ No hay impresoras instaladas');
      return res.status(500).json({
        error: 'No hay impresoras instaladas en el sistema'
      });
    }

    // Seleccionar impresora
    let targetPrinter;
    if (printerName) {
      targetPrinter = printers.find(p => p.name === printerName);
      if (!targetPrinter) {
        console.error('❌ Impresora no encontrada:', printerName);
        return res.status(404).json({
          error: `Impresora "${printerName}" no encontrada`
        });
      }
    } else {
      targetPrinter = printers.find(p => p.isDefault) || printers[0];
    }

    console.log('   Usando:', targetPrinter.name);

    // Generar contenido del ticket
    const ticketContent = await generateTicket(sale, template || 'simple');

    // Imprimir
    printer.printDirect({
      data: ticketContent,
      printer: targetPrinter.name,
      type: 'RAW',
      success: (jobId) => {
        console.log('✅ Ticket impreso correctamente (Job ID:', jobId, ')');
      },
      error: (err) => {
        console.error('❌ Error al imprimir:', err);
      }
    });

    // Responder inmediatamente (no esperar a que termine la impresión)
    res.json({
      success: true,
      printer: targetPrinter.name,
      template: template || 'simple'
    });

  } catch (error) {
    console.error('❌ Error en /print:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Genera el contenido del ticket en formato ESC/POS
 */
async function generateTicket(sale, template) {
  // Comandos ESC/POS
  const ESC = '\x1B';
  const GS = '\x1D';

  let ticket = '';

  // ========== INICIALIZAR ==========
  ticket += ESC + '@'; // Inicializar impresora

  // ========== ENCABEZADO ==========
  ticket += ESC + 'a' + String.fromCharCode(1); // Centrar
  ticket += ESC + 'E' + String.fromCharCode(1); // Negrita ON

  // Nombre del negocio
  ticket += (sale.business?.name || 'NEGOCIO') + '\n';
  ticket += ESC + 'E' + String.fromCharCode(0); // Negrita OFF

  // Datos del negocio
  if (sale.business?.cuit) {
    ticket += 'CUIT: ' + sale.business.cuit + '\n';
  }
  if (sale.business?.address) {
    ticket += sale.business.address + '\n';
  }
  if (sale.business?.phone) {
    ticket += 'Tel: ' + sale.business.phone + '\n';
  }
  if (sale.business?.email) {
    ticket += sale.business.email + '\n';
  }

  ticket += '========================================\n';

  // ========== DATOS DEL COMPROBANTE ==========
  ticket += ESC + 'a' + String.fromCharCode(0); // Alinear izquierda

  if (sale.sale?.voucherName && sale.sale?.voucherLetter) {
    ticket += ESC + 'E' + String.fromCharCode(1); // Negrita ON
    ticket += sale.sale.voucherName + ' ' + sale.sale.voucherLetter + '\n';
    ticket += ESC + 'E' + String.fromCharCode(0); // Negrita OFF
  }

  if (sale.sale?.number) {
    ticket += 'Numero: ' + sale.sale.number + '\n';
  }
  if (sale.sale?.date) {
    ticket += 'Fecha: ' + sale.sale.date + '\n';
  }

  // Cliente
  if (sale.sale?.customer) {
    ticket += 'Cliente: ' + sale.sale.customer + '\n';
  }
  if (sale.sale?.customerCuit) {
    ticket += 'CUIT: ' + sale.sale.customerCuit + '\n';
  }

  ticket += '----------------------------------------\n';

  // ========== ITEMS ==========
  if (sale.sale?.items && sale.sale.items.length > 0) {
    sale.sale.items.forEach(item => {
      // Descripción del producto
      ticket += item.description + '\n';

      // Cantidad x Precio = Total
      const line = '  ' +
        item.quantity + ' x $' +
        Number(item.unitPrice).toFixed(2) +
        ' = $' + Number(item.total).toFixed(2);
      ticket += line + '\n';
    });

    ticket += '----------------------------------------\n';
  }

  // ========== TOTALES ==========
  ticket += ESC + 'a' + String.fromCharCode(2); // Alinear derecha

  if (sale.sale?.subtotal) {
    ticket += 'Subtotal: $' + Number(sale.sale.subtotal).toFixed(2) + '\n';
  }
  if (sale.sale?.discount && sale.sale.discount > 0) {
    ticket += 'Descuento: $' + Number(sale.sale.discount).toFixed(2) + '\n';
  }
  if (sale.sale?.vatAmount && sale.sale.vatAmount > 0) {
    ticket += 'IVA: $' + Number(sale.sale.vatAmount).toFixed(2) + '\n';
  }

  ticket += ESC + 'E' + String.fromCharCode(1); // Negrita ON
  ticket += 'TOTAL: $' + Number(sale.sale?.total || 0).toFixed(2) + '\n';
  ticket += ESC + 'E' + String.fromCharCode(0); // Negrita OFF

  ticket += ESC + 'a' + String.fromCharCode(0); // Alinear izquierda
  ticket += '----------------------------------------\n';

  // ========== FORMAS DE PAGO ==========
  if (sale.sale?.payments && sale.sale.payments.length > 0) {
    ticket += 'PAGOS:\n';
    sale.sale.payments.forEach(payment => {
      ticket += '  ' + payment.method + ': $' + Number(payment.amount).toFixed(2) + '\n';
    });
    ticket += '----------------------------------------\n';
  }

  // ========== DATOS FISCALES (solo en template legal) ==========
  if (template === 'legal' && sale.sale?.caeNumber) {
    ticket += '\n';
    ticket += ESC + 'E' + String.fromCharCode(1); // Negrita ON
    ticket += 'DATOS DE VALIDACION ARCA\n';
    ticket += ESC + 'E' + String.fromCharCode(0); // Negrita OFF

    ticket += 'CAE: ' + sale.sale.caeNumber + '\n';

    if (sale.sale?.caeExpiration) {
      ticket += 'Venc. CAE: ' + sale.sale.caeExpiration + '\n';
    }

    ticket += '----------------------------------------\n';

    // QR Code (si existe)
    if (sale.sale?.qrData) {
      try {
        ticket += ESC + 'a' + String.fromCharCode(1); // Centrar
        ticket += '\nCodigo QR de validacion ARCA\n';
        ticket += '(Escanea para verificar)\n\n';

        // Aquí podrías agregar la impresión del QR como bitmap
        // Por simplicidad, solo mostramos el mensaje

        ticket += ESC + 'a' + String.fromCharCode(0); // Alinear izquierda
      } catch (error) {
        console.error('Error generando QR:', error.message);
      }
    }
  }

  // ========== PIE ==========
  ticket += '\n';
  ticket += ESC + 'a' + String.fromCharCode(1); // Centrar
  ticket += 'Gracias por su compra!\n';
  ticket += '\n\n\n';

  // ========== CORTAR PAPEL ==========
  ticket += GS + 'V' + String.fromCharCode(66) + String.fromCharCode(0);

  return ticket;
}

// Iniciar servidor
const PORT = process.env.PORT || 9100;
app.listen(PORT, () => {
  console.log(`✅ Print Manager corriendo en http://localhost:${PORT}`);
  console.log(`📋 Ver impresoras: http://localhost:${PORT}/printers`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('\n🎯 Esperando solicitudes de impresión...\n');
});

/**
 * Print Manager Server - Versión Windows con Impresión Directa
 *
 * Esta versión intenta imprimir directamente a impresoras térmicas en Windows
 * usando múltiples métodos en orden de preferencia:
 *
 * 1. Escritura directa a impresora compartida (\\.\printerName)
 * 2. Serialport (para impresoras con puerto COM/USB serial)
 * 3. Fallback a HTML (como server-windows.js)
 *
 * IMPORTANTE:
 * - La impresora debe estar instalada en Windows
 * - Para impresión directa, debe ser una impresora térmica ESC/POS
 * - Configura el nombre de la impresora en la variable PRINTER_NAME
 */

const express = require('express')
const https = require('https')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { renderLegalThermalTicket, renderSimpleThermalTicket } = require('./thermal-templates')

const app = express()
const PORT = 9100

// Detectar si está ejecutándose como ejecutable empaquetado (pkg)
const isPackaged = typeof process.pkg !== 'undefined'
const appDir = isPackaged ? path.dirname(process.execPath) : __dirname

// Configuración HTTPS
let httpsOptions = null
try {
  // Buscar certificados en la carpeta certs/ (instalador) o en raíz (desarrollo)
  let certPath = path.join(appDir, 'certs', 'localhost-cert.pem')
  let keyPath = path.join(appDir, 'certs', 'localhost-key.pem')

  // Si no existen en certs/, buscar en raíz (modo desarrollo)
  if (!fs.existsSync(certPath)) {
    certPath = path.join(appDir, 'localhost-cert.pem')
    keyPath = path.join(appDir, 'localhost-key.pem')
  }

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsOptions = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    }
    console.log('✅ Certificados SSL encontrados. Usando HTTPS.')
  } else {
    console.log('⚠️  Certificados SSL no encontrados.')
    if (isPackaged) {
      console.log('   Los certificados deberían estar en: ' + path.join(appDir, 'certs'))
      console.log('   Ejecuta setup-certificates.bat para generarlos.')
    } else {
      console.log('   Ejecuta generate-cert.bat para crear certificados HTTPS.')
    }
    console.log('   Continuando sin HTTPS (HTTP solamente)...')
  }
} catch (error) {
  console.log('⚠️  Error cargando certificados SSL:', error.message)
  console.log('   Continuando sin HTTPS (HTTP solamente)...')
}

// ⚙️ CONFIGURACIÓN: Nombre de la impresora térmica en Windows
// Puedes ver el nombre en "Panel de Control > Dispositivos e impresoras"
// Ejemplos: "POS-80", "TM-T20", "Gprinter", "EPSON TM-T20II"
const PRINTER_NAME = process.env.PRINTER_NAME || 'POS-80'

// Permitir CORS desde cualquier origen
app.use(cors())
app.use(express.json())

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Print Manager running on Windows',
    version: '2.0-thermal',
    printerName: PRINTER_NAME,
    timestamp: new Date().toISOString()
  })
})

/**
 * Listar impresoras instaladas en Windows
 */
app.get('/printers', (req, res) => {
  // Usar PowerShell para listar impresoras
  exec('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName | ConvertTo-Json"', (error, stdout, stderr) => {
    if (error) {
      return res.json({
        printers: [],
        error: 'No se pudieron listar impresoras. Usa PowerShell como administrador.',
        configured: PRINTER_NAME
      })
    }

    try {
      const printers = JSON.parse(stdout)
      res.json({
        printers: Array.isArray(printers) ? printers : [printers],
        configured: PRINTER_NAME
      })
    } catch (e) {
      res.json({
        printers: [],
        configured: PRINTER_NAME
      })
    }
  })
})

/**
 * Método 1: Imprimir directamente escribiendo a la impresora
 * En Windows, las impresoras compartidas se acceden como \\.\printerName
 */
async function printDirectToWindowsPrinter(escposData, printerName) {
  return new Promise((resolve, reject) => {
    const printerPath = `\\\\.\\${printerName}`

    try {
      // Escribir los comandos ESC/POS directamente al dispositivo
      fs.writeFile(printerPath, escposData, 'binary', (err) => {
        if (err) {
          reject(new Error(`Error escribiendo a impresora: ${err.message}`))
        } else {
          resolve({ method: 'direct', message: 'Impreso directamente en impresora' })
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Método 2: Usar comando net use (para impresoras de red)
 */
async function printViaNetCommand(escposData, printerName) {
  return new Promise((resolve, reject) => {
    // Guardar datos en archivo temporal
    const tempFile = path.join(appDir, `temp-ticket-${Date.now()}.txt`)

    fs.writeFileSync(tempFile, escposData, 'binary')

    // Enviar archivo a impresora usando comando copy
    const command = `copy /B "${tempFile}" "\\\\.\\${printerName}"`

    exec(command, (error, stdout, stderr) => {
      // Limpiar archivo temporal
      try { fs.unlinkSync(tempFile) } catch (e) {}

      if (error) {
        reject(new Error(`Error usando comando copy: ${error.message}`))
      } else {
        resolve({ method: 'copy', message: 'Impreso usando comando copy' })
      }
    })
  })
}

/**
 * Método 3: Fallback a HTML (como server-windows.js original)
 */
async function printViaHTML(data) {
  return new Promise((resolve, reject) => {
    const { business, sale, template = 'simple' } = data

    // Generar HTML simple para el ticket
    const html = generateHTML(business, sale, template)

    // Guardar HTML
    const timestamp = Date.now()
    const htmlFile = path.join(appDir, `tickets/ticket-${timestamp}.html`)

    // Crear directorio si no existe
    const ticketsDir = path.join(appDir, 'tickets')
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true })
    }

    fs.writeFileSync(htmlFile, html, 'utf-8')

    // Abrir HTML en navegador
    const command = `start "" "${htmlFile}"`

    exec(command, { timeout: 5000 }, (error) => {
      if (error) {
        console.log('⚠️  No se pudo abrir automáticamente.')
      } else {
        console.log('✅ Archivo abierto. Usa Ctrl+P para imprimir.')
      }
    })

    resolve({
      method: 'html',
      message: 'Archivo HTML generado. Presiona Ctrl+P para imprimir.',
      file: htmlFile
    })
  })
}

/**
 * Generar HTML simple para ticket
 */
function generateHTML(business, sale, template) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket - ${sale.number}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: 80mm;
      padding: 5mm;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 16px; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 5px 0; }
    table td { padding: 2px 0; }
    .right { text-align: right; }
    @media print {
      body { width: 80mm; }
    }
  </style>
  <script>
    // Auto-imprimir cuando carga la página
    window.onload = function() {
      window.print();
      // Cerrar la ventana después de imprimir (opcional)
      setTimeout(function() {
        window.close();
      }, 500);
    };
  </script>
</head>
<body>
  <div class="center bold large">${business.name || 'MI NEGOCIO'}</div>
  ${business.cuit ? `<div class="center">CUIT: ${business.cuit}</div>` : ''}
  ${business.address ? `<div class="center">${business.address}</div>` : ''}

  <div class="divider"></div>

  <div class="center bold">${sale.voucherName || 'TICKET'} ${sale.voucherLetter || ''}</div>
  <div class="center">${sale.number || ''}</div>
  <div class="center">${sale.date || new Date().toLocaleDateString('es-AR')}</div>

  <div class="divider"></div>

  <div>Cliente: ${sale.customer || 'Consumidor Final'}</div>

  <div class="divider"></div>

  <table>
    <tbody>
      ${(sale.items || []).map(item => `
        <tr>
          <td colspan="2">${item.name}</td>
        </tr>
        <tr>
          <td>${item.quantity} x $${Number(item.unitPrice).toFixed(2)}</td>
          <td class="right">$${Number(item.total).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="divider"></div>

  <table>
    <tr>
      <td>Subtotal:</td>
      <td class="right">$${Number(sale.subtotal || 0).toFixed(2)}</td>
    </tr>
    ${sale.discountAmount && Number(sale.discountAmount) > 0 ? `
    <tr>
      <td>Descuento:</td>
      <td class="right">-$${Number(sale.discountAmount).toFixed(2)}</td>
    </tr>` : ''}
    ${sale.taxAmount && Number(sale.taxAmount) > 0 ? `
    <tr>
      <td>IVA:</td>
      <td class="right">$${Number(sale.taxAmount).toFixed(2)}</td>
    </tr>` : ''}
    <tr class="bold large">
      <td>TOTAL:</td>
      <td class="right">$${Number(sale.totalAmount || 0).toFixed(2)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  ${(sale.payments || []).length > 0 ? `
    <div class="bold">FORMAS DE PAGO:</div>
    ${sale.payments.map(p => `
      <div>${p.name}: $${Number(p.amount).toFixed(2)}</div>
    `).join('')}
    <div class="divider"></div>
  ` : ''}

  ${sale.caeNumber ? `
    <div class="center">CAE: ${sale.caeNumber}</div>
    <div class="center">Vto: ${sale.caeExpiration || ''}</div>
    <div class="divider"></div>
  ` : ''}

  <div class="center">¡Gracias por su compra!</div>
</body>
</html>`
}

/**
 * Endpoint principal de impresión
 */
app.post('/print', async (req, res) => {
  try {
    const { data, template = 'simple' } = req.body

    if (!data) {
      return res.status(400).json({ error: 'Faltan datos para imprimir' })
    }

    const { business, sale } = data

    console.log(`📄 Solicitud de impresión recibida (template: ${template})`)

    // Intentar generar comandos ESC/POS
    let escposData = null
    try {
      if (template === 'legal') {
        escposData = await renderLegalThermalTicket(sale, business)
      } else {
        escposData = await renderSimpleThermalTicket(sale, business)
      }

      const buffer = Buffer.from(escposData, 'binary')

      // Intentar método 1: Escritura directa
      try {
        console.log(`🖨️  Intentando imprimir directamente en "${PRINTER_NAME}"...`)
        const result = await printDirectToWindowsPrinter(buffer, PRINTER_NAME)
        console.log(`✅ ${result.message}`)
        return res.json({
          success: true,
          method: result.method,
          message: result.message,
          printer: PRINTER_NAME
        })
      } catch (err1) {
        console.log(`⚠️  Método directo falló: ${err1.message}`)

        // Intentar método 2: Comando copy
        try {
          console.log(`🖨️  Intentando con comando copy...`)
          const result = await printViaNetCommand(buffer, PRINTER_NAME)
          console.log(`✅ ${result.message}`)
          return res.json({
            success: true,
            method: result.method,
            message: result.message,
            printer: PRINTER_NAME
          })
        } catch (err2) {
          console.log(`⚠️  Comando copy falló: ${err2.message}`)
        }
      }
    } catch (escposError) {
      console.log(`⚠️  Error generando ESC/POS: ${escposError.message}`)
    }

    // Fallback: Usar HTML
    console.log(`🌐 Usando método HTML como fallback...`)
    const result = await printViaHTML(data)
    console.log(`✅ ${result.message}`)

    return res.json({
      success: true,
      method: result.method,
      message: result.message,
      file: result.file,
      instructions: [
        '1. Se abrirá una ventana del navegador con el ticket',
        '2. Presiona Ctrl+P para abrir el diálogo de impresión',
        `3. Selecciona la impresora "${PRINTER_NAME}"`,
        '4. Ajusta los márgenes a 0 si es necesario',
        '5. Presiona Imprimir'
      ]
    })

  } catch (error) {
    console.error('❌ Error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Iniciar servidor (HTTPS si hay certificados, HTTP si no)
const startServer = () => {
  console.log('')
  console.log('🖨️  Print Manager Server - Versión Windows Térmica')
  console.log('='.repeat(50))

  if (httpsOptions) {
    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`✅ Servidor HTTPS corriendo en https://localhost:${PORT}`)
      console.log(`🔒 Certificado SSL: ACTIVO`)
      console.log(`🖨️  Impresora configurada: "${PRINTER_NAME}"`)
      console.log('')
      console.log('⚠️  IMPORTANTE: Primera vez')
      console.log('   El navegador mostrará advertencia de seguridad.')
      console.log('   Debes aceptar el certificado autofirmado para continuar.')
      console.log('')
      console.log('📝 Para cambiar impresora: set PRINTER_NAME=NombreDeTuImpresora')
      console.log('')
      console.log('💡 Métodos de impresión (en orden de intento):')
      console.log('   1. Escritura directa (ESC/POS a impresora)')
      console.log('   2. Comando copy (Windows)')
      console.log('   3. HTML fallback (Ctrl+P manual)')
      console.log('='.repeat(50))
      console.log('')
    })
  } else {
    app.listen(PORT, () => {
      console.log(`✅ Servidor HTTP corriendo en http://localhost:${PORT}`)
      console.log(`⚠️  SSL: NO ACTIVO (ejecuta generate-cert.bat)`)
      console.log(`🖨️  Impresora configurada: "${PRINTER_NAME}"`)
      console.log('')
      console.log('📝 Para cambiar impresora: set PRINTER_NAME=NombreDeTuImpresora')
      console.log('')
      console.log('💡 Métodos de impresión (en orden de intento):')
      console.log('   1. Escritura directa (ESC/POS a impresora)')
      console.log('   2. Comando copy (Windows)')
      console.log('   3. HTML fallback (Ctrl+P manual)')
      console.log('='.repeat(50))
      console.log('')
    })
  }
}

startServer()

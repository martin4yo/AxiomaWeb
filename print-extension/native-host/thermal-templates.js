const QRCode = require('qrcode')
const { PNG } = require('pngjs')

// Comandos ESC/POS
const ESC = '\x1B'
const GS = '\x1D'

const commands = {
  init: ESC + '@',
  alignCenter: ESC + 'a' + '\x01',
  alignLeft: ESC + 'a' + '\x00',
  alignRight: ESC + 'a' + '\x02',
  bold: {
    on: ESC + 'E' + '\x01',
    off: ESC + 'E' + '\x00'
  },
  size: {
    normal: GS + '!' + '\x00',
    double: GS + '!' + '\x11',
    doubleHeight: GS + '!' + '\x01',
    doubleWidth: GS + '!' + '\x10'
  },
  cut: GS + 'V' + '\x00',
  newLine: '\n',
  feed: (lines = 1) => ESC + 'd' + String.fromCharCode(lines),
  // Comandos para imágenes (QR)
  selectBitImageMode: (mode, width) => ESC + '*' + String.fromCharCode(mode) + String.fromCharCode(width % 256) + String.fromCharCode(Math.floor(width / 256))
}

/**
 * Genera el contenido del QR de ARCA (ex-AFIP)
 * Formato: JSON en base64
 * URL: https://www.afip.gob.ar/fe/qr/?p={base64_encoded_json}
 *
 * IMPORTANTE: El importe se multiplica por 100 y se envía sin decimales
 */
function generateAfipQRData(data) {
  // Limpiar CUIT del emisor (solo números)
  const cuit = parseInt((data.cuit || '').replace(/\D/g, ''))

  // Formatear fecha en YYYY-MM-DD
  const date = new Date(data.documentDate)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const fecha = `${year}-${month}-${day}`

  // Importe multiplicado por 100 y sin decimales
  const importe = Math.round((data.amount || 0) * 100)

  // Limpiar documento del receptor (solo números)
  const customerDoc = (data.customerDocNumber || '').replace(/\D/g, '')
  const nroDocRec = customerDoc ? parseInt(customerDoc) : 0

  // Construir objeto JSON según especificación de ARCA
  const qrObject = {
    ver: 1,                                 // Versión del formato
    fecha: fecha,                           // Fecha del comprobante YYYY-MM-DD
    cuit: cuit,                             // CUIT del emisor (número)
    ptoVta: data.salesPointNumber || 1,     // Punto de venta (número)
    tipoCmp: data.voucherTypeCode || 1,     // Tipo de comprobante (número)
    nroCmp: data.voucherNumber || 1,        // Número de comprobante (número)
    importe: importe,                       // Importe * 100 sin decimales
    moneda: 'PES',                          // Moneda
    ctz: 1,                                 // Cotización
    tipoDocRec: data.customerDocType || 99, // Tipo doc receptor
    nroDocRec: nroDocRec,                   // Nro doc receptor (número)
    tipoCodAut: 'E',                        // Tipo código autorización (E = CAE)
    codAut: parseInt(data.cae || '0')       // Código de autorización (número)
  }

  // Convertir a JSON
  const jsonString = JSON.stringify(qrObject)

  // Codificar en base64
  const base64 = Buffer.from(jsonString, 'utf-8').toString('base64')

  // Retornar URL del QR de ARCA
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`
}

/**
 * Convierte texto a ancho de caracteres específico, cortando o rellenando
 */
function fitText(text, width, align = 'left') {
  text = text || ''
  if (text.length > width) {
    return text.substring(0, width)
  }
  if (text.length < width) {
    const padding = ' '.repeat(width - text.length)
    if (align === 'right') {
      return padding + text
    } else if (align === 'center') {
      const leftPad = Math.floor(padding.length / 2)
      const rightPad = padding.length - leftPad
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad)
    }
    return text + padding
  }
  return text
}

/**
 * Convierte una imagen PNG a formato bitmap ESC/POS
 * Retorna comandos ESC/POS para imprimir la imagen
 */
async function convertImageToBitmap(pngBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const png = new PNG()

      png.parse(pngBuffer, (err, data) => {
        if (err) {
          return reject(err)
        }

        const width = data.width
        const height = data.height

        // Convertir a blanco y negro (1 bit por píxel)
        const pixels = []
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (width * y + x) << 2
            // Obtener el valor de luminosidad (promedio RGB)
            const r = data.data[idx]
            const g = data.data[idx + 1]
            const b = data.data[idx + 2]
            const brightness = (r + g + b) / 3
            // Si es oscuro, es un píxel negro (1), si es claro es blanco (0)
            pixels.push(brightness < 128 ? 1 : 0)
          }
        }

        // Redimensionar ancho a múltiplo de 8
        const widthBytes = Math.ceil(width / 8)
        const adjustedWidth = widthBytes * 8

        // Convertir píxeles a bytes (8 píxeles por byte)
        const imageBytes = []
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < widthBytes; x++) {
            let byte = 0
            for (let bit = 0; bit < 8; bit++) {
              const pixelX = x * 8 + bit
              if (pixelX < width) {
                const pixelIndex = y * width + pixelX
                // Invertir bit (ESC/POS usa 1 para imprimir, 0 para blanco)
                if (pixels[pixelIndex] === 1) {
                  byte |= (1 << (7 - bit))
                }
              }
            }
            imageBytes.push(byte)
          }
        }

        // Construir comando ESC/POS: GS v 0 mode xL xH yL yH [data]
        // mode: 0 = normal, 1 = double width, 2 = double height, 3 = double both
        const mode = 0
        const xL = widthBytes & 0xFF
        const xH = (widthBytes >> 8) & 0xFF
        const yL = height & 0xFF
        const yH = (height >> 8) & 0xFF

        // Construir comando
        let command = GS + 'v' + String.fromCharCode(48) + String.fromCharCode(mode)
        command += String.fromCharCode(xL) + String.fromCharCode(xH)
        command += String.fromCharCode(yL) + String.fromCharCode(yH)

        // Agregar bytes de imagen
        for (let i = 0; i < imageBytes.length; i++) {
          command += String.fromCharCode(imageBytes[i])
        }

        resolve(command)
      })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * PLANTILLA 1: TICKET TÉRMICO LEGAL (80mm)
 * Con todos los datos fiscales, CAE y QR de ARCA
 */
async function renderLegalThermalTicket(sale, business) {
  let ticket = ''

  // Inicializar
  ticket += commands.init

  // ========== HEADER - DATOS DEL NEGOCIO ==========
  ticket += commands.alignCenter
  ticket += commands.bold.on
  ticket += commands.size.double
  ticket += (business.name || 'MI NEGOCIO') + commands.newLine
  ticket += commands.size.normal
  ticket += commands.bold.off

  ticket += commands.size.normal
  if (business.cuit) {
    ticket += `CUIT: ${business.cuit}` + commands.newLine
  }

  ticket += `Ingresos Brutos: EXENTO` + commands.newLine

  if (business.address) {
    ticket += business.address + commands.newLine
  }

  if (business.phone) {
    ticket += `Tel: ${business.phone}` + commands.newLine
  }

  if (business.email) {
    ticket += `Email: ${business.email}` + commands.newLine
  }

  ticket += '----------------------------------------' + commands.newLine
  ticket += commands.alignLeft

  // ========== TIPO DE COMPROBANTE ==========
  ticket += commands.alignCenter
  ticket += commands.bold.on
  ticket += commands.size.doubleHeight

  const voucherLetter = sale.voucherLetter || ''
  const voucherName = sale.voucherName || 'FACTURA'

  ticket += `${voucherName} ${voucherLetter}` + commands.newLine
  ticket += commands.size.normal
  ticket += commands.bold.off

  if (sale.afipCode) {
    ticket += `Cod. ARCA: ${sale.afipCode}` + commands.newLine
  }

  ticket += commands.alignLeft
  ticket += '----------------------------------------' + commands.newLine

  // ========== INFO DEL COMPROBANTE ==========
  ticket += commands.bold.on
  ticket += `Numero: ${sale.number || 'N/A'}` + commands.newLine
  ticket += commands.bold.off
  ticket += `Fecha: ${sale.date || new Date().toLocaleDateString('es-AR')}` + commands.newLine

  ticket += '----------------------------------------' + commands.newLine

  // ========== DATOS DEL RECEPTOR ==========
  ticket += commands.bold.on
  ticket += 'DATOS DEL RECEPTOR' + commands.newLine
  ticket += commands.bold.off

  if (sale.customer) {
    ticket += `Cliente: ${sale.customer}` + commands.newLine
  }

  if (sale.customerCuit) {
    ticket += `CUIT: ${sale.customerCuit}` + commands.newLine
  }

  if (sale.customerVatCondition) {
    ticket += `Cond. IVA: ${sale.customerVatCondition}` + commands.newLine
  }

  if (sale.customerAddress) {
    ticket += `Domicilio: ${sale.customerAddress}` + commands.newLine
  }

  ticket += '----------------------------------------' + commands.newLine

  // ========== ITEMS ==========
  if (sale.items && sale.items.length > 0) {
    // Header de items (sin encabezado de columnas, más limpio)
    ticket += commands.bold.on
    ticket += 'PRODUCTOS' + commands.newLine
    ticket += commands.bold.off
    ticket += '----------------------------------------' + commands.newLine

    sale.items.forEach((item) => {
      const name = item.name || item.productName || 'Producto'
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const total = item.total || (qty * price)

      // Nombre del producto
      ticket += name + commands.newLine

      // Formato para 48 caracteres (ancho típico de 80mm)
      // Estructura: "   CANT x       PRECIO =             TOTAL"
      const qtyStr = qty.toString()
      const priceStr = `$${price.toFixed(2)}`
      const totalStr = `$${total.toFixed(2)}`

      // Columnas con anchos fijos
      const col1 = fitText(qtyStr, 7, 'right')      // Cantidad (7 chars)
      const col2 = fitText(priceStr, 15, 'right')   // Precio (15 chars)
      const col3 = fitText(totalStr, 15, 'right')   // Total (15 chars)

      // Construir línea: 7 + 3 + 15 + 3 + 15 = 43 caracteres
      ticket += col1 + ' x ' + col2 + ' = ' + col3 + commands.newLine

      // Mostrar IVA si discrimina
      if (sale.discriminatesVat && item.taxAmount && item.taxAmount > 0) {
        const ivaLine = fitText(`IVA 21%: $${item.taxAmount.toFixed(2)}`, 48, 'right')
        ticket += ivaLine + commands.newLine
      }
    })

    ticket += '----------------------------------------' + commands.newLine
  }

  // ========== TOTALES ==========
  ticket += commands.alignRight

  if (sale.subtotal) {
    ticket += `Subtotal: $${sale.subtotal.toFixed(2)}` + commands.newLine
  }

  if (sale.discountAmount && sale.discountAmount > 0) {
    ticket += `Descuento: -$${sale.discountAmount.toFixed(2)}` + commands.newLine
  }

  if (sale.discriminatesVat && sale.taxAmount && sale.taxAmount > 0) {
    ticket += `IVA 21%: $${sale.taxAmount.toFixed(2)}` + commands.newLine
  }

  ticket += commands.bold.on
  ticket += commands.size.double
  ticket += `TOTAL: $${sale.totalAmount.toFixed(2)}` + commands.newLine
  ticket += commands.size.normal
  ticket += commands.bold.off

  ticket += commands.alignLeft
  ticket += '----------------------------------------' + commands.newLine

  // ========== FORMAS DE PAGO ==========
  if (sale.payments && sale.payments.length > 0) {
    ticket += commands.bold.on
    ticket += 'FORMAS DE PAGO:' + commands.newLine
    ticket += commands.bold.off

    sale.payments.forEach((payment) => {
      ticket += `  ${payment.name}: $${payment.amount.toFixed(2)}` + commands.newLine
      if (payment.reference) {
        ticket += `    Ref: ${payment.reference}` + commands.newLine
      }
    })

    ticket += '----------------------------------------' + commands.newLine
  }

  // ========== DATOS DE ARCA (CAE) ==========
  if (sale.caeNumber) {
    ticket += commands.bold.on
    ticket += 'DATOS DE VALIDACION ARCA' + commands.newLine
    ticket += commands.bold.off

    ticket += `CAE: ${sale.caeNumber}` + commands.newLine

    if (sale.caeExpiration) {
      ticket += `Vto CAE: ${sale.caeExpiration}` + commands.newLine
    }

    ticket += '----------------------------------------' + commands.newLine

    // ========== QR CODE ==========
    // Generar QR si hay CAE y CUIT del negocio
    if (sale.caeNumber && business.cuit) {
      try {
        // Determinar tipo de documento del cliente
        let customerDocType = 99 // Sin identificar por defecto
        let customerDocNumber = '0' // Sin documento por defecto

        if (sale.customerCuit) {
          customerDocNumber = sale.customerCuit
          const cleanDoc = sale.customerCuit.replace(/\D/g, '')
          if (cleanDoc.length === 11) {
            customerDocType = 80 // CUIT
          } else if (cleanDoc.length >= 7 && cleanDoc.length <= 8) {
            customerDocType = 96 // DNI
          }
        }

        const qrData = generateAfipQRData({
          cuit: business.cuit,
          voucherTypeCode: sale.afipCode || 1,
          salesPointNumber: sale.salesPointNumber || 1,
          voucherNumber: parseInt((sale.number || '').split('-')[1] || '1'),
          amount: sale.totalAmount,
          documentDate: sale.date || new Date(),
          customerDocType: customerDocType,
          customerDocNumber: customerDocNumber,
          cae: sale.caeNumber
        })

        // Generar QR como imagen y convertir a bitmap ESC/POS
        ticket += commands.alignCenter
        ticket += 'Codigo QR de validacion ARCA' + commands.newLine
        ticket += '(Escanea para verificar)' + commands.newLine
        ticket += commands.newLine

        // Generar QR como imagen PNG en buffer
        const qrBuffer = await QRCode.toBuffer(qrData, {
          type: 'png',
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'M'
        })

        // Convertir imagen a bitmap ESC/POS
        const qrBitmap = await convertImageToBitmap(qrBuffer)
        ticket += qrBitmap

        ticket += commands.newLine
        ticket += '----------------------------------------' + commands.newLine
      } catch (error) {
        console.error('Error generando QR:', error)
      }
    }
  }

  // ========== FOOTER ==========
  ticket += commands.alignCenter
  if (sale.notes) {
    ticket += commands.newLine
    ticket += 'NOTAS:' + commands.newLine
    ticket += sale.notes + commands.newLine
    ticket += commands.newLine
  }

  ticket += 'Gracias por su compra!' + commands.newLine
  ticket += commands.feed(3)

  // Cortar papel
  ticket += commands.cut

  return ticket
}

/**
 * PLANTILLA 2: TICKET TÉRMICO SIMPLE (80mm)
 * Sin datos fiscales, para presupuestos o tickets informales
 */
async function renderSimpleThermalTicket(sale, business) {
  let ticket = ''

  // Inicializar
  ticket += commands.init

  // ========== HEADER - DATOS DEL NEGOCIO ==========
  ticket += commands.alignCenter
  ticket += commands.bold.on
  ticket += commands.size.double
  ticket += (business.name || 'MI NEGOCIO') + commands.newLine
  ticket += commands.size.normal
  ticket += commands.bold.off

  if (business.address) {
    ticket += business.address + commands.newLine
  }

  if (business.phone) {
    ticket += `Tel: ${business.phone}` + commands.newLine
  }

  if (business.email) {
    ticket += `Email: ${business.email}` + commands.newLine
  }

  ticket += '=======================================' + commands.newLine
  ticket += commands.alignLeft

  // ========== INFO DEL COMPROBANTE ==========
  ticket += commands.alignCenter
  ticket += commands.bold.on
  ticket += commands.size.doubleHeight
  ticket += 'PRESUPUESTO' + commands.newLine
  ticket += commands.size.normal
  ticket += commands.bold.off

  ticket += commands.alignLeft
  ticket += `Numero: ${sale.number || 'N/A'}` + commands.newLine
  ticket += `Fecha: ${sale.date || new Date().toLocaleDateString('es-AR')}` + commands.newLine

  if (sale.customer) {
    ticket += `Cliente: ${sale.customer}` + commands.newLine
  }

  ticket += '=======================================' + commands.newLine

  // ========== ITEMS ==========
  if (sale.items && sale.items.length > 0) {
    // Header de items (sin encabezado de columnas, más limpio)
    ticket += commands.bold.on
    ticket += 'PRODUCTOS' + commands.newLine
    ticket += commands.bold.off
    ticket += '=======================================' + commands.newLine

    sale.items.forEach((item) => {
      const name = item.name || item.productName || 'Producto'
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const total = item.total || (qty * price)

      // Nombre del producto
      ticket += name + commands.newLine

      // Formato para 48 caracteres (ancho típico de 80mm)
      // Estructura: "   CANT x       PRECIO =             TOTAL"
      const qtyStr = qty.toString()
      const priceStr = `$${price.toFixed(2)}`
      const totalStr = `$${total.toFixed(2)}`

      // Columnas con anchos fijos
      const col1 = fitText(qtyStr, 7, 'right')      // Cantidad (7 chars)
      const col2 = fitText(priceStr, 15, 'right')   // Precio (15 chars)
      const col3 = fitText(totalStr, 15, 'right')   // Total (15 chars)

      // Construir línea: 7 + 3 + 15 + 3 + 15 = 43 caracteres
      ticket += col1 + ' x ' + col2 + ' = ' + col3 + commands.newLine
    })

    ticket += '=======================================' + commands.newLine
  }

  // ========== TOTALES ==========
  ticket += commands.alignRight

  if (sale.subtotal && sale.discountAmount && sale.discountAmount > 0) {
    ticket += `Subtotal: $${sale.subtotal.toFixed(2)}` + commands.newLine
    ticket += `Descuento: -$${sale.discountAmount.toFixed(2)}` + commands.newLine
  }

  ticket += commands.bold.on
  ticket += commands.size.double
  ticket += `TOTAL: $${sale.totalAmount.toFixed(2)}` + commands.newLine
  ticket += commands.size.normal
  ticket += commands.bold.off

  ticket += commands.alignLeft
  ticket += '=======================================' + commands.newLine

  // ========== FORMAS DE PAGO ==========
  if (sale.payments && sale.payments.length > 0) {
    ticket += commands.bold.on
    ticket += 'Formas de Pago:' + commands.newLine
    ticket += commands.bold.off

    sale.payments.forEach((payment) => {
      ticket += `  ${payment.name}: $${payment.amount.toFixed(2)}` + commands.newLine
    })

    ticket += '=======================================' + commands.newLine
  }

  // ========== FOOTER ==========
  ticket += commands.alignCenter

  if (sale.notes) {
    ticket += commands.newLine
    ticket += 'NOTAS:' + commands.newLine
    ticket += sale.notes + commands.newLine
    ticket += commands.newLine
  }

  ticket += 'Presupuesto valido por 30 dias' + commands.newLine
  ticket += commands.newLine
  ticket += 'Gracias por su consulta!' + commands.newLine
  ticket += commands.feed(3)

  // Cortar papel
  ticket += commands.cut

  return ticket
}

module.exports = {
  renderLegalThermalTicket,
  renderSimpleThermalTicket,
  generateAfipQRData
}

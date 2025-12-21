import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { Prisma } from '@prisma/client'
import { AfipQRService } from './afipQRService.js'
import fs from 'fs'

// Type para venta con todas las relaciones necesarias
export type SaleWithRelations = Prisma.SaleGetPayload<{
  include: {
    customer: true
    items: true
    payments: {
      include: {
        paymentMethod: true
      }
    }
    tenant: true
    voucherConfiguration: {
      include: {
        voucherType: true
        salesPoint: true
      }
    }
  }
}>

// Type para presupuesto con todas las relaciones necesarias
export type QuoteWithRelations = Prisma.QuoteGetPayload<{
  include: {
    customer: true
    items: true
    tenant: true
    creator: {
      select: {
        firstName: true
        lastName: true
        email: true
      }
    }
  }
}>

export type PDFTemplateType = 'legal' | 'quote'

/**
 * Servicio para renderizar diferentes tipos de facturas en PDF
 * - legal: Factura legal con todos los datos fiscales (CUIT, CAE, QR, etc.)
 * - quote: Presupuesto sin datos fiscales
 */
export class PDFTemplateService {
  /**
   * Formatea un número con separadores de miles (locale es-AR)
   */
  private formatNumber(value: number | string, decimals: number = 2): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0,00'

    return num.toLocaleString('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }

  /**
   * Formatea un valor como moneda con separadores de miles
   */
  private formatCurrency(value: number | string): string {
    return `$${this.formatNumber(value, 2)}`
  }
  /**
   * Genera un PDF según el tipo de plantilla
   */
  async generatePDF(sale: SaleWithRelations, template: PDFTemplateType = 'legal'): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        })

        const buffers: Buffer[] = []

        doc.on('data', (chunk) => buffers.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', reject)

        // Renderizar según tipo de plantilla - ESPERAR a que termine
        if (template === 'legal') {
          await this.renderLegalInvoice(doc, sale)
        } else if (template === 'quote') {
          await this.renderQuoteInvoice(doc, sale)
        }

        // Cerrar el documento solo DESPUÉS de que termine de renderizar
        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * PLANTILLA 1: FACTURA LEGAL
   * Diseño estándar de ARCA con todos los datos fiscales
   */
  private async renderLegalInvoice(doc: PDFKit.PDFDocument, sale: SaleWithRelations) {
    const businessName = sale.tenant.businessName || sale.tenant.name
    const cuit = sale.tenant.cuit || 'Sin CUIT'
    const address = sale.tenant.address || ''
    const phone = sale.tenant.phone || ''
    const email = sale.tenant.email || ''

    const voucherType = sale.voucherConfiguration?.voucherType
    const voucherLetter = voucherType?.letter || ''
    const voucherName = voucherType?.name || 'FACTURA'
    const discriminatesVat = voucherType?.discriminatesVat || false

    const customerName = sale.customerName || sale.customer?.name || 'Consumidor Final'
    const customerCuit = sale.customer?.cuit || sale.customer?.taxId || ''
    const customerAddress = sale.customer?.addressLine1 || ''
    const customerVatCondition = sale.customer?.ivaCondition || 'CF'
    const saleDate = new Date(sale.saleDate).toLocaleDateString('es-AR')

    const hasCAE = Boolean(sale.afipCae || sale.cae)
    const cae = sale.afipCae || sale.cae || ''
    const caeExpiration = sale.caeExpiration || sale.afipCaeExpiry
    const caeExpirationDate = caeExpiration
      ? new Date(caeExpiration).toLocaleDateString('es-AR')
      : ''

    let currentY = doc.y

    // ==================== HEADER ====================
    // Línea superior
    doc.rect(50, currentY, 495, 0.5).fill('#000')
    currentY += 10

    // Datos del emisor (izquierda) + Letra (centro) + Datos del comprobante (derecha)
    const headerTop = currentY

    // IZQUIERDA: Datos del negocio (con logo si existe)
    const logoUrl = sale.tenant.logo

    if (logoUrl) {
      try {
        // Intentar cargar el logo
        doc.image(logoUrl, 50, currentY, { width: 80, height: 80, fit: [80, 80] })
        currentY += 85
      } catch (error) {
        console.error('[PDF] Error cargando logo:', error)
        // Si falla, mostrar nombre de empresa
        doc.fontSize(14).font('Helvetica-Bold').text(businessName, 50, currentY, { width: 200 })
        currentY += 20
      }
    } else {
      // Sin logo, mostrar nombre de empresa
      doc.fontSize(14).font('Helvetica-Bold').text(businessName, 50, currentY, { width: 200 })
      currentY += 20
    }

    doc.fontSize(8).font('Helvetica')

    if (address) {
      doc.text(`Domicilio: ${address}`, 50, currentY, { width: 200 })
      currentY += 12
    }

    if (phone) {
      doc.text(`Tel: ${phone}`, 50, currentY)
      currentY += 12
    }

    if (email) {
      doc.text(`Email: ${email}`, 50, currentY)
      currentY += 12
    }

    // CENTRO: Letra del comprobante (recuadro)
    const letterBoxX = 265
    const letterBoxY = headerTop + 10
    const letterBoxSize = 60

    // Dibujar recuadro de la letra
    doc.rect(letterBoxX, letterBoxY, letterBoxSize, letterBoxSize).stroke()
    doc.fontSize(36).font('Helvetica-Bold')
    doc.text(voucherLetter, letterBoxX, letterBoxY + 12, {
      width: letterBoxSize,
      align: 'center'
    })

    // Código de comprobante
    doc.fontSize(7).font('Helvetica')
    doc.text(`Cod. ARCA ${voucherType?.afipCode || ''}`, letterBoxX, letterBoxY + letterBoxSize - 10, {
      width: letterBoxSize,
      align: 'center'
    })

    // DERECHA: Tipo y número de comprobante
    currentY = headerTop
    doc.fontSize(12).font('Helvetica-Bold')
    doc.text(voucherName, 345, currentY, { width: 200, align: 'right' })
    currentY += 15

    doc.fontSize(9).font('Helvetica')
    doc.text(`Nº ${sale.fullVoucherNumber || sale.saleNumber}`, 345, currentY, { width: 200, align: 'right' })
    currentY += 15
    doc.text(`Fecha: ${saleDate}`, 345, currentY, { width: 200, align: 'right' })
    currentY += 15
    doc.text(`CUIT: ${cuit}`, 345, currentY, { width: 200, align: 'right' })
    currentY += 12
    doc.text(`Ingresos Brutos: EXENTO`, 345, currentY, { width: 200, align: 'right' })
    currentY += 12
    doc.text(`Inicio de Actividades: 01/01/2024`, 345, currentY, { width: 200, align: 'right' })

    // Línea divisoria
    currentY = Math.max(currentY + 25, headerTop + letterBoxSize + 25)
    doc.rect(50, currentY, 495, 0.5).fill('#000')
    currentY += 15

    // ==================== CLIENTE ====================
    doc.fontSize(9).font('Helvetica-Bold')
    doc.text('CLIENTE', 50, currentY)
    currentY += 12

    doc.fontSize(8).font('Helvetica')
    doc.text(`Razón Social: ${customerName}`, 50, currentY)
    currentY += 12

    if (customerCuit) {
      doc.text(`CUIT: ${customerCuit}`, 50, currentY)
      currentY += 12
    }

    doc.text(`Condición IVA: ${customerVatCondition}`, 50, currentY)
    currentY += 12

    if (customerAddress) {
      doc.text(`Domicilio: ${customerAddress}`, 50, currentY, { width: 495 })
      currentY += 12
    }

    // Línea divisoria
    currentY += 5
    doc.rect(50, currentY, 495, 0.5).fill('#000')
    currentY += 10

    // ==================== TABLA DE ITEMS ====================
    doc.fontSize(8).font('Helvetica-Bold')
    doc.text('Cant.', 50, currentY, { width: 40, align: 'center' })
    doc.text('Descripción', 95, currentY, { width: 200 })
    doc.text('P. Unit.', 300, currentY, { width: 60, align: 'right' })
    doc.text('Desc.', 365, currentY, { width: 40, align: 'right' })

    if (discriminatesVat) {
      doc.text('IVA', 410, currentY, { width: 40, align: 'right' })
      doc.text('Total', 455, currentY, { width: 90, align: 'right' })
    } else {
      doc.text('Total', 410, currentY, { width: 135, align: 'right' })
    }

    currentY += 12
    doc.rect(50, currentY, 495, 0.5).fill('#000')
    currentY += 5

    // Items
    doc.font('Helvetica').fontSize(8)

    for (const item of sale.items) {
      const productText = item.productName || item.description || 'Sin descripción'
      const textHeight = doc.heightOfString(productText, { width: 200 })
      const rowHeight = Math.max(15, textHeight + 5)

      // Verificar si hay espacio, sino nueva página
      if (currentY + rowHeight > 700) {
        doc.addPage()
        currentY = 50
      }

      doc.text(this.formatNumber(Number(item.quantity), 2), 50, currentY, { width: 40, align: 'center' })
      doc.text(productText, 95, currentY, { width: 200 })
      doc.text(this.formatCurrency(Number(item.unitPrice)), 300, currentY, { width: 60, align: 'right' })

      const discountText = Number(item.discountPercent) > 0
        ? `${this.formatNumber(Number(item.discountPercent), 0)}%`
        : '-'
      doc.text(discountText, 365, currentY, { width: 40, align: 'right' })

      if (discriminatesVat) {
        doc.text(this.formatCurrency(Number(item.taxAmount)), 410, currentY, { width: 40, align: 'right' })
        doc.text(this.formatCurrency(Number(item.lineTotal)), 455, currentY, { width: 90, align: 'right' })
      } else {
        doc.text(this.formatCurrency(Number(item.lineTotal)), 410, currentY, { width: 135, align: 'right' })
      }

      currentY += rowHeight
    }

    // Línea final de tabla
    currentY += 5
    doc.rect(50, currentY, 495, 0.5).fill('#000')
    currentY += 10

    // ==================== SALTAR AL PIE DE PÁGINA ====================
    // Posicionar totales y datos fiscales al final de la hoja, lado a lado
    currentY = 580 // Posición fija para que siempre queden al pie

    // Línea divisoria superior
    doc.rect(50, currentY, 495, 0.5).fill('#000')
    currentY += 10

    // Guardar posición inicial para ambas columnas
    const footerStartY = currentY

    // ==================== COLUMNA IZQUIERDA: DATOS AFIP + QR ====================
    if (hasCAE) {
      let leftY = footerStartY

      doc.fontSize(9).font('Helvetica-Bold')
      doc.text('DATOS DE VALIDACIÓN ARCA', 50, leftY)
      leftY += 15

      doc.fontSize(8).font('Helvetica')
      doc.text(`CAE: ${cae}`, 50, leftY)
      leftY += 12
      doc.text(`Vencimiento CAE: ${caeExpirationDate}`, 50, leftY)
      leftY += 15

      // Generar QR si hay CAE y CUIT del emisor
      if (cae && cuit) {
        try {
          // Determinar tipo de documento del cliente
          let customerDocType = 99
          let finalCustomerDocNumber = '0'

          if (customerCuit) {
            finalCustomerDocNumber = customerCuit
            const cleanDoc = customerCuit.replace(/\D/g, '')
            if (cleanDoc.length === 11) {
              customerDocType = 80
            } else if (cleanDoc.length >= 7 && cleanDoc.length <= 8) {
              customerDocType = 96
            }
          }

          const qrData = AfipQRService.generateQRData({
            cuit: cuit,
            voucherTypeCode: voucherType?.afipCode || 1,
            salesPointNumber: sale.voucherConfiguration?.salesPoint?.number || 1,
            voucherNumber: parseInt(sale.saleNumber.split('-')[1] || '1'),
            amount: Number(sale.totalAmount),
            documentDate: new Date(sale.saleDate),
            customerDocType: customerDocType,
            customerDocNumber: finalCustomerDocNumber,
            cae: cae
          })

          // Generar imagen del QR
          const qrBuffer = await QRCode.toBuffer(qrData, {
            type: 'png',
            width: 200,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })

          const tmpPath = '/tmp/qr-debug.png'
          fs.writeFileSync(tmpPath, qrBuffer)

          // Insertar QR
          doc.image(tmpPath, 50, leftY, {
            fit: [100, 100]
          })

          // Texto junto al QR
          doc.fontSize(7).font('Helvetica').fillColor('#000000')
          doc.text('Escaneá el código QR', 160, leftY + 20, { width: 100 })
          doc.text('para verificar en ARCA', 160, leftY + 30, { width: 100 })
        } catch (error) {
          console.error('[PDF] Error generando QR:', error)
        }
      }
    }

    // ==================== COLUMNA DERECHA: TOTALES ====================
    let rightY = footerStartY
    const totalsX = 350
    const labelWidth = 100
    const valueWidth = 95

    doc.fontSize(9).font('Helvetica').fillColor('#000000')

    // Subtotal
    doc.text('Subtotal:', totalsX, rightY, { width: labelWidth, align: 'right' })
    doc.text(this.formatCurrency(Number(sale.subtotal)), totalsX + labelWidth, rightY, {
      width: valueWidth,
      align: 'right'
    })
    rightY += 12

    // Descuento (si existe)
    if (Number(sale.discountAmount) > 0) {
      doc.text('Descuento:', totalsX, rightY, { width: labelWidth, align: 'right' })
      doc.text(`-${this.formatCurrency(Number(sale.discountAmount))}`, totalsX + labelWidth, rightY, {
        width: valueWidth,
        align: 'right'
      })
      rightY += 12
    }

    // IVA (si discrimina)
    if (discriminatesVat && Number(sale.taxAmount) > 0) {
      doc.text('IVA 21%:', totalsX, rightY, { width: labelWidth, align: 'right' })
      doc.text(this.formatCurrency(Number(sale.taxAmount)), totalsX + labelWidth, rightY, {
        width: valueWidth,
        align: 'right'
      })
      rightY += 12
    }

    // Línea antes del total
    doc.rect(totalsX, rightY, labelWidth + valueWidth, 0.5).fill('#000')
    rightY += 5

    // TOTAL
    doc.fontSize(12).font('Helvetica-Bold')
    doc.text('TOTAL:', totalsX, rightY, { width: labelWidth, align: 'right' })
    doc.text(this.formatCurrency(Number(sale.totalAmount)), totalsX + labelWidth, rightY, {
      width: valueWidth,
      align: 'right'
    })
    rightY += 20

    // FORMAS DE PAGO (debajo de totales)
    if (sale.payments.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold')
      doc.text('FORMAS DE PAGO:', totalsX, rightY, { width: labelWidth + valueWidth, align: 'left' })
      rightY += 12

      doc.font('Helvetica').fontSize(8)
      for (const payment of sale.payments) {
        const method = payment.paymentMethodName
        const amount = this.formatCurrency(Number(payment.amount))
        const reference = payment.reference ? ` - Ref: ${payment.reference}` : ''

        doc.text(`${method}: ${amount}${reference}`, totalsX, rightY, {
          width: labelWidth + valueWidth,
          align: 'left'
        })
        rightY += 10
      }
    }

    // Actualizar currentY al máximo de ambas columnas
    currentY = Math.max(footerStartY + 110, rightY)

    // ==================== FOOTER ====================
    currentY = Math.max(currentY, 750) // Ir al final de la página
    doc.fontSize(7).font('Helvetica').fillColor('#666')
    doc.text(
      'Comprobante Autorizado',
      50,
      currentY,
      { width: 495, align: 'center' }
    )
  }

  /**
   * PLANTILLA 2: PRESUPUESTO
   * Sin datos fiscales, más simple y limpio
   */
  private renderQuoteInvoice(doc: PDFKit.PDFDocument, sale: SaleWithRelations) {
    const businessName = sale.tenant.businessName || sale.tenant.name
    const cuit = sale.tenant.cuit || 'Sin CUIT'
    const address = sale.tenant.address || ''
    const phone = sale.tenant.phone || ''
    const email = sale.tenant.email || ''

    const customerName = sale.customerName || sale.customer?.name || 'Cliente'
    const customerAddress = sale.customer?.addressLine1 || ''
    const customerPhone = sale.customer?.phone || ''
    const saleDate = new Date(sale.saleDate).toLocaleDateString('es-AR')

    let currentY = doc.y

    // ==================== HEADER ====================
    const logoUrl = sale.tenant.logo

    if (logoUrl) {
      try {
        // Intentar cargar el logo
        doc.image(logoUrl, 50, currentY, { width: 100, height: 100, fit: [100, 100] })
        currentY += 105
      } catch (error) {
        console.error('[PDF] Error cargando logo:', error)
        // Si falla, mostrar nombre de empresa
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#2c3e50')
        doc.text(businessName, 50, currentY, { width: 300 })
        currentY += 35
      }
    } else {
      // Sin logo, mostrar nombre de empresa
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#2c3e50')
      doc.text(businessName, 50, currentY, { width: 300 })
      currentY += 35
    }

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#e74c3c')
    doc.text('PRESUPUESTO', 350, doc.y - (logoUrl ? 105 : 35), { width: 195, align: 'right' })

    doc.fontSize(10).font('Helvetica').fillColor('#000')
    if (address) {
      doc.text(address, 50, currentY, { width: 300 })
      currentY += 12
    }
    if (phone) {
      doc.text(`Tel: ${phone}`, 50, currentY)
      currentY += 12
    }
    if (email) {
      doc.text(`Email: ${email}`, 50, currentY)
      currentY += 12
    }

    // Número y fecha (derecha)
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text(`Nº ${sale.saleNumber}`, 350, doc.y - 36, { width: 195, align: 'right' })
    doc.font('Helvetica')
    doc.text(`Fecha: ${saleDate}`, 350, doc.y, { width: 195, align: 'right' })
    doc.fontSize(9)
    doc.text(`CUIT: ${cuit}`, 350, doc.y + 2, { width: 195, align: 'right' })
    doc.text(`Ingresos Brutos: EXENTO`, 350, doc.y + 2, { width: 195, align: 'right' })
    doc.text(`Inicio de Actividades: 01/01/2024`, 350, doc.y + 2, { width: 195, align: 'right' })

    currentY += 20

    // Línea divisoria
    doc.rect(50, currentY, 495, 1).fill('#3498db')
    currentY += 15

    // ==================== DATOS DEL CLIENTE ====================
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50')
    doc.text('CLIENTE', 50, currentY)
    currentY += 15

    doc.fontSize(9).font('Helvetica').fillColor('#000')
    doc.text(`Nombre: ${customerName}`, 50, currentY)
    currentY += 12

    if (customerAddress) {
      doc.text(`Dirección: ${customerAddress}`, 50, currentY, { width: 495 })
      currentY += 12
    }

    if (customerPhone) {
      doc.text(`Teléfono: ${customerPhone}`, 50, currentY)
      currentY += 12
    }

    currentY += 10

    // ==================== TABLA DE ITEMS ====================
    // Header de tabla con fondo
    doc.rect(50, currentY, 495, 20).fill('#3498db')
    currentY += 5

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff')
    doc.text('Cant.', 55, currentY, { width: 40, align: 'center' })
    doc.text('Descripción', 100, currentY, { width: 250 })
    doc.text('P. Unitario', 355, currentY, { width: 70, align: 'right' })
    doc.text('Total', 430, currentY, { width: 110, align: 'right' })

    currentY += 15
    doc.fillColor('#000')

    // Items
    doc.font('Helvetica').fontSize(9)
    let alternate = false

    for (const item of sale.items) {
      const productText = item.productName || item.description || 'Sin descripción'
      const textHeight = doc.heightOfString(productText, { width: 250 })
      const rowHeight = Math.max(20, textHeight + 10)

      // Verificar si hay espacio
      if (currentY + rowHeight > 700) {
        doc.addPage()
        currentY = 50
        alternate = false
      }

      // Fila alternada
      if (alternate) {
        doc.rect(50, currentY, 495, rowHeight).fill('#ecf0f1')
      }

      doc.fillColor('#000')
      doc.text(this.formatNumber(Number(item.quantity), 2), 55, currentY + 5, { width: 40, align: 'center' })
      doc.text(productText, 100, currentY + 5, { width: 250 })
      doc.text(this.formatCurrency(Number(item.unitPrice)), 355, currentY + 5, {
        width: 70,
        align: 'right'
      })
      doc.text(this.formatCurrency(Number(item.lineTotal)), 430, currentY + 5, {
        width: 110,
        align: 'right'
      })

      currentY += rowHeight
      alternate = !alternate
    }

    currentY += 10

    // ==================== TOTALES ====================
    const totalsX = 350
    const labelWidth = 80
    const valueWidth = 110

    doc.fontSize(10).font('Helvetica')

    // Subtotal
    if (Number(sale.discountAmount) > 0) {
      doc.text('Subtotal:', totalsX, currentY, { width: labelWidth, align: 'right' })
      doc.text(this.formatCurrency(Number(sale.subtotal)), totalsX + labelWidth, currentY, {
        width: valueWidth,
        align: 'right'
      })
      currentY += 15

      doc.text('Descuento:', totalsX, currentY, { width: labelWidth, align: 'right' })
      doc.text(`-${this.formatCurrency(Number(sale.discountAmount))}`, totalsX + labelWidth, currentY, {
        width: valueWidth,
        align: 'right'
      })
      currentY += 15
    }

    // Rectángulo de total
    doc.rect(totalsX, currentY, labelWidth + valueWidth, 35).fillAndStroke('#3498db', '#2980b9')
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#fff')
    doc.text('TOTAL', totalsX + 10, currentY + 10, { width: labelWidth - 10, align: 'left' })
    doc.text(this.formatCurrency(Number(sale.totalAmount)), totalsX + labelWidth, currentY + 10, {
      width: valueWidth - 10,
      align: 'right'
    })

    currentY += 50
    doc.fillColor('#000')

    // ==================== FORMAS DE PAGO ====================
    if (sale.payments.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Formas de Pago:', 50, currentY)
      currentY += 15

      doc.font('Helvetica').fontSize(9)
      for (const payment of sale.payments) {
        doc.text(`• ${payment.paymentMethodName}: ${this.formatCurrency(Number(payment.amount))}`, 70, currentY)
        currentY += 12
      }
    }

    // ==================== NOTAS ====================
    if (sale.notes) {
      currentY += 20
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Notas:', 50, currentY)
      currentY += 15

      doc.font('Helvetica').fontSize(9)
      doc.text(sale.notes, 50, currentY, { width: 495 })
    }

    // ==================== FOOTER ====================
    currentY = Math.max(currentY + 30, 750)
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#7f8c8d')
    doc.text(
      'Este presupuesto tiene una validez de 30 días desde la fecha de emisión.',
      50,
      currentY,
      { width: 495, align: 'center' }
    )
    currentY += 12
    doc.text('Gracias por su preferencia!', 50, currentY, { width: 495, align: 'center' })
  }

  /**
   * Genera un PDF para un presupuesto (Quote)
   */
  async generateQuotePDF(quote: QuoteWithRelations): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        })

        const buffers: Buffer[] = []

        doc.on('data', (chunk) => buffers.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', reject)

        await this.renderQuoteDocument(doc, quote)

        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Renderiza el documento de presupuesto
   */
  private async renderQuoteDocument(doc: PDFKit.PDFDocument, quote: QuoteWithRelations) {
    const businessName = quote.tenant.businessName || quote.tenant.name
    const cuit = quote.tenant.cuit || 'Sin CUIT'
    const address = quote.tenant.address || ''
    const phone = quote.tenant.phone || ''
    const email = quote.tenant.email || ''

    const customerName = quote.customerName || quote.customer?.name || 'Cliente'
    const customerAddress = quote.customer?.addressLine1 || ''
    const customerPhone = quote.customer?.phone || ''
    const customerEmail = quote.customer?.email || ''
    const quoteDate = new Date(quote.quoteDate).toLocaleDateString('es-AR')
    const validUntilDate = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString('es-AR')
      : null

    let currentY = doc.y

    // ==================== HEADER ====================
    const logoUrl = quote.tenant.logo

    if (logoUrl) {
      try {
        doc.image(logoUrl, 50, currentY, { width: 100, height: 100, fit: [100, 100] })
        currentY += 105
      } catch (error) {
        console.error('[PDF] Error cargando logo:', error)
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#2c3e50')
        doc.text(businessName, 50, currentY, { width: 300 })
        currentY += 35
      }
    } else {
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#2c3e50')
      doc.text(businessName, 50, currentY, { width: 300 })
      currentY += 35
    }

    // Título PRESUPUESTO
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#3498db')
    doc.text('PRESUPUESTO', 350, doc.y - (logoUrl ? 105 : 35), { width: 195, align: 'right' })

    doc.fontSize(10).font('Helvetica').fillColor('#000')
    if (address) {
      doc.text(address, 50, currentY, { width: 300 })
      currentY += 12
    }
    if (phone) {
      doc.text(`Tel: ${phone}`, 50, currentY)
      currentY += 12
    }
    if (email) {
      doc.text(`Email: ${email}`, 50, currentY)
      currentY += 12
    }

    // Número y fecha (derecha)
    doc.fontSize(11).font('Helvetica-Bold')
    doc.text(`Nº ${quote.quoteNumber}`, 350, doc.y - 36, { width: 195, align: 'right' })
    doc.font('Helvetica').fontSize(10)
    doc.text(`Fecha: ${quoteDate}`, 350, doc.y, { width: 195, align: 'right' })
    if (validUntilDate) {
      doc.text(`Válido hasta: ${validUntilDate}`, 350, doc.y + 2, { width: 195, align: 'right' })
    }
    doc.fontSize(9)
    doc.text(`CUIT: ${cuit}`, 350, doc.y + 2, { width: 195, align: 'right' })

    currentY += 20

    // Línea divisoria
    doc.rect(50, currentY, 495, 2).fill('#3498db')
    currentY += 18

    // ==================== DATOS DEL CLIENTE ====================
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50')
    doc.text('CLIENTE', 50, currentY)
    currentY += 15

    doc.fontSize(9).font('Helvetica').fillColor('#000')
    doc.text(`Nombre: ${customerName}`, 50, currentY)
    currentY += 12

    if (customerAddress) {
      doc.text(`Dirección: ${customerAddress}`, 50, currentY, { width: 495 })
      currentY += 12
    }

    if (customerPhone) {
      doc.text(`Teléfono: ${customerPhone}`, 50, currentY)
      currentY += 12
    }

    if (customerEmail) {
      doc.text(`Email: ${customerEmail}`, 50, currentY)
      currentY += 12
    }

    currentY += 10

    // ==================== TABLA DE ITEMS ====================
    // Header de tabla con fondo
    doc.rect(50, currentY, 495, 22).fill('#3498db')
    currentY += 6

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff')
    doc.text('Cant.', 55, currentY, { width: 45, align: 'center' })
    doc.text('Descripción', 105, currentY, { width: 220 })
    doc.text('P. Unitario', 330, currentY, { width: 70, align: 'right' })
    doc.text('Desc.', 405, currentY, { width: 40, align: 'right' })
    doc.text('Total', 450, currentY, { width: 90, align: 'right' })

    currentY += 16
    doc.fillColor('#000')

    // Items
    doc.font('Helvetica').fontSize(9)
    let alternate = false

    for (const item of quote.items) {
      const productText = item.productName || item.description || 'Sin descripción'
      const textHeight = doc.heightOfString(productText, { width: 220 })
      const rowHeight = Math.max(22, textHeight + 10)

      // Verificar si hay espacio
      if (currentY + rowHeight > 680) {
        doc.addPage()
        currentY = 50
        alternate = false
      }

      // Fila alternada
      if (alternate) {
        doc.rect(50, currentY, 495, rowHeight).fill('#f0f4f8')
      }

      doc.fillColor('#000')
      doc.text(this.formatNumber(Number(item.quantity), 2), 55, currentY + 6, { width: 45, align: 'center' })
      doc.text(productText, 105, currentY + 6, { width: 220 })
      doc.text(this.formatCurrency(Number(item.unitPrice)), 330, currentY + 6, { width: 70, align: 'right' })

      const discountText = Number(item.discountPercent) > 0
        ? `${this.formatNumber(Number(item.discountPercent), 0)}%`
        : '-'
      doc.text(discountText, 405, currentY + 6, { width: 40, align: 'right' })

      doc.text(this.formatCurrency(Number(item.lineTotal)), 450, currentY + 6, { width: 90, align: 'right' })

      currentY += rowHeight
      alternate = !alternate
    }

    currentY += 15

    // ==================== TOTALES ====================
    // Nota: Los presupuestos NO incluyen IVA, son montos netos
    const totalsX = 350
    const labelWidth = 90
    const valueWidth = 100

    doc.fontSize(10).font('Helvetica')

    // Subtotal (solo si hay descuento, de lo contrario solo mostramos el total)
    if (Number(quote.discountAmount) > 0) {
      doc.text('Subtotal:', totalsX, currentY, { width: labelWidth, align: 'right' })
      doc.text(this.formatCurrency(Number(quote.subtotal)), totalsX + labelWidth, currentY, {
        width: valueWidth,
        align: 'right'
      })
      currentY += 15

      doc.text('Descuento:', totalsX, currentY, { width: labelWidth, align: 'right' })
      doc.text(`-${this.formatCurrency(Number(quote.discountAmount))}`, totalsX + labelWidth, currentY, {
        width: valueWidth,
        align: 'right'
      })
      currentY += 15
    }

    // Rectángulo de total
    doc.rect(totalsX, currentY, labelWidth + valueWidth, 35).fillAndStroke('#3498db', '#2980b9')
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#fff')
    doc.text('TOTAL', totalsX + 10, currentY + 10, { width: labelWidth - 10, align: 'left' })
    doc.text(this.formatCurrency(Number(quote.totalAmount)), totalsX + labelWidth, currentY + 10, {
      width: valueWidth - 10,
      align: 'right'
    })

    currentY += 55
    doc.fillColor('#000')

    // ==================== NOTAS ====================
    if (quote.notes) {
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Observaciones:', 50, currentY)
      currentY += 12

      doc.font('Helvetica').fontSize(9)
      doc.text(quote.notes, 50, currentY, { width: 495 })
      currentY += doc.heightOfString(quote.notes, { width: 495 }) + 10
    }

    // ==================== TÉRMINOS Y CONDICIONES ====================
    if (quote.termsAndConditions) {
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Términos y Condiciones:', 50, currentY)
      currentY += 12

      doc.font('Helvetica').fontSize(9)
      doc.text(quote.termsAndConditions, 50, currentY, { width: 495 })
      currentY += doc.heightOfString(quote.termsAndConditions, { width: 495 }) + 10
    }

    // ==================== FOOTER ====================
    currentY = Math.max(currentY + 30, 750)

    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#7f8c8d')
    if (validUntilDate) {
      doc.text(
        `Este presupuesto tiene validez hasta el ${validUntilDate}.`,
        50, currentY,
        { width: 495, align: 'center' }
      )
    } else {
      doc.text(
        'Este presupuesto tiene una validez de 15 días desde la fecha de emisión.',
        50, currentY,
        { width: 495, align: 'center' }
      )
    }
    currentY += 12
    doc.text('Gracias por su preferencia!', 50, currentY, { width: 495, align: 'center' })
  }
}

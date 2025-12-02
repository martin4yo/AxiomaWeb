import { TicketTemplate, TicketData } from './printTemplates'
import QRCode from 'qrcode'

export class PrintService {
  private printServiceUrl: string = 'http://localhost:9100'
  private isAvailable: boolean = false

  constructor() {
    const savedUrl = localStorage.getItem('printServiceUrl')
    if (savedUrl) {
      this.printServiceUrl = savedUrl
    }
  }

  /**
   * Verifica si el servicio de impresión está disponible
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.printServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      })
      this.isAvailable = response.ok
    } catch {
      this.isAvailable = false
    }
    return this.isAvailable
  }

  /**
   * Imprime un ticket usando el template especificado
   */
  async printTicket(template: TicketTemplate, data: TicketData): Promise<boolean> {
    // Por ahora usamos fallback directo (impresión navegador)
    // En el futuro se puede intentar servicio Electron primero
    return this.printFallback(template, data)
  }

  /**
   * Fallback: imprime usando el navegador con iframe (evita bloqueo de popup)
   */
  private async printFallback(template: TicketTemplate, data: TicketData): Promise<boolean> {
    const html = await this.renderTemplate(template, data)

    // Crear iframe oculto
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'

    document.body.appendChild(iframe)

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) {
        console.error('No se pudo acceder al documento del iframe')
        document.body.removeChild(iframe)
        return false
      }

      iframeDoc.open()
      iframeDoc.write(html)
      iframeDoc.close()

      // Esperar un momento para que el contenido se renderice, luego imprimir
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          // Remover iframe después de imprimir
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 1000)
        } catch (error) {
          console.error('Error al imprimir:', error)
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }
      }, 250)

      return true
    } catch (error) {
      console.error('Error al preparar impresión:', error)
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
      return false
    }
  }

  /**
   * Renderiza un template con los datos proporcionados
   */
  private async renderTemplate(template: TicketTemplate, data: TicketData): Promise<string> {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${template.name}</title>
        <style>
          ${this.generateCSS(template)}
        </style>
      </head>
      <body>
    `

    // Renderizar cada sección del template
    for (const section of template.sections) {
      html += await this.renderSection(section, data)
    }

    html += `
      </body>
      </html>
    `

    return html
  }

  /**
   * Genera el CSS para el ticket según configuración del template
   */
  private generateCSS(template: TicketTemplate): string {
    const paperWidth = template.paperWidth || 80
    const fontSize = template.fontSize || 12

    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      @page {
        size: ${paperWidth}mm auto;
        margin: 0;
      }

      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: ${fontSize}px;
        line-height: 1.4;
        color: #000;
        background: #fff;
        width: ${paperWidth}mm;
        margin: 0 auto;
        padding: 5mm;
      }

      .center { text-align: center; }
      .left { text-align: left; }
      .right { text-align: right; }

      .bold { font-weight: bold; }
      .large { font-size: ${fontSize + 4}px; }
      .small { font-size: ${fontSize - 2}px; }

      .divider {
        border-top: 1px dashed #000;
        margin: 3px 0;
      }

      .divider-solid {
        border-top: 1px solid #000;
        margin: 3px 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 3px 0;
      }

      table td, table th {
        padding: 2px;
      }

      table th {
        text-align: left;
        font-weight: bold;
        border-bottom: 1px solid #000;
      }

      .item-row td {
        vertical-align: top;
      }

      .total-row {
        font-weight: bold;
        border-top: 1px solid #000;
        padding-top: 3px;
      }

      .header {
        margin-bottom: 8px;
      }

      .footer {
        margin-top: 8px;
      }

      .barcode {
        text-align: center;
        font-family: 'Libre Barcode 128', 'Courier New', monospace;
        font-size: 32px;
        margin: 5px 0;
      }

      @media print {
        body {
          width: ${paperWidth}mm;
        }
        .no-print {
          display: none;
        }
      }
    `
  }

  /**
   * Renderiza una sección del template
   */
  private async renderSection(section: any, data: TicketData): Promise<string> {
    let html = '<div class="section">'

    switch (section.type) {
      case 'header':
        html += this.renderHeader(section, data)
        break
      case 'info':
        html += this.renderInfo(section, data)
        break
      case 'table':
        html += this.renderTable(section, data)
        break
      case 'totals':
        html += this.renderTotals(section, data)
        break
      case 'payments':
        html += this.renderPayments(section, data)
        break
      case 'qrcode':
        html += await this.renderQRCode(section, data)
        break
      case 'footer':
        html += this.renderFooter(section, data)
        break
      case 'divider':
        html += '<div class="divider"></div>'
        break
      case 'divider-solid':
        html += '<div class="divider-solid"></div>'
        break
      default:
        html += this.renderText(section, data)
    }

    html += '</div>'
    return html
  }

  /**
   * Renderiza el header (datos de la empresa)
   */
  private renderHeader(section: any, data: TicketData): string {
    const { business } = data
    let html = '<div class="header center">'

    if (section.items) {
      for (const item of section.items) {
        html += this.renderTextItem(item, data)
      }
    } else {
      // Header por defecto
      html += `<div class="bold large">${business.name || 'MI NEGOCIO'}</div>`
      if (business.cuit) html += `<div class="small">CUIT: ${business.cuit}</div>`
      if (business.address) html += `<div class="small">${business.address}</div>`
      if (business.phone) html += `<div class="small">Tel: ${business.phone}</div>`
    }

    html += '</div>'
    return html
  }

  /**
   * Renderiza información del documento
   */
  private renderInfo(section: any, data: TicketData): string {
    let html = '<div class="info">'

    if (section.items) {
      for (const item of section.items) {
        html += this.renderTextItem(item, data)
      }
    }

    html += '</div>'
    return html
  }

  /**
   * Renderiza una tabla de items
   */
  private renderTable(section: any, data: TicketData): string {
    const items = data.sale?.items || data.purchase?.items || []

    let html = '<table>'

    // Header
    html += '<tr>'
    if (section.columns) {
      for (const col of section.columns) {
        const align = col.align || 'left'
        html += `<th class="${align}">${col.header}</th>`
      }
    } else {
      // Columnas por defecto
      html += '<th class="left">Producto</th>'
      html += '<th class="right">Cant.</th>'
      html += '<th class="right">P. Unit.</th>'
      html += '<th class="right">Total</th>'
    }
    html += '</tr>'

    // Items
    for (const item of items) {
      html += '<tr class="item-row">'

      if (section.columns) {
        for (const col of section.columns) {
          const align = col.align || 'left'
          const value = this.getNestedValue(item, col.field)
          const formatted = col.decimals !== undefined
            ? this.formatNumber(value, col.decimals)
            : value
          html += `<td class="${align}">${formatted || ''}</td>`
        }
      } else {
        // Formato por defecto
        html += `<td class="left">${item.productName || ''}</td>`
        html += `<td class="right">${this.formatNumber(item.quantity, 2)}</td>`
        html += `<td class="right">$${this.formatNumber(item.unitPrice, 2)}</td>`
        html += `<td class="right">$${this.formatNumber(item.lineTotal, 2)}</td>`
      }

      html += '</tr>'

      // Descripción personalizada en segunda línea si existe
      if (item.description) {
        html += `<tr><td colspan="${section.columns?.length || 4}" class="small" style="padding-left: 10px; font-style: italic;">${item.description}</td></tr>`
      }
    }

    html += '</table>'
    return html
  }

  /**
   * Renderiza la sección de totales
   */
  private renderTotals(section: any, data: TicketData): string {
    const sale = data.sale || data.purchase

    let html = '<div class="totals">'

    if (section.items) {
      for (const item of section.items) {
        if (item.type === 'divider') {
          html += '<div class="divider"></div>'
        } else {
          const label = item.label || ''
          const value = this.interpolate(item.value, data)
          const classes = []
          if (item.bold) classes.push('bold')
          if (item.align) classes.push(item.align)

          html += `<div class="${classes.join(' ')}" style="display: flex; justify-content: space-between;">`
          html += `<span>${label}</span>`
          html += `<span>${this.formatCurrency(value)}</span>`
          html += '</div>'
        }
      }
    } else {
      // Totales por defecto
      html += '<div class="divider"></div>'
      html += `<div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>$${this.formatNumber(sale?.subtotal, 2)}</span></div>`
      if (sale?.discountAmount && Number(sale.discountAmount) > 0) {
        html += `<div style="display: flex; justify-content: space-between;"><span>Descuento:</span><span>-$${this.formatNumber(sale.discountAmount, 2)}</span></div>`
      }
      if (sale?.taxAmount && Number(sale.taxAmount) > 0) {
        html += `<div style="display: flex; justify-content: space-between;"><span>IVA:</span><span>$${this.formatNumber(sale.taxAmount, 2)}</span></div>`
      }
      html += '<div class="divider"></div>'
      html += `<div class="bold large" style="display: flex; justify-content: space-between;"><span>TOTAL:</span><span>$${this.formatNumber(sale?.totalAmount, 2)}</span></div>`
      html += '<div class="divider"></div>'
    }

    html += '</div>'
    return html
  }

  /**
   * Renderiza la sección de formas de pago
   */
  private renderPayments(section: any, data: TicketData): string {
    const payments = data.sale?.payments || data.purchase?.payments || []

    // No renderizar si no hay pagos
    if (payments.length === 0) {
      return ''
    }

    let html = '<div class="payments">'
    html += '<div class="divider"></div>'

    // Título (si está en items)
    if (section.items) {
      for (const item of section.items) {
        html += this.renderTextItem(item, data)
      }
    } else {
      html += '<div class="bold">FORMAS DE PAGO:</div>'
    }

    // Listar cada forma de pago
    for (const payment of payments) {
      html += '<div style="display: flex; justify-content: space-between; margin-top: 2px;">'
      html += `<span>${payment.name}${payment.reference ? ` (${payment.reference})` : ''}</span>`
      html += `<span>${this.formatCurrency(payment.amount)}</span>`
      html += '</div>'
    }

    html += '</div>'
    return html
  }

  /**
   * Renderiza un código QR
   */
  private async renderQRCode(section: any, data: TicketData): Promise<string> {
    const qrData = this.interpolate(section.data, data)

    if (!qrData) {
      return ''
    }

    try {
      // Generar QR code como Data URL
      const qrDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M'
      })

      const align = section.align || 'center'
      let html = `<div class="${align}" style="margin: 10px 0;">`
      html += `<img src="${qrDataURL}" alt="QR Code" style="max-width: 200px; height: auto;" />`
      html += '</div>'

      return html
    } catch (error) {
      console.error('Error generating QR code:', error)
      return ''
    }
  }

  /**
   * Renderiza el footer
   */
  private renderFooter(section: any, data: TicketData): string {
    let html = '<div class="footer center">'

    if (section.items) {
      for (const item of section.items) {
        html += this.renderTextItem(item, data)
      }
    } else {
      html += '<div>¡Gracias por su compra!</div>'
      html += `<div class="small">${new Date().toLocaleString('es-AR')}</div>`
    }

    html += '</div>'
    return html
  }

  /**
   * Renderiza un item de texto
   */
  private renderTextItem(item: any, data: TicketData): string {
    const content = this.interpolate(item.content, data)
    const classes = []

    if (item.bold) classes.push('bold')
    if (item.align) classes.push(item.align)
    if (item.size === 'large') classes.push('large')
    if (item.size === 'small') classes.push('small')

    return `<div class="${classes.join(' ')}">${content}</div>`
  }

  /**
   * Renderiza texto genérico
   */
  private renderText(section: any, data: TicketData): string {
    const content = this.interpolate(section.content, data)
    return `<div>${content}</div>`
  }

  /**
   * Interpola variables en un string
   * Soporta: {{business.name}}, {{sale.number}}, etc.
   */
  private interpolate(template: string | undefined, data: TicketData): string {
    if (!template) return ''

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path.trim())
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * Obtiene un valor anidado de un objeto usando dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => current?.[part], obj)
  }

  /**
   * Formatea un número con decimales
   */
  private formatNumber(value: any, decimals: number = 2): string {
    const num = parseFloat(value)
    if (isNaN(num)) return '0.00'
    return num.toFixed(decimals)
  }

  /**
   * Formatea un valor como moneda
   */
  private formatCurrency(value: any): string {
    const num = parseFloat(value)
    if (isNaN(num)) return '$0.00'
    return `$${num.toFixed(2)}`
  }
}

export const printService = new PrintService()

import { api } from '../services/api'

export interface SaleItem {
  productId: string
  quantity: number
  unitPrice?: number
  discountPercent?: number
  taxRate?: number
}

export interface SalePayment {
  paymentMethodId: string
  amount: number
  reference?: string
  referenceDate?: string
}

export interface CreateSaleData {
  customerId?: string
  warehouseId: string
  items: SaleItem[]
  payments: SalePayment[]
  notes?: string
  shouldInvoice?: boolean
  discountPercent?: number
  forceWithoutCAE?: boolean
}

export interface SalesFilters {
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
  customerId?: string
  paymentStatus?: string
  afipStatus?: string
  search?: string
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export const salesApi = {
  // Crear venta
  createSale: async (tenantSlug: string, data: CreateSaleData) => {
    const response = await api.post(`/${tenantSlug}/sales`, data)
    return response.data
  },

  // Listar ventas
  getSales: async (filters?: SalesFilters) => {
    const response = await api.get('/sales', { params: filters })
    return response.data
  },

  // Obtener detalle de venta
  getSale: async (id: string) => {
    const response = await api.get(`/sales/${id}`)
    return response.data
  },

  // Cancelar venta
  cancelSale: async (id: string) => {
    const response = await api.put(`/sales/${id}/cancel`)
    return response.data
  },

  // Reintentar CAE para una venta
  retryCae: async (id: string) => {
    const response = await api.post(`/sales/${id}/retry-cae`)
    return response.data
  },

  // Obtener datos formateados para impresión térmica
  getThermalPrintData: async (id: string) => {
    const response = await api.get(`/sales/${id}/print/thermal-data`)
    return response.data
  },

  // Imprimir en impresora térmica
  printThermal: async (id: string) => {
    // 1. Obtener datos del backend
    const { data: printData } = await salesApi.getThermalPrintData(id)

    // 2. Intentar imprimir con QZ Tray (método recomendado)
    try {
      const { qzTrayService } = await import('../services/qz-tray')

      await qzTrayService.printThermal(
        printData.business,
        printData.sale,
        printData.template as 'simple' | 'legal'
      )

      return {
        success: true,
        message: 'Impreso correctamente con QZ Tray',
        method: 'qz-tray'
      }
    } catch (qzError) {
      console.warn('QZ Tray no disponible, usando fallback HTML:', qzError)

      // 3. Fallback: Impresión HTML (window.print)
      try {
        await salesApi.printThermalHTML(printData)

        return {
          success: true,
          message: 'Abriendo diálogo de impresión del navegador',
          method: 'html'
        }
      } catch (htmlError) {
        console.error('Error en fallback HTML:', htmlError)
        throw new Error('No se pudo imprimir el ticket. QZ Tray no disponible.')
      }
    }
  },

  // Imprimir usando fallback HTML
  printThermalHTML: async (printData: any) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const html = salesApi.generateThermalHTML(printData)

        // Crear iframe oculto
        const iframe = document.createElement('iframe')
        iframe.style.position = 'absolute'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = 'none'

        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) {
          document.body.removeChild(iframe)
          reject(new Error('No se pudo acceder al documento del iframe'))
          return
        }

        iframeDoc.open()
        iframeDoc.write(html)
        iframeDoc.close()

        // Esperar render y luego imprimir
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

            resolve()
          } catch (error) {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
            reject(error)
          }
        }, 250)
      } catch (error) {
        reject(error)
      }
    })
  },

  // Generar HTML para impresión térmica
  generateThermalHTML: (printData: any): string => {
    const { business, sale } = printData

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket de Venta</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          @page {
            size: 80mm auto;
            margin: 0;
          }

          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
          }

          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
          }

          table td {
            padding: 2px 0;
          }

          .item-desc {
            margin-bottom: 2px;
          }

          .item-detail {
            margin-bottom: 5px;
          }

          @media print {
            body { width: 80mm; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold large">${business.name || ''}</div>
          ${business.cuit ? `<div>CUIT: ${business.cuit}</div>` : ''}
          ${business.address ? `<div>${business.address}</div>` : ''}
          ${business.phone ? `<div>Tel: ${business.phone}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          <div>Comprobante: ${sale.number || ''}</div>
          <div>Fecha: ${sale.date || ''}</div>
        </div>

        <div class="divider"></div>

        ${sale.items.map((item: any) => `
          <div class="item-desc">${item.description || 'Sin descripción'}</div>
          <div class="item-detail">
            ${Number(item.quantity) || 0} x $${(Number(item.price) || 0).toFixed(2)} = $${(Number(item.total) || 0).toFixed(2)}
          </div>
        `).join('')}

        <div class="divider"></div>

        <div class="bold large center">
          TOTAL: $${(Number(sale.total) || 0).toFixed(2)}
        </div>

        ${sale.payments && sale.payments.length > 0 ? `
          <div class="divider"></div>
          <div class="bold">FORMAS DE PAGO:</div>
          ${sale.payments.map((p: any) => `
            <div>${p.method || 'Sin especificar'}: $${(Number(p.amount) || 0).toFixed(2)}</div>
          `).join('')}
        ` : ''}

        ${sale.cae ? `
          <div class="divider"></div>
          <div>CAE: ${sale.cae.number}</div>
          <div>Vto. CAE: ${sale.cae.expirationDate}</div>
        ` : ''}

        <div class="divider"></div>
        <div class="center">¡Gracias por su compra!</div>
      </body>
      </html>
    `
  },

  // Obtener PDF de venta
  getPDF: async (id: string) => {
    const response = await api.get(`/sales/${id}/pdf/preview`, {
      responseType: 'blob'
    })
    return response.data
  }
}

import { api } from '../services/api'
import { printService } from '../services/printService'
import { TICKET_VENTA_80MM, FACTURA_B_80MM, FACTURA_A_80MM, TicketData } from '../services/printTemplates'

/**
 * Convierte los datos del backend al formato TicketData que usa printService
 */
const convertToTicketData = (printData: any): TicketData => {
  const { business, sale } = printData

  return {
    business: {
      name: business.name || 'Mi Negocio',
      cuit: business.cuit || '',
      address: business.address || '',
      phone: business.phone || '',
      email: business.email || '',
      vatCondition: business.vatCondition || 'IVA Responsable Inscripto',
      grossIncomeNumber: business.grossIncomeNumber || '',
      activityStartDate: business.activityStartDate || '',
    },
    sale: {
      number: sale.number || '',
      date: sale.date || new Date().toLocaleDateString('es-AR'),
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      customer: sale.customer || 'Consumidor Final',
      customerCuit: sale.customerCuit || '',
      customerVatCondition: sale.customerVatCondition || 'CF',
      customerAddress: sale.customerAddress || '',
      voucherType: sale.voucherName ? `${sale.voucherName} ${sale.voucherLetter || ''}`.trim() : 'Ticket',
      voucherLetter: sale.voucherLetter || '',
      fullVoucherNumber: sale.number || '',
      items: (sale.items || []).map((item: any) => ({
        productName: item.productName || item.name || item.description || '',
        description: item.description !== item.productName ? item.description : undefined,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice || item.price) || 0,
        lineTotal: Number(item.total || item.lineTotal) || 0,
      })),
      subtotal: Number(sale.subtotal) || Number(sale.total) || 0,
      discountAmount: Number(sale.discountAmount) || 0,
      taxAmount: Number(sale.taxAmount) || 0,
      totalAmount: Number(sale.totalAmount || sale.total) || 0,
      payments: (sale.payments || []).map((p: any) => ({
        name: p.name || p.method || 'Efectivo',
        amount: Number(p.amount) || 0,
        reference: p.reference || undefined,
      })),
      caeNumber: sale.caeNumber || sale.cae?.number || '',
      caeExpiration: sale.caeExpiration || sale.cae?.expirationDate || '',
      qrData: sale.qrData || '',
      notes: sale.notes || '',
    }
  }
}

/**
 * Selecciona el template correcto basándose en el tipo de template y datos de la venta
 */
const selectTemplate = (templateType: string, saleData: any) => {
  // Si es template legal, seleccionar según el tipo de comprobante
  if (templateType === 'legal') {
    const letter = saleData?.voucherLetter?.toUpperCase()
    if (letter === 'A') {
      return FACTURA_A_80MM
    }
    // Por defecto usar Factura B (también para C y otros)
    return FACTURA_B_80MM
  }

  // Template simple
  return TICKET_VENTA_80MM
}

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

    // 2. Intentar con servicio local (localhost:5555) - PRIORIDAD 1
    try {
      const printService = await import('../services/print-service')

      // Verificar si el servicio está disponible
      const isAvailable = await printService.isServiceRunning()

      if (isAvailable && printData.printerName) {
        // Generar comandos ESC/POS
        const { qzTrayService } = await import('../services/qz-tray')
        const commands = qzTrayService.generateESCPOS(
          printData.business,
          printData.sale,
          printData.template as 'simple' | 'legal'
        )

        const result = await printService.printRaw(printData.printerName, commands)

        if (result.success) {
          return {
            success: true,
            message: 'Impreso correctamente con servicio local',
            method: 'local-service'
          }
        }
      }
    } catch (localError) {
      console.warn('Servicio local no disponible:', localError)
    }

    // 3. Fallback: QZ Tray - PRIORIDAD 2
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
      console.warn('QZ Tray no disponible:', qzError)
    }

    // 4. Último recurso: Impresión HTML (window.print) - PRIORIDAD 3
    try {
      await salesApi.printThermalHTML(printData)

      return {
        success: true,
        message: 'Abriendo diálogo de impresión del navegador',
        method: 'html'
      }
    } catch (htmlError) {
      console.error('Error en fallback HTML:', htmlError)
      throw new Error('No se pudo imprimir el ticket. Ningún método de impresión disponible.')
    }
  },

  // Imprimir usando fallback HTML con el sistema de templates
  printThermalHTML: async (printData: any) => {
    // Seleccionar el template correcto basándose en printData.template
    const templateType = printData.template || 'simple'
    const template = selectTemplate(templateType, printData.sale)

    // Convertir datos al formato TicketData
    const ticketData = convertToTicketData(printData)

    console.log(`🖨️ Imprimiendo con template: ${template.name} (tipo: ${templateType})`)

    // Usar el printService que tiene el sistema de templates completo
    const success = await printService.printTicket(template, ticketData)

    if (!success) {
      throw new Error('Error al preparar la impresión')
    }
  },


  // Obtener PDF de venta
  getPDF: async (id: string) => {
    const response = await api.get(`/sales/${id}/pdf/preview`, {
      responseType: 'blob'
    })
    return response.data
  }
}

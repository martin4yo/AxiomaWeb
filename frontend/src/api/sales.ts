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
      console.warn('QZ Tray no disponible, intentando Print Manager:', qzError)

      // 3. Fallback: Print Manager local (HTTPS)
      const PRINT_MANAGER_URL = 'https://localhost:9100'
      const printResponse = await fetch(`${PRINT_MANAGER_URL}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: printData })
      })

      if (!printResponse.ok) {
        const error = await printResponse.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(error.error || 'Error al imprimir')
      }

      return await printResponse.json()
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

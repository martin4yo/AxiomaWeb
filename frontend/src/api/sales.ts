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
}

export const salesApi = {
  // Crear venta
  createSale: async (data: CreateSaleData) => {
    const response = await api.post('/sales', data)
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
  }
}

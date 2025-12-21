import { api } from '../services/api'

export type StockBehavior = 'NONE' | 'RESERVE' | 'DEDUCT'
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'READY' | 'PARTIALLY_INVOICED' | 'COMPLETED' | 'CANCELLED'

export interface OrderItem {
  productId: string
  quantity: number
  unitPrice?: number
  discountPercent?: number
  taxRate?: number
  description?: string
  quoteItemId?: string // Para conversión desde presupuesto
}

export interface CreateOrderData {
  customerId?: string
  warehouseId?: string
  items: OrderItem[]
  notes?: string
  internalNotes?: string
  expectedDate?: string
  stockBehavior?: StockBehavior
  quoteId?: string // Para conversión desde presupuesto
}

export interface OrderFilters {
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
  customerId?: string
  status?: OrderStatus
  search?: string
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export const ordersApi = {
  // Crear pedido
  createOrder: async (data: CreateOrderData) => {
    const response = await api.post('/orders', data)
    return response.data
  },

  // Listar pedidos
  getOrders: async (filters?: OrderFilters) => {
    const response = await api.get('/orders', { params: filters })
    return response.data
  },

  // Obtener pedido por ID
  getOrderById: async (id: string) => {
    const response = await api.get(`/orders/${id}`)
    return response.data
  },

  // Obtener datos para conversión a venta
  getConversionData: async (id: string) => {
    const response = await api.get(`/orders/${id}/conversion-data`)
    return response.data
  },

  // Actualizar estado
  updateOrderStatus: async (id: string, status: OrderStatus) => {
    const response = await api.patch(`/orders/${id}/status`, { status })
    return response.data
  },

  // Confirmar pedido
  confirmOrder: async (id: string) => {
    const response = await api.post(`/orders/${id}/confirm`)
    return response.data
  },

  // Cancelar pedido
  cancelOrder: async (id: string) => {
    const response = await api.post(`/orders/${id}/cancel`)
    return response.data
  },

  // Registrar conversión de pedido a venta
  recordSaleConversion: async (
    orderId: string,
    itemsConverted: Array<{ orderItemId: string; quantityConverted: number }>,
    saleId: string
  ) => {
    const response = await api.post(`/orders/${orderId}/record-conversion`, {
      itemsConverted,
      saleId
    })
    return response.data
  }
}

// Agregar endpoint de conversión a pedido en quotes
export const quotesOrderApi = {
  // Obtener datos para conversión a pedido
  getOrderConversionData: async (quoteId: string) => {
    const response = await api.get(`/quotes/${quoteId}/order-conversion-data`)
    return response.data
  }
}

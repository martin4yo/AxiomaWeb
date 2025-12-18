import { api } from '../services/api'

export interface QuoteItem {
  productId: string
  quantity: number
  unitPrice?: number
  discountPercent?: number
  taxRate?: number
  description?: string
}

export interface CreateQuoteData {
  customerId?: string
  items: QuoteItem[]
  notes?: string
  termsAndConditions?: string
  internalNotes?: string
  validUntil?: string
  discountPercent?: number
}

export interface QuoteFilters {
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
  customerId?: string
  status?: string
  search?: string
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export const quotesApi = {
  // Crear presupuesto
  createQuote: async (data: CreateQuoteData) => {
    const response = await api.post('/quotes', data)
    return response.data
  },

  // Listar presupuestos
  getQuotes: async (filters?: QuoteFilters) => {
    const response = await api.get('/quotes', { params: filters })
    return response.data
  },

  // Obtener presupuesto por ID
  getQuoteById: async (id: string) => {
    const response = await api.get(`/quotes/${id}`)
    return response.data
  },

  // Obtener datos para conversión a venta
  getConversionData: async (id: string) => {
    const response = await api.get(`/quotes/${id}/conversion-data`)
    return response.data
  },

  // Actualizar estado
  updateQuoteStatus: async (id: string, status: string) => {
    const response = await api.patch(`/quotes/${id}/status`, { status })
    return response.data
  },

  // Cancelar presupuesto
  cancelQuote: async (id: string) => {
    const response = await api.post(`/quotes/${id}/cancel`)
    return response.data
  },

  // Registrar conversión de presupuesto a venta
  recordSaleConversion: async (quoteId: string, itemsConverted: Array<{ quoteItemId: string; quantityConverted: number }>) => {
    const response = await api.post(`/quotes/${quoteId}/record-conversion`, { itemsConverted })
    return response.data
  }
}

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
  },

  // Obtener PDF del presupuesto
  getPDF: async (id: string) => {
    const response = await api.get(`/quotes/${id}/pdf`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Descargar PDF (abre en nueva pestaña o descarga)
  downloadPDF: async (id: string, quoteNumber: string) => {
    const response = await api.get(`/quotes/${id}/pdf`, {
      responseType: 'blob'
    })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Presupuesto-${quoteNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  // Enviar presupuesto por email
  sendEmail: async (id: string, email: string) => {
    const response = await api.post(`/quotes/${id}/send-email`, { email })
    return response.data
  }
}

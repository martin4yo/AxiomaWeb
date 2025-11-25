import { api } from '@/services/api'

export interface SalesByProduct {
  id: string
  sku: string
  name: string
  total_quantity: string
  total_amount: string
  sales_count: number
}

export interface CollectionsByPaymentMethod {
  id: string
  name: string
  payment_type: string
  total_amount: string
  payment_count: number
}

export interface SalesSummary {
  total_sales: number
  total_amount: string
  average_sale: string
  paid_amount: string
  pending_amount: string
}

export interface SalesEvolution {
  date: string
  product_id: string
  product_name: string
  amount: string
}

export const reportsApi = {
  getSalesByProduct: async (dateFrom: string, dateTo: string) => {
    const response = await api.get<{ salesByProduct: SalesByProduct[] }>(
      `/reports/sales-by-product?dateFrom=${dateFrom}&dateTo=${dateTo}`
    )
    return response.data
  },

  getCollectionsByPaymentMethod: async (dateFrom: string, dateTo: string) => {
    const response = await api.get<{ collectionsByPaymentMethod: CollectionsByPaymentMethod[] }>(
      `/reports/collections-by-payment-method?dateFrom=${dateFrom}&dateTo=${dateTo}`
    )
    return response.data
  },

  getSalesSummary: async (dateFrom: string, dateTo: string) => {
    const response = await api.get<{ summary: SalesSummary }>(
      `/reports/sales-summary?dateFrom=${dateFrom}&dateTo=${dateTo}`
    )
    return response.data
  },

  getSalesEvolution: async (dateFrom: string, dateTo: string) => {
    const response = await api.get<{ salesEvolution: SalesEvolution[] }>(
      `/reports/sales-evolution?dateFrom=${dateFrom}&dateTo=${dateTo}`
    )
    return response.data
  }
}

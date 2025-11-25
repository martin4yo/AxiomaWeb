import { api } from './api'

export interface DashboardStats {
  salesOfMonth: {
    total: number
    count: number
    change: string
    changeType: 'positive' | 'negative'
  }
  customers: {
    total: number
  }
  products: {
    total: number
    lowStock: number
  }
}

export interface RecentSale {
  id: string
  documentType: string
  documentCode: string
  saleNumber: string
  customerName: string
  totalAmount: number
  saleDate: string
  status: string
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/dashboard/stats')
    return response.data
  },

  async getRecentSales(): Promise<RecentSale[]> {
    const response = await api.get<RecentSale[]>('/dashboard/recent-sales')
    return response.data
  },
}

import { api } from '@/services/api'

export interface TopProduct {
  id: string
  sku: string
  name: string
  sale_price: string
  current_stock: string
  total_quantity_sold: string
  sales_count: number
}

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  salePrice: number
  costPrice: number
  currentStock: number
  minStock: number
  trackStock: boolean
  isActive: boolean
}

export const productsApi = {
  getTopSelling: async (limit: number = 5) => {
    const response = await api.get<{ products: TopProduct[] }>(`/products/top-selling?limit=${limit}`)
    return response.data
  },

  getProducts: async () => {
    const response = await api.get<{ products: Product[] }>(`/products`)
    return response.data.products
  }
}

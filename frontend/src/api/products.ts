import { api } from '../services/api'

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  category?: string
  brand?: string
  costPrice: number
  salePrice: number
  currency: string
  trackStock: boolean
  currentStock: number
  minStock: number
  metadata: any
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProductData {
  sku: string
  name: string
  description?: string
  category?: string
  brand?: string
  costPrice: number
  salePrice: number
  currency?: string
  trackStock?: boolean
  currentStock?: number
  minStock?: number
  metadata?: any
}

class ProductApi {
  async getProducts(tenantSlug: string): Promise<Product[]> {
    const response = await api.get(`/${tenantSlug}/products`)
    return response.data
  }

  async getProduct(tenantSlug: string, id: string): Promise<Product> {
    const response = await api.get(`/${tenantSlug}/products/${id}`)
    return response.data
  }

  async createProduct(tenantSlug: string, data: CreateProductData): Promise<Product> {
    const response = await api.post(`/${tenantSlug}/products`, data)
    return response.data
  }

  async updateProduct(tenantSlug: string, id: string, data: Partial<CreateProductData>): Promise<Product> {
    const response = await api.put(`/${tenantSlug}/products/${id}`, data)
    return response.data
  }

  async deleteProduct(tenantSlug: string, id: string): Promise<void> {
    await api.delete(`/${tenantSlug}/products/${id}`)
  }
}

export const productApi = new ProductApi()
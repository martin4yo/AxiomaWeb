import { api } from '@/services/api'

export interface ProductBrand {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProductBrandData {
  name: string
  description?: string
  isActive?: boolean
}

export interface UpdateProductBrandData extends Partial<CreateProductBrandData> {}

export const productBrandsApi = {
  // Get all brands
  getAll: async (tenantSlug: string, search?: string): Promise<ProductBrand[]> => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)

    const response = await api.get(`/${tenantSlug}/product-brands?${params}`)
    return response.data.brands || []
  },

  // Get brand by ID
  getById: async (tenantSlug: string, id: string): Promise<ProductBrand> => {
    const response = await api.get(`/${tenantSlug}/product-brands/${id}`)
    return response.data.brand
  },

  // Create brand
  create: async (tenantSlug: string, data: CreateProductBrandData): Promise<ProductBrand> => {
    const response = await api.post(`/${tenantSlug}/product-brands`, data)
    return response.data.brand
  },

  // Update brand
  update: async (tenantSlug: string, id: string, data: UpdateProductBrandData): Promise<ProductBrand> => {
    const response = await api.put(`/${tenantSlug}/product-brands/${id}`, data)
    return response.data.brand
  },

  // Delete brand
  delete: async (tenantSlug: string, id: string): Promise<void> => {
    await api.delete(`/${tenantSlug}/product-brands/${id}`)
  }
}
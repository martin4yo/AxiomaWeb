import { api } from '@/services/api'

export interface ProductCategory {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProductCategoryData {
  name: string
  description?: string
  isActive?: boolean
}

export interface UpdateProductCategoryData extends Partial<CreateProductCategoryData> {}

export const productCategoriesApi = {
  // Get all categories
  getAll: async (tenantSlug: string, search?: string): Promise<ProductCategory[]> => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)

    const response = await api.get(`/${tenantSlug}/product-categories?${params}`)
    return response.data.categories || []
  },

  // Get category by ID
  getById: async (tenantSlug: string, id: string): Promise<ProductCategory> => {
    const response = await api.get(`/${tenantSlug}/product-categories/${id}`)
    return response.data.category
  },

  // Create category
  create: async (tenantSlug: string, data: CreateProductCategoryData): Promise<ProductCategory> => {
    const response = await api.post(`/${tenantSlug}/product-categories`, data)
    return response.data.category
  },

  // Update category
  update: async (tenantSlug: string, id: string, data: UpdateProductCategoryData): Promise<ProductCategory> => {
    const response = await api.put(`/${tenantSlug}/product-categories/${id}`, data)
    return response.data.category
  },

  // Delete category
  delete: async (tenantSlug: string, id: string): Promise<void> => {
    await api.delete(`/${tenantSlug}/product-categories/${id}`)
  }
}
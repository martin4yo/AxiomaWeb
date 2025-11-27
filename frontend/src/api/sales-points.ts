import { api } from '../services/api'

export interface SalesPoint {
  id: string
  tenantId: string
  branchId?: string | null
  number: number
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  branch?: {
    id: string
    code: string
    name: string
  }
}

export interface CreateSalesPointData {
  number: number
  name: string
  description?: string
  branchId?: string | null
  isActive?: boolean
}

export interface UpdateSalesPointData extends Partial<CreateSalesPointData> {}

export const salesPointsApi = {
  async getAll(tenantSlug: string): Promise<SalesPoint[]> {
    const response = await api.get(`/${tenantSlug}/sales-points`)
    return response.data.salesPoints
  },

  async getById(tenantSlug: string, id: string): Promise<SalesPoint> {
    const response = await api.get(`/${tenantSlug}/sales-points/${id}`)
    return response.data.salesPoint
  },

  async create(tenantSlug: string, data: CreateSalesPointData): Promise<SalesPoint> {
    const response = await api.post(`/${tenantSlug}/sales-points`, data)
    return response.data.salesPoint
  },

  async update(tenantSlug: string, id: string, data: UpdateSalesPointData): Promise<SalesPoint> {
    const response = await api.put(`/${tenantSlug}/sales-points/${id}`, data)
    return response.data.salesPoint
  },

  async delete(tenantSlug: string, id: string): Promise<void> {
    await api.delete(`/${tenantSlug}/sales-points/${id}`)
  }
}

import { api } from '../services/api'

export interface Branch {
  id: string
  tenantId: string
  code: string
  name: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  phone?: string
  email?: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateBranchData {
  code: string
  name: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  phone?: string
  email?: string
  isDefault?: boolean
  isActive?: boolean
}

export interface UpdateBranchData extends Partial<CreateBranchData> {}

export const branchesApi = {
  async getAll(tenantSlug: string): Promise<Branch[]> {
    const response = await api.get(`/${tenantSlug}/branches`)
    return response.data.branches
  },

  async getById(tenantSlug: string, id: string): Promise<Branch> {
    const response = await api.get(`/${tenantSlug}/branches/${id}`)
    return response.data.branch
  },

  async create(tenantSlug: string, data: CreateBranchData): Promise<Branch> {
    const response = await api.post(`/${tenantSlug}/branches`, data)
    return response.data.branch
  },

  async update(tenantSlug: string, id: string, data: UpdateBranchData): Promise<Branch> {
    const response = await api.put(`/${tenantSlug}/branches/${id}`, data)
    return response.data.branch
  },

  async delete(tenantSlug: string, id: string): Promise<void> {
    await api.delete(`/${tenantSlug}/branches/${id}`)
  }
}

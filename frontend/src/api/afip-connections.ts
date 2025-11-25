import { api } from '../services/api'

export interface AfipConnection {
  id: string
  tenantId: string
  name: string
  description?: string
  cuit: string
  environment: 'testing' | 'production'
  certificate?: string
  privateKey?: string
  wsaaUrl?: string
  wsfeUrl?: string
  timeout?: number
  isActive: boolean
  lastTest?: string
  lastTestStatus?: 'success' | 'error'
  createdAt: string
  updatedAt: string
}

export interface CreateAfipConnectionData {
  name: string
  description?: string
  cuit: string
  environment: 'testing' | 'production'
  certificate?: string
  privateKey?: string
  wsaaUrl?: string
  wsfeUrl?: string
  timeout?: number
  isActive?: boolean
}

export interface UpdateAfipConnectionData extends Partial<CreateAfipConnectionData> {}

export const afipConnectionsApi = {
  async getAll(tenantSlug: string): Promise<AfipConnection[]> {
    const response = await api.get(`/${tenantSlug}/afip-connections`)
    return response.data.connections
  },

  async getById(tenantSlug: string, id: string): Promise<AfipConnection> {
    const response = await api.get(`/${tenantSlug}/afip-connections/${id}`)
    return response.data.connection
  },

  async create(tenantSlug: string, data: CreateAfipConnectionData): Promise<AfipConnection> {
    const response = await api.post(`/${tenantSlug}/afip-connections`, data)
    return response.data.connection
  },

  async update(tenantSlug: string, id: string, data: UpdateAfipConnectionData): Promise<AfipConnection> {
    const response = await api.put(`/${tenantSlug}/afip-connections/${id}`, data)
    return response.data.connection
  },

  async delete(tenantSlug: string, id: string): Promise<void> {
    await api.delete(`/${tenantSlug}/afip-connections/${id}`)
  },

  async testConnection(tenantSlug: string, id: string): Promise<any> {
    const response = await api.post(`/${tenantSlug}/afip-connections/${id}/test`)
    return response.data
  }
}

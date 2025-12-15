import { api } from '../services/api'

export interface Tenant {
  id: string
  name: string
  slug: string
  planType: 'free' | 'basic' | 'premium'
  status: 'active' | 'inactive' | 'suspended'
  settings: {
    currency: string
    timezone: string
    dateFormat: string
  }
  businessName?: string
  cuit?: string
  address?: string
  phone?: string
  email?: string
  // Datos fiscales
  grossIncomeNumber?: string
  activityStartDate?: string
  vatConditionId?: string
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
  }
}

export interface CreateTenantData {
  name: string
  slug: string
  planType?: 'free' | 'basic' | 'premium'
  status?: 'active' | 'inactive' | 'suspended'
  settings?: {
    currency?: string
    timezone?: string
    dateFormat?: string
  }
  businessName?: string | null
  cuit?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  grossIncomeNumber?: string | null
  activityStartDate?: string | null
  vatConditionId?: string | null
}

export interface UpdateTenantData {
  name?: string
  slug?: string
  planType?: 'free' | 'basic' | 'premium'
  status?: 'active' | 'inactive' | 'suspended'
  settings?: {
    currency?: string
    timezone?: string
    dateFormat?: string
  }
  businessName?: string | null
  cuit?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  grossIncomeNumber?: string | null
  activityStartDate?: string | null
  vatConditionId?: string | null
}

export const tenantsApi = {
  getTenants: async (tenantSlug: string) => {
    const response = await api.get<{ tenants: Tenant[] }>(`/${tenantSlug}/tenants`)
    return response.data.tenants
  },

  getTenant: async (tenantSlug: string, id: string) => {
    const response = await api.get<{ tenant: Tenant }>(`/${tenantSlug}/tenants/${id}`)
    return response.data.tenant
  },

  createTenant: async (tenantSlug: string, data: CreateTenantData) => {
    const response = await api.post<{ tenant: Tenant }>(`/${tenantSlug}/tenants`, data)
    return response.data.tenant
  },

  updateTenant: async (tenantSlug: string, id: string, data: UpdateTenantData) => {
    const response = await api.put<{ tenant: Tenant }>(`/${tenantSlug}/tenants/${id}`, data)
    return response.data.tenant
  },

  deleteTenant: async (tenantSlug: string, id: string) => {
    const response = await api.delete<{ tenant: Tenant }>(`/${tenantSlug}/tenants/${id}`)
    return response.data.tenant
  },

  getTenantUsers: async (tenantSlug: string, tenantId: string) => {
    const response = await api.get(`/${tenantSlug}/tenants/${tenantId}/users`)
    return response.data.users
  },

  assignUserToTenant: async (tenantSlug: string, tenantId: string, userId: string, role: string = 'user') => {
    const response = await api.post(`/${tenantSlug}/tenants/${tenantId}/users`, { userId, role })
    return response.data
  },

  removeUserFromTenant: async (tenantSlug: string, tenantId: string, tenantUserId: string) => {
    const response = await api.delete(`/${tenantSlug}/tenants/${tenantId}/users/${tenantUserId}`)
    return response.data
  },
}

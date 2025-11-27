import { api } from '../services/api'

export interface VoucherConfiguration {
  id: string
  tenantId: string
  voucherTypeId: string
  branchId?: string | null
  afipConnectionId?: string | null
  salesPointId?: string | null
  nextVoucherNumber: number
  createdAt: string
  updatedAt: string
  voucherType?: {
    id: string
    code: string
    name: string
    letter: string
    documentClass: string
    afipCode?: number
    requiresCae: boolean
  }
  branch?: {
    id: string
    code: string
    name: string
  }
  afipConnection?: {
    id: string
    name: string
    cuit: string
    environment: string
  }
  salesPoint?: {
    id: string
    number: number
    name: string
  }
}

export interface CreateVoucherConfigData {
  voucherTypeId: string
  branchId?: string | null
  afipConnectionId?: string | null
  salesPointId?: string | null
  nextVoucherNumber?: number
}

export interface UpdateVoucherConfigData extends Partial<CreateVoucherConfigData> {}

export const voucherConfigurationsApi = {
  async getAll(tenantSlug: string): Promise<VoucherConfiguration[]> {
    const response = await api.get(`/${tenantSlug}/voucher-configurations`)
    return response.data.configurations
  },

  async getById(tenantSlug: string, id: string): Promise<VoucherConfiguration> {
    const response = await api.get(`/${tenantSlug}/voucher-configurations/${id}`)
    return response.data.configuration
  },

  async create(tenantSlug: string, data: CreateVoucherConfigData): Promise<VoucherConfiguration> {
    const response = await api.post(`/${tenantSlug}/voucher-configurations`, data)
    return response.data.configuration
  },

  async update(tenantSlug: string, id: string, data: UpdateVoucherConfigData): Promise<VoucherConfiguration> {
    const response = await api.put(`/${tenantSlug}/voucher-configurations/${id}`, data)
    return response.data.configuration
  },

  async delete(tenantSlug: string, id: string): Promise<void> {
    await api.delete(`/${tenantSlug}/voucher-configurations/${id}`)
  },

  async checkAfipNumber(tenantSlug: string, id: string): Promise<{
    success: boolean
    localNumber: number
    dbNumber?: number
    afipNumber?: number
    maxNumber?: number
    nextSuggested?: number
    wasUpdated?: boolean
    newLocalNumber?: number
    error?: string
  }> {
    const response = await api.post(`/${tenantSlug}/voucher-configurations/${id}/check-afip-number`)
    return response.data
  }
}

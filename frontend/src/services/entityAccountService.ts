import { api } from './api'

export interface EntityBalance {
  entityId: string
  entityName: string
  entityCode: string | null
  currentBalance: number
  totalDebits: number
  totalCredits: number
  movementCount: number
  lastMovementDate: string | null
}

export interface EntityMovement {
  id: string
  date: string
  type: string
  nature: string
  description: string
  debit: number
  credit: number
  balance: number
  documentNumber?: string
  reference?: string
  paymentMethod?: string
  notes?: string
}

export interface EntityAccountSummary {
  openingBalance: number
  totalDebits: number
  totalCredits: number
  closingBalance: number
}

export interface EntityMovementsResponse {
  movements: EntityMovement[]
  summary: EntityAccountSummary
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface EntityStatementResponse {
  entity: {
    id: string
    name: string
    code: string | null
    email: string | null
    phone: string | null
    addressLine1: string | null
    city: string | null
    isCustomer: boolean
    isSupplier: boolean
  }
  movements: EntityMovement[]
  summary: EntityAccountSummary
}

export interface RegisterPaymentInput {
  type: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT'
  amount: number
  paymentMethodId: string
  paymentMethodName: string
  date: string
  reference?: string
  referenceDate?: string
  notes?: string
}

export interface CreateMovementInput {
  type: 'ADJUSTMENT' | 'INITIAL_BALANCE' | 'CREDIT_NOTE' | 'DEBIT_NOTE'
  nature: 'DEBIT' | 'CREDIT'
  amount: number
  date: string
  description?: string
  notes?: string
}

export interface PendingDocument {
  id: string
  documentNumber: string
  date: string
  type: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  paymentStatus: string
}

export const entityAccountService = {
  /**
   * Obtener saldo de todas las entidades
   */
  async getEntitiesWithBalance(filters?: {
    isCustomer?: boolean
    isSupplier?: boolean
    hasBalance?: boolean
    search?: string
  }): Promise<EntityBalance[]> {
    const params = new URLSearchParams()
    if (filters?.isCustomer !== undefined) params.append('isCustomer', String(filters.isCustomer))
    if (filters?.isSupplier !== undefined) params.append('isSupplier', String(filters.isSupplier))
    if (filters?.hasBalance !== undefined) params.append('hasBalance', String(filters.hasBalance))
    if (filters?.search) params.append('search', filters.search)

    const response = await api.get<EntityBalance[]>(`/entity-accounts?${params}`)
    return response.data
  },

  /**
   * Obtener saldo de una entidad específica
   */
  async getEntityBalance(entityId: string): Promise<EntityBalance> {
    const response = await api.get<EntityBalance>(`/entity-accounts/${entityId}/balance`)
    return response.data
  },

  /**
   * Obtener movimientos de una entidad
   */
  async getEntityMovements(
    entityId: string,
    filters?: {
      dateFrom?: string
      dateTo?: string
      type?: string
      page?: number
      limit?: number
    }
  ): Promise<EntityMovementsResponse> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.append('dateTo', filters.dateTo)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))

    const response = await api.get<EntityMovementsResponse>(`/entity-accounts/${entityId}/movements?${params}`)
    return response.data
  },

  /**
   * Obtener estado de cuenta completo (para exportar)
   */
  async getEntityStatement(
    entityId: string,
    filters?: {
      dateFrom?: string
      dateTo?: string
    }
  ): Promise<EntityStatementResponse> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.append('dateTo', filters.dateTo)

    const response = await api.get<EntityStatementResponse>(`/entity-accounts/${entityId}/statement?${params}`)
    return response.data
  },

  /**
   * Registrar un pago (cobro de cliente o pago a proveedor)
   */
  async registerPayment(entityId: string, data: RegisterPaymentInput): Promise<any> {
    const response = await api.post(`/entity-accounts/${entityId}/payments`, data)
    return response.data
  },

  /**
   * Crear un movimiento manual
   */
  async createMovement(entityId: string, data: CreateMovementInput): Promise<any> {
    const response = await api.post(`/entity-accounts/${entityId}/movements`, data)
    return response.data
  },

  /**
   * Obtener comprobantes pendientes de pago
   */
  async getPendingDocuments(entityId: string, type: 'customer' | 'supplier'): Promise<PendingDocument[]> {
    const response = await api.get<PendingDocument[]>(`/entity-accounts/${entityId}/pending?type=${type}`)
    return response.data
  },
}

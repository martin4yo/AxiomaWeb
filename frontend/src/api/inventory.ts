import { api } from '../services/api'

export interface Warehouse {
  id: string
  code: string
  name: string
  description?: string
  address?: string
  isActive: boolean
  isDefault: boolean
}

export interface WarehouseStock {
  id: string
  warehouseId: string
  productId: string
  quantity: number
  reservedQty: number
  availableQty: number
  lastMovement?: string
  warehouse: Warehouse
  product: any
}

export interface StockMovement {
  id: string
  warehouseId: string
  productId: string
  movementType: 'IN' | 'OUT' | 'TRANSFER'
  quantity: number
  unitCost?: number
  totalCost?: number
  documentType?: string
  documentId?: string
  referenceNumber?: string
  notes?: string
  createdAt: string
  warehouse: Warehouse
  product: any
  user: any
}

export interface StockAdjustment {
  id: string
  adjustmentNumber: string
  warehouseId: string
  adjustmentDate: string
  reason: string
  status: 'draft' | 'approved' | 'cancelled'
  notes?: string
  totalValue: number
  warehouse: Warehouse
  creator: any
  items: StockAdjustmentItem[]
}

export interface StockAdjustmentItem {
  id: string
  productId: string
  currentQty: number
  adjustedQty: number
  difference: number
  unitCost: number
  totalValue: number
  reason?: string
}

export interface CreateMovementData {
  warehouseId: string
  productId: string
  movementType: 'IN' | 'OUT'
  quantity: number
  unitCost?: number
  documentType?: string
  documentId?: string
  referenceNumber?: string
  notes?: string
}

export interface CreateAdjustmentData {
  warehouseId: string
  reason: string
  notes?: string
  items: {
    productId: string
    currentQty: number
    adjustedQty: number
    unitCost: number
    reason?: string
  }[]
}

class InventoryApi {
  // Almacenes
  async getWarehouses(tenantSlug: string): Promise<Warehouse[]> {
    const response = await api.get(`/${tenantSlug}/inventory/warehouses`)
    return response.data
  }

  async getWarehouse(tenantSlug: string, id: string): Promise<Warehouse> {
    const response = await api.get(`/${tenantSlug}/inventory/warehouses/${id}`)
    return response.data
  }

  async createWarehouse(tenantSlug: string, data: Partial<Warehouse>): Promise<Warehouse> {
    const response = await api.post(`/${tenantSlug}/inventory/warehouses`, data)
    return response.data
  }

  async updateWarehouse(tenantSlug: string, id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    const response = await api.put(`/${tenantSlug}/inventory/warehouses/${id}`, data)
    return response.data
  }

  async deleteWarehouse(tenantSlug: string, id: string): Promise<void> {
    await api.delete(`/${tenantSlug}/inventory/warehouses/${id}`)
  }

  // Stock
  async getStock(tenantSlug: string, filters?: { warehouseId?: string; productId?: string }): Promise<WarehouseStock[]> {
    const params = new URLSearchParams()
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId)
    if (filters?.productId) params.append('productId', filters.productId)

    const response = await api.get(`/${tenantSlug}/inventory/stock?${params}`)
    return response.data
  }

  async getProductStock(tenantSlug: string, productId: string) {
    const response = await api.get(`/${tenantSlug}/inventory/stock/product/${productId}`)
    return response.data
  }

  async getWarehouseStock(tenantSlug: string, warehouseId: string): Promise<WarehouseStock[]> {
    const response = await api.get(`/${tenantSlug}/inventory/stock/warehouse/${warehouseId}`)
    return response.data
  }

  async getLowStock(tenantSlug: string) {
    const response = await api.get(`/${tenantSlug}/inventory/stock/low`)
    return response.data
  }

  // Movimientos
  async getMovements(tenantSlug: string, filters?: {
    startDate?: string
    endDate?: string
    warehouseId?: string
    productId?: string
    movementType?: string
  }): Promise<StockMovement[]> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId)
    if (filters?.productId) params.append('productId', filters.productId)
    if (filters?.movementType) params.append('movementType', filters.movementType)

    const response = await api.get(`/${tenantSlug}/inventory/movements?${params}`)
    return response.data
  }

  async getMovement(tenantSlug: string, id: string): Promise<StockMovement> {
    const response = await api.get(`/${tenantSlug}/inventory/movements/${id}`)
    return response.data
  }

  async createMovement(tenantSlug: string, data: CreateMovementData): Promise<StockMovement> {
    const response = await api.post(`/${tenantSlug}/inventory/movements`, data)
    return response.data
  }

  // Ajustes
  async getAdjustments(tenantSlug: string): Promise<StockAdjustment[]> {
    const response = await api.get(`/${tenantSlug}/inventory/adjustments`)
    return response.data
  }

  async getAdjustment(tenantSlug: string, id: string): Promise<StockAdjustment> {
    const response = await api.get(`/${tenantSlug}/inventory/adjustments/${id}`)
    return response.data
  }

  async createAdjustment(tenantSlug: string, data: CreateAdjustmentData): Promise<StockAdjustment> {
    const response = await api.post(`/${tenantSlug}/inventory/adjustments`, data)
    return response.data
  }

  async approveAdjustment(tenantSlug: string, id: string): Promise<StockAdjustment> {
    const response = await api.put(`/${tenantSlug}/inventory/adjustments/${id}/approve`)
    return response.data
  }

  async cancelAdjustment(tenantSlug: string, id: string): Promise<StockAdjustment> {
    const response = await api.put(`/${tenantSlug}/inventory/adjustments/${id}/cancel`)
    return response.data
  }

  // Reportes
  async getInventoryValuation(tenantSlug: string, warehouseId?: string) {
    const params = warehouseId ? `?warehouseId=${warehouseId}` : ''
    const response = await api.get(`/${tenantSlug}/inventory/reports/valuation${params}`)
    return response.data
  }

  async getMovementsSummary(tenantSlug: string, filters: {
    startDate: string
    endDate: string
  }) {
    const params = new URLSearchParams()
    params.append('startDate', filters.startDate)
    params.append('endDate', filters.endDate)

    const response = await api.get(`/${tenantSlug}/inventory/reports/movements-summary?${params}`)
    return response.data
  }

  async getProductKardex(tenantSlug: string, productId: string, filters?: {
    startDate?: string
    endDate?: string
    warehouseId?: string
  }) {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId)

    const response = await api.get(`/${tenantSlug}/inventory/reports/kardex/${productId}?${params}`)
    return response.data
  }
}

export const inventoryApi = new InventoryApi()
// Auth types
export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export interface Tenant {
  id: string
  slug: string
  name: string
  role?: string
}

export interface AuthState {
  user: User | null
  tenants: Tenant[]
  currentTenant: Tenant | null
  token: string | null
  isAuthenticated: boolean
}

// Entity types
export interface Entity {
  id: string
  code: string | null
  name: string
  taxId: string | null
  email: string | null
  phone: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string
  entityType: 'CLIENT' | 'SUPPLIER' | 'BOTH'
  category: string | null
  currency: string
  paymentTermsDays: number
  creditLimit: number
  metadata: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Product types
export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  category: string | null
  brand: string | null
  costPrice: number
  salePrice: number
  currency: string
  trackStock: boolean
  currentStock: number
  minStock: number
  metadata: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Document types
export interface DocumentType {
  id: string
  code: string
  name: string
  category: string
  config: Record<string, any>
  workflowConfig: Record<string, any>
  isActive: boolean
}

export interface DocumentItem {
  id: string
  lineNumber: number
  productId: string | null
  productSku: string | null
  description: string
  quantity: number
  unitPrice: number
  discountPercent: number
  lineTotal: number
  taxRate: number
  taxAmount: number
  metadata: Record<string, any>
  product?: Product
}

export interface Document {
  id: string
  documentTypeId: string
  number: string
  displayNumber: string | null
  documentDate: string
  dueDate: string | null
  entityId: string | null
  entityName: string | null
  subtotal: number
  taxAmount: number
  totalAmount: number
  currency: string
  status: string
  workflowStage: string | null
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  documentType?: DocumentType
  entity?: Entity
  items?: DocumentItem[]
  creator?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  email: string
  password: string
  firstName?: string
  lastName?: string
  tenantName: string
  tenantSlug: string
}

export interface EntityForm {
  code?: string
  name: string
  taxId?: string
  email?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country: string
  entityType: 'CLIENT' | 'SUPPLIER' | 'BOTH'
  category?: string
  currency: string
  paymentTermsDays: number
  creditLimit: number
}

export interface ProductForm {
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
}
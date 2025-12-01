import { api as axios } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface PurchaseItem {
  productId: string;
  productSku?: string;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRate?: number;
}

export interface PurchasePayment {
  paymentMethodId: string;
  amount: number;
  reference?: string;
  referenceDate?: string;
  notes?: string;
}

export interface CreatePurchaseData {
  supplierId: string;
  warehouseId: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  items: PurchaseItem[];
  payments?: PurchasePayment[];
  discountPercent?: number;
  notes?: string;
}

export interface AddPaymentData {
  paymentMethodId: string;
  amount: number;
  reference?: string;
  referenceDate?: string;
  notes?: string;
}

export const purchasesApi = {
  async create(tenantSlug: string, data: CreatePurchaseData) {
    const response = await axios.post(`${API_URL}/${tenantSlug}/purchases`, data);
    return response.data;
  },

  async getAll(
    tenantSlug: string,
    params?: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      supplierId?: string;
      paymentStatus?: string;
      search?: string;
    }
  ) {
    const response = await axios.get(`${API_URL}/${tenantSlug}/purchases`, { params });
    return response.data;
  },

  async getById(tenantSlug: string, id: string) {
    const response = await axios.get(`${API_URL}/${tenantSlug}/purchases/${id}`);
    return response.data;
  },

  async addPayment(tenantSlug: string, id: string, data: AddPaymentData) {
    const response = await axios.post(`${API_URL}/${tenantSlug}/purchases/${id}/payments`, data);
    return response.data;
  },

  async cancel(tenantSlug: string, id: string) {
    const response = await axios.put(`${API_URL}/${tenantSlug}/purchases/${id}/cancel`);
    return response.data;
  },
};

export const supplierAccountsApi = {
  async getAllBalances(
    tenantSlug: string,
    params?: {
      search?: string;
      hasDebt?: boolean;
    }
  ) {
    const response = await axios.get(`${API_URL}/${tenantSlug}/supplier-accounts`, { params });
    return response.data;
  },

  async getBalance(tenantSlug: string, supplierId: string) {
    const response = await axios.get(`${API_URL}/${tenantSlug}/supplier-accounts/${supplierId}/balance`);
    return response.data;
  },

  async getMovements(
    tenantSlug: string,
    supplierId: string,
    params?: {
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const response = await axios.get(`${API_URL}/${tenantSlug}/supplier-accounts/${supplierId}/movements`, {
      params,
    });
    return response.data;
  },

  async getPendingPurchases(tenantSlug: string, supplierId: string) {
    const response = await axios.get(`${API_URL}/${tenantSlug}/supplier-accounts/${supplierId}/pending`);
    return response.data;
  },

  async getSummary(tenantSlug: string) {
    const response = await axios.get(`${API_URL}/${tenantSlug}/supplier-accounts/summary`);
    return response.data;
  },
};

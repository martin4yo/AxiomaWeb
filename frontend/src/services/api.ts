import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    console.log('🔍 Axios Interceptor - Debug:', {
      token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
      url: config.url,
      method: config.method,
      hasAuthHeader: !!config.headers.Authorization
    })
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('✅ Token added to request')
    } else {
      console.warn('⚠️ No token found in store')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Tenant-scoped API helper
export const createTenantApi = (tenantSlug: string) => {
  return {
    get: <T>(url: string, config?: any) =>
      api.get<T>(`/${tenantSlug}${url}`, config),
    post: <T>(url: string, data?: any, config?: any) =>
      api.post<T>(`/${tenantSlug}${url}`, data, config),
    put: <T>(url: string, data?: any, config?: any) =>
      api.put<T>(`/${tenantSlug}${url}`, data, config),
    patch: <T>(url: string, data?: any, config?: any) =>
      api.patch<T>(`/${tenantSlug}${url}`, data, config),
    delete: <T>(url: string, config?: any) =>
      api.delete<T>(`/${tenantSlug}${url}`, config),
  }
}
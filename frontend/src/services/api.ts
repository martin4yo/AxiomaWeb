import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { useErrorStore } from '@/stores/errorStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 segundos - necesario para operaciones con AFIP
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and tenant slug
api.interceptors.request.use(
  (config) => {
    const authState = useAuthStore.getState()
    const token = authState.token
    const currentTenant = authState.currentTenant

    // Add tenant slug to URL (except for auth endpoints)
    if (currentTenant && config.url && !config.url.startsWith('/auth')) {
      // Only add tenant slug if not already present
      if (!config.url.includes(`/${currentTenant.slug}/`)) {
        config.url = `/${currentTenant.slug}${config.url}`
      }
    }

    // Add auth token
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa, limpiar el error de conexión
    useErrorStore.getState().setConnectionError(false)
    return response
  },
  (error) => {
    // Detectar errores de conexión
    if (!error.response) {
      // Network error, timeout, or server down
      console.error('[API] Error de conexión:', error.message)
      useErrorStore.getState().setConnectionError(true)
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      // Ignorar 401 en rutas de autenticación (login/register)
      const url = error.config?.url || ''
      const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register')

      if (!isAuthRoute) {
        // Token expired or invalid - redirect to login
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    // Tenant not found - redirect to login
    if (error.response?.status === 404 && error.response?.data?.error === 'Tenant not found') {
      console.warn('[API] Tenant no encontrado, redirigiendo al login')
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
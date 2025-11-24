import { api } from './api'
import type { LoginForm, RegisterForm, User, Tenant } from '@/types'

export interface LoginResponse {
  message: string
  token: string
  user: User
  tenants: Tenant[]
}

export interface RegisterResponse {
  message: string
  token: string
  user: User
  tenant: Tenant
}

export interface ProfileResponse {
  user: User
  tenants: Tenant[]
}

export const authService = {
  async login(credentials: LoginForm): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    return response.data
  },

  async register(data: RegisterForm): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', data)
    return response.data
  },

  async getProfile(): Promise<ProfileResponse> {
    const response = await api.get<ProfileResponse>('/auth/profile')
    return response.data
  },

  async refreshProfile(): Promise<ProfileResponse> {
    const response = await api.get<ProfileResponse>('/auth/profile')
    return response.data
  },
}
import { api } from '../services/api'

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'superadmin' | 'admin' | 'user'
  permissions: string[]
  isActive: boolean
  createdAt: string
}

export interface CreateUserData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role?: 'superadmin' | 'admin' | 'user'
  permissions?: string[]
  isActive?: boolean
}

export interface UpdateUserData {
  email?: string
  firstName?: string
  lastName?: string
  role?: 'superadmin' | 'admin' | 'user'
  permissions?: string[]
  isActive?: boolean
}

export const usersApi = {
  getUsers: async (tenantSlug: string) => {
    const response = await api.get<{ users: User[] }>(`/${tenantSlug}/users`)
    return response.data.users
  },

  getUser: async (tenantSlug: string, id: string) => {
    const response = await api.get<{ user: User }>(`/${tenantSlug}/users/${id}`)
    return response.data.user
  },

  createUser: async (tenantSlug: string, data: CreateUserData) => {
    const response = await api.post<{ user: User }>(`/${tenantSlug}/users`, data)
    return response.data.user
  },

  updateUser: async (tenantSlug: string, id: string, data: UpdateUserData) => {
    const response = await api.put<{ user: User }>(`/${tenantSlug}/users/${id}`, data)
    return response.data.user
  },

  deleteUser: async (tenantSlug: string, id: string) => {
    const response = await api.delete<{ message: string }>(`/${tenantSlug}/users/${id}`)
    return response.data
  },

  changePassword: async (tenantSlug: string, id: string, newPassword: string) => {
    const response = await api.put<{ message: string }>(
      `/${tenantSlug}/users/${id}/password`,
      { newPassword }
    )
    return response.data
  },

  getAllUsers: async (tenantSlug: string) => {
    const response = await api.get<{ users: User[] }>(`/${tenantSlug}/users/all`)
    return response.data.users
  },
}

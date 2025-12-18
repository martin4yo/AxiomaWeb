import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState, User, Tenant } from '@/types'

interface AuthActions {
  login: (token: string, user: User, tenants: Tenant[]) => void
  logout: () => void
  setCurrentTenant: (tenant: Tenant) => void
  updateCurrentTenant: (tenantData: Partial<Tenant>) => void
  updateUser: (user: Partial<User>) => void
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      tenants: [],
      currentTenant: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      // Actions
      login: (token: string, user: User, tenants: Tenant[]) => {
        // Limpiar estado anterior completamente antes de setear el nuevo
        set({
          token,
          user,
          tenants,
          isAuthenticated: true,
          currentTenant: tenants[0] || null, // Default to first tenant
        })

        // Forzar persistencia inmediata
        localStorage.setItem('axioma-auth-storage', JSON.stringify({
          state: {
            token,
            user,
            tenants,
            currentTenant: tenants[0] || null,
            isAuthenticated: true,
          },
          version: 0
        }))
      },

      logout: () => {
        // Limpiar localStorage completamente
        localStorage.removeItem('axioma-auth-storage')

        set({
          user: null,
          tenants: [],
          currentTenant: null,
          token: null,
          isAuthenticated: false,
        })
      },

      setCurrentTenant: (tenant: Tenant) => {
        set({ currentTenant: tenant })
      },

      updateCurrentTenant: (tenantData: Partial<Tenant>) => {
        const currentTenant = get().currentTenant
        if (currentTenant) {
          set({
            currentTenant: { ...currentTenant, ...tenantData }
          })
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'axioma-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        tenants: state.tenants,
        currentTenant: state.currentTenant,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
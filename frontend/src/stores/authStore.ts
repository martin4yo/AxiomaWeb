import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState, User, Tenant } from '@/types'

interface AuthActions {
  login: (token: string, user: User, tenants: Tenant[]) => void
  logout: () => void
  setCurrentTenant: (tenant: Tenant) => void
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
        set({
          token,
          user,
          tenants,
          isAuthenticated: true,
          currentTenant: tenants[0] || null, // Default to first tenant
        })
      },

      logout: () => {
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
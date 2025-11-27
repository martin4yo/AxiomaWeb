import { create } from 'zustand'

interface ErrorState {
  hasConnectionError: boolean
  setConnectionError: (hasError: boolean) => void
}

export const useErrorStore = create<ErrorState>((set) => ({
  hasConnectionError: false,
  setConnectionError: (hasError) => set({ hasConnectionError: hasError })
}))

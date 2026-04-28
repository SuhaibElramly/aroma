import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user:        User | null
  isLoggedIn:  boolean
  login:       (user: User) => void
  logout:      () => void
  updateUser:  (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user:       null,
      isLoggedIn: false,

      login: (user) => set({ user, isLoggedIn: true }),

      logout: () => set({ user: null, isLoggedIn: false }),

      updateUser: (updates) =>
        set(state =>
          state.user
            ? { user: { ...state.user, ...updates } }
            : {},
        ),
    }),
    {
      name:        'aroma-auth',
      partialize:  state => ({ user: state.user, isLoggedIn: state.isLoggedIn }),
    },
  ),
)

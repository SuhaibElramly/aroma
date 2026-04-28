import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistStore {
  ids: number[]
  setIds:  (ids: number[]) => void
  has:    (id: number) => boolean
  toggle: (id: number) => 'added' | 'removed'
  add:    (id: number) => void
  remove: (id: number) => void
  count:  () => number
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      ids: [],

      setIds: (ids) => set({ ids }),

      has: (id) => get().ids.includes(id),

      toggle: (id) => {
        if (get().ids.includes(id)) {
          set(state => ({ ids: state.ids.filter(i => i !== id) }))
          return 'removed'
        } else {
          set(state => ({ ids: [...state.ids, id] }))
          return 'added'
        }
      },

      add: (id) => {
        if (!get().ids.includes(id)) {
          set(state => ({ ids: [...state.ids, id] }))
        }
      },

      remove: (id) => {
        set(state => ({ ids: state.ids.filter(i => i !== id) }))
      },

      count: () => get().ids.length,
    }),
    {
      name: 'aroma-wishlist',
      partialize: state => ({ ids: state.ids }),
    },
  ),
)

import { create } from 'zustand'
import { TOAST_DURATION } from '@/lib/constants'

interface Toast {
  id:      string
  message: string
  visible: boolean
}

interface UIStore {
  toast:          Toast | null
  filterDrawer:   boolean
  mobileMenu:     boolean
  showToast:      (message: string) => void
  hideToast:      () => void
  openFilterDrawer:  () => void
  closeFilterDrawer: () => void
  openMobileMenu:    () => void
  closeMobileMenu:   () => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useUIStore = create<UIStore>((set) => ({
  toast:        null,
  filterDrawer: false,
  mobileMenu:   false,

  showToast: (message) => {
    if (toastTimer) clearTimeout(toastTimer)
    const id = Date.now().toString()
    set({ toast: { id, message, visible: true } })
    toastTimer = setTimeout(() => {
      set(state => state.toast?.id === id ? { toast: { ...state.toast!, visible: false } } : {})
    }, TOAST_DURATION)
  },

  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer)
    set(state => state.toast ? { toast: { ...state.toast, visible: false } } : {})
  },

  openFilterDrawer:  () => set({ filterDrawer: true }),
  closeFilterDrawer: () => set({ filterDrawer: false }),
  openMobileMenu:    () => set({ mobileMenu: true }),
  closeMobileMenu:   () => set({ mobileMenu: false }),
}))

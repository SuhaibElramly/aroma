import { ref } from 'vue'

// Module-level singleton — shared across all consumers in the same app instance
const isOpen = ref(false)

export function useNewProductDrawer() {
  return {
    isOpen,
    open:  () => { isOpen.value = true },
    close: () => { isOpen.value = false },
  }
}

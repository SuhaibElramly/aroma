import { ref } from 'vue'

const open = ref(false)

export function useCommandPalette() {
  function openPalette()   { open.value = true  }
  function closePalette()  { open.value = false }
  function togglePalette() { open.value = !open.value }
  return { open, openPalette, closePalette, togglePalette }
}

<template>
  <div class="flex h-screen overflow-hidden bg-dash-bg">
    <Sidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      <main class="flex-1 overflow-y-auto p-6">
        <div class="animate-fade-up">
          <RouterView />
        </div>
      </main>
    </div>
    <NewProductDrawer />
    <CommandPalette />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar          from './Sidebar.vue'
import Topbar           from './Topbar.vue'
import CommandPalette   from './CommandPalette.vue'
import NewProductDrawer from '../product/NewProductDrawer.vue'
import { useAuthStore } from '../../stores/auth'
import { useNotificationsStore } from '../../stores/notifications'
import { useCommandPalette } from '../../composables/useCommandPalette'

const auth  = useAuthStore()
const notif = useNotificationsStore()
const { togglePalette, closePalette, open: paletteOpen } = useCommandPalette()

function onGlobalKeydown(e: KeyboardEvent) {
  const isMod = e.metaKey || e.ctrlKey
  if (isMod && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    togglePalette()
    return
  }
  if (e.key === 'Escape' && paletteOpen.value) {
    e.preventDefault()
    closePalette()
  }
}

onMounted(async () => {
  await auth.init()
  await notif.load()
  notif.startPolling()
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  notif.stopPolling()
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

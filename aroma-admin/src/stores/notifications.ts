import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  apiGetNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
} from '../api/admin'
import type { AdminNotification } from '../types'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AdminNotification[]>([])
  const unreadCount   = ref(0)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function load(): Promise<void> {
    try {
      const res           = await apiGetNotifications()
      notifications.value = res.data.data
      unreadCount.value   = res.data.unreadCount
    } catch {
      // silently ignore — network hiccup should not break the UI
    }
  }

  async function markRead(id: number): Promise<void> {
    await apiMarkNotificationRead(id)
    const n = notifications.value.find(n => n.id === id)
    if (n) n.read = true
    unreadCount.value = notifications.value.filter(n => !n.read).length
  }

  async function markAllRead(): Promise<void> {
    await apiMarkAllNotificationsRead()
    notifications.value.forEach(n => (n.read = true))
    unreadCount.value = 0
  }

  function startPolling(): void {
    if (pollTimer) return
    pollTimer = setInterval(load, 60_000)
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  return { notifications, unreadCount, load, markRead, markAllRead, startPolling, stopPolling }
})

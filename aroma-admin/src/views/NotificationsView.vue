<script setup lang="ts">
import { onMounted } from 'vue'
import { ShoppingBag, Package, Star, Ticket } from 'lucide-vue-next'
import { useNotificationsStore } from '../stores/notifications'
import type { NotifKind } from '../types'

const notif = useNotificationsStore()

onMounted(() => notif.load())

const notifIconMap: Record<NotifKind, typeof ShoppingBag> = {
  order:  ShoppingBag,
  stock:  Package,
  review: Star,
  coupon: Ticket,
}

const notifHueMap: Record<NotifKind, number> = {
  order:  32,
  stock:  340,
  review: 48,
  coupon: 200,
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-1">
    <div class="flex items-center justify-between mb-4">
      <p class="text-[13px] text-dash-muted">{{ notif.unreadCount }} unread</p>
      <button
        v-if="notif.unreadCount > 0"
        @click="notif.markAllRead()"
        class="text-[12px] font-medium text-dash-primary-dk hover:underline"
      >
        Mark all read
      </button>
    </div>

    <div v-if="notif.notifications.length === 0" class="text-center py-16 text-dash-muted text-[13px]">
      No notifications yet.
    </div>

    <div
      v-for="n in notif.notifications"
      :key="n.id"
      class="flex items-start gap-3 p-4 rounded-card border border-dash-border bg-dash-paper cursor-pointer transition-colors"
      :class="n.read ? 'opacity-60' : 'bg-dash-paper-2'"
      @click="notif.markRead(n.id)"
    >
      <div
        class="h-9 w-9 rounded-lg grid place-items-center shrink-0"
        :style="`background: oklch(94% 0.04 ${notifHueMap[n.kind]}); color: oklch(34% 0.085 ${notifHueMap[n.kind]})`"
      >
        <component :is="notifIconMap[n.kind]" :size="15" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[13px] font-semibold text-dash-text">{{ n.title }}</p>
        <p class="text-[12px] mt-0.5 text-dash-muted">{{ n.sub }}</p>
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0">
        <span class="text-[11px] text-dash-faint">{{ n.time }}</span>
        <span v-if="!n.read" class="h-1.5 w-1.5 rounded-full bg-dash-primary-dk" />
      </div>
    </div>
  </div>
</template>

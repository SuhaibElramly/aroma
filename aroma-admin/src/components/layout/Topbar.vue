<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const route  = useRoute()
const router = useRouter()

// Map route names → eyebrow + heading
const PAGE_META: Record<string, { eyebrow: string; heading: string }> = {
  dashboard:      { eyebrow: 'WORKSPACE',    heading: 'Dashboard' },
  orders:         { eyebrow: 'WORKSPACE',    heading: 'Orders' },
  'order-detail': { eyebrow: 'ORDERS',       heading: 'Order Detail' },
  users:          { eyebrow: 'WORKSPACE',    heading: 'Customers' },
  'user-detail':  { eyebrow: 'CUSTOMERS',   heading: 'Customer Detail' },
  products:       { eyebrow: 'CATALOG',      heading: 'Products' },
  'product-create': { eyebrow: 'PRODUCTS',  heading: 'New Product' },
  'product-edit': { eyebrow: 'PRODUCTS',    heading: 'Edit Product' },
  'product-detail': { eyebrow: 'PRODUCTS',  heading: 'Product Detail' },
  brands:         { eyebrow: 'CATALOG',      heading: 'Brands' },
  'brand-detail': { eyebrow: 'BRANDS',       heading: 'Brand Detail' },
  categories:     { eyebrow: 'CATALOG',      heading: 'Categories' },
  coupons:        { eyebrow: 'CATALOG',      heading: 'Coupons' },
  'spec-types':   { eyebrow: 'CATALOG',      heading: 'Spec Types' },
  admins:         { eyebrow: 'SETTINGS',     heading: 'Admins' },
}

const meta = computed(() => PAGE_META[route.name as string] ?? { eyebrow: '', heading: '' })

// Date
const today = new Date().toLocaleDateString(locale.value === 'ar' ? 'ar-LY' : 'en-GB', {
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
})

// Language
function toggleLocale() {
  locale.value = locale.value === 'ar' ? 'en' : 'ar'
  document.documentElement.dir = locale.value === 'ar' ? 'rtl' : 'ltr'
}

// Notifications
const notifOpen = ref(false)
const notifications = ref([
  { id: 1, type: 'order', read: false, title: 'New order #1042', time: '2m ago' },
  { id: 2, type: 'stock', read: false, title: 'Low stock: Oud Royal 30ml', time: '1h ago' },
  { id: 3, type: 'order', read: true,  title: 'Order #1041 delivered', time: '3h ago' },
])
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)
function markAllRead() { notifications.value.forEach(n => n.read = true) }
function closeNotif(e: MouseEvent) {
  if (!(e.target as Element).closest('[data-notif]')) notifOpen.value = false
}
</script>

<template>
  <header
    class="flex items-center gap-4 px-6 py-4 border-b border-dash-border bg-dash-paper"
    @click="closeNotif"
  >
    <!-- Left: eyebrow + heading -->
    <div class="flex-1 min-w-0">
      <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest">{{ meta.eyebrow }}</p>
      <h1 class="font-display font-semibold text-dash-text text-xl leading-tight truncate">{{ meta.heading }}</h1>
    </div>

    <!-- Right: date, lang, bell, new product -->
    <div class="flex items-center gap-3 shrink-0">
      <span class="hidden md:block text-xs text-dash-muted">{{ today }}</span>

      <!-- EN/AR -->
      <button
        @click.stop="toggleLocale"
        class="h-8 px-3 rounded-btn border border-dash-border text-xs font-medium text-dash-text-2 hover:border-dash-primary/40 transition-colors"
      >
        {{ locale === 'ar' ? 'EN' : 'AR' }}
      </button>

      <!-- Notifications -->
      <div class="relative" data-notif>
        <button
          @click.stop="notifOpen = !notifOpen"
          class="relative h-8 w-8 flex items-center justify-center rounded-btn border border-dash-border text-dash-muted hover:border-dash-primary/40 transition-colors"
        >
          <span class="text-sm" aria-hidden="true">🔔</span>
          <span
            v-if="unreadCount > 0"
            class="absolute -top-1 -end-1 h-4 min-w-4 px-1 bg-dash-danger text-white text-2xs rounded-full flex items-center justify-center"
          >{{ unreadCount }}</span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="notifOpen"
          data-notif
          class="absolute end-0 top-10 w-80 bg-dash-paper border border-dash-border rounded-card shadow-dropdown z-50 animate-scale-in"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-dash-border">
            <p class="text-sm font-medium text-dash-text">{{ $t('topbar.notifications') }}</p>
            <button @click="markAllRead" class="text-2xs text-dash-primary hover:underline">{{ $t('topbar.markAllRead') }}</button>
          </div>
          <ul v-if="notifications.length" class="max-h-72 overflow-y-auto divide-y divide-dash-border">
            <li
              v-for="n in notifications"
              :key="n.id"
              class="flex gap-3 px-4 py-3 text-xs"
              :class="n.read ? '' : 'bg-dash-primary-lt/30'"
            >
              <span class="mt-0.5 text-sm" aria-hidden="true">{{ n.type === 'stock' ? '📦' : '🛒' }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-dash-text truncate">{{ n.title }}</p>
                <p class="text-dash-muted mt-0.5">{{ n.time }}</p>
              </div>
              <span v-if="!n.read" class="w-2 h-2 mt-1.5 rounded-full bg-dash-primary shrink-0"></span>
            </li>
          </ul>
          <p v-else class="px-4 py-6 text-xs text-dash-muted text-center">{{ $t('topbar.noNotifications') }}</p>
        </div>
      </div>

      <!-- New product -->
      <button
        @click="router.push('/products/new')"
        class="h-8 px-4 bg-dash-text text-white text-xs font-medium rounded-btn hover:bg-dash-text-2 transition-colors whitespace-nowrap"
      >
        + {{ $t('topbar.newProduct') }}
      </button>
    </div>
  </header>
</template>

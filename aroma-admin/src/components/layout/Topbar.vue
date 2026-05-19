<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLocale } from '../../composables/useLocale'
import {
  CalendarDays,
  Bell,
  Plus,
  ShoppingBag,
  Package,
  Star,
  Ticket,
} from 'lucide-vue-next'

const { locale } = useI18n()
const { applyLocale } = useLocale()
const route  = useRoute()
const router = useRouter()

// Map route names → eyebrow + heading
const PAGE_META: Record<string, { eyebrow: string; heading: string }> = {
  dashboard:        { eyebrow: 'WORKSPACE',   heading: 'Dashboard' },
  orders:           { eyebrow: 'WORKSPACE',   heading: 'Orders' },
  'order-detail':   { eyebrow: 'ORDERS',      heading: 'Order Detail' },
  users:            { eyebrow: 'WORKSPACE',   heading: 'Customers' },
  'user-detail':    { eyebrow: 'CUSTOMERS',   heading: 'Customer Detail' },
  products:         { eyebrow: 'CATALOG',     heading: 'Products' },
  'product-create': { eyebrow: 'PRODUCTS',    heading: 'New Product' },
  'product-edit':   { eyebrow: 'PRODUCTS',    heading: 'Edit Product' },
  'product-detail': { eyebrow: 'PRODUCTS',    heading: 'Product Detail' },
  brands:           { eyebrow: 'CATALOG',     heading: 'Brands' },
  'brand-detail':   { eyebrow: 'BRANDS',      heading: 'Brand Detail' },
  categories:       { eyebrow: 'CATALOG',     heading: 'Categories' },
  coupons:          { eyebrow: 'CATALOG',     heading: 'Coupons' },
  'spec-types':     { eyebrow: 'CATALOG',     heading: 'Spec Types' },
  admins:           { eyebrow: 'SETTINGS',    heading: 'Admins' },
}

const meta = computed(() => PAGE_META[route.name as string] ?? { eyebrow: '', heading: '' })

// Date
const today = computed(() =>
  new Date().toLocaleDateString(locale.value === 'ar' ? 'ar-LY' : 'en-GB', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
)

function setLocale(l: string) {
  applyLocale(l as 'en' | 'ar')
}

// Notifications
const notifOpen = ref(false)
type NotifKind = 'order' | 'stock' | 'review' | 'coupon'
const notifications = ref<Array<{
  id: number
  kind: NotifKind
  read: boolean
  title: string
  sub: string
  time: string
  hue: number
}>>([
  { id: 1, kind: 'order',  read: false, title: 'New order #A-4821',        sub: 'Layla Ben Salem · 432 LYD',             time: '2m',   hue: 32  },
  { id: 2, kind: 'stock',  read: false, title: 'Low stock: Jasmine Mist',  sub: 'Only 8 units left',                     time: '14m',  hue: 340 },
  { id: 3, kind: 'review', read: false, title: '5-star review',             sub: 'Oud Royale · "Absolutely stunning."',   time: '1h',   hue: 48  },
  { id: 4, kind: 'coupon', read: true,  title: 'FREESHIP redeemed 12×',    sub: 'Today, mostly Tripoli area',            time: '3h',   hue: 200 },
  { id: 5, kind: 'order',  read: true,  title: 'Order #A-4818 shipped',    sub: 'Tracking handed to courier',            time: '6h',   hue: 140 },
])
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)
function markAllRead() { notifications.value.forEach(n => (n.read = true)) }
function closeNotif(e: MouseEvent) {
  if (!(e.target as Element).closest('[data-notif]')) notifOpen.value = false
}

// Notification kind → icon component mapping
const notifIconMap: Record<NotifKind, typeof ShoppingBag> = {
  order:  ShoppingBag,
  stock:  Package,
  review: Star,
  coupon: Ticket,
}
</script>

<template>
  <header
    class="flex items-center justify-between px-9 pt-7 pb-1"
    @click="closeNotif"
  >
    <!-- Left: eyebrow + heading -->
    <div>
      <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">
        {{ meta.eyebrow }}
      </p>
      <h1 class="font-display text-[26px] mt-1 leading-tight text-dash-text">
        {{ meta.heading }}
      </h1>
    </div>

    <!-- Right: date range, lang, bell, new product -->
    <div class="flex items-center gap-2">

      <!-- Date range badge -->
      <div class="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg border border-dash-border bg-white whitespace-nowrap">
        <CalendarDays :size="14" class="text-dash-faint shrink-0" />
        <span class="text-[12.5px] font-medium text-dash-text-2">{{ today }}</span>
      </div>

      <!-- Language switcher: pill pair -->
      <div class="flex items-center p-1 rounded-lg border border-dash-border bg-white">
        <button
          v-for="[key, lbl] in [['en', 'EN'], ['ar', 'ع']]"
          :key="key"
          @click.stop="setLocale(key)"
          class="h-7 min-w-[28px] px-2 rounded-md text-[11.5px] font-semibold transition-colors"
          :class="locale === key ? 'bg-dash-text text-white' : 'text-dash-muted'"
          :style="key === 'ar' ? 'font-family: Cairo, system-ui' : ''"
        >
          {{ lbl }}
        </button>
      </div>

      <!-- Notifications bell -->
      <div class="relative" data-notif>
        <button
          @click.stop="notifOpen = !notifOpen"
          class="relative h-9 w-9 rounded-lg border border-dash-border bg-white grid place-items-center text-dash-text-2 hover:border-dash-primary/40 transition-colors"
          data-notif
        >
          <Bell :size="16" />
          <span
            v-if="unreadCount > 0"
            class="absolute top-1.5 end-1.5 h-1.5 w-1.5 rounded-full bg-dash-danger"
          />
        </button>

        <!-- Dropdown -->
        <div
          v-if="notifOpen"
          data-notif
          class="absolute end-0 mt-2 w-[340px] bg-dash-paper border border-dash-border rounded-card z-50 overflow-hidden animate-scale-in"
          style="box-shadow: 0 14px 40px oklch(26% 0.04 250 / .14)"
        >
          <!-- Header -->
          <div class="px-4 py-3 flex items-center justify-between border-b border-dash-border-lt">
            <div>
              <p class="font-display text-[15px] leading-none text-dash-text">
                {{ $t('topbar.notifications') }}
              </p>
              <p class="text-[11px] mt-1 text-dash-muted">
                {{ unreadCount }} {{ $t('topbar.unreadLabel') }}
              </p>
            </div>
            <button
              v-if="unreadCount > 0"
              @click="markAllRead"
              class="text-[11.5px] font-medium text-dash-primary-dk hover:underline"
            >
              {{ $t('topbar.markAllRead') }}
            </button>
          </div>

          <!-- Items -->
          <div class="max-h-[360px] overflow-y-auto divide-y divide-dash-border-lt">
            <div
              v-for="n in notifications"
              :key="n.id"
              class="flex items-start gap-3 px-4 py-3"
              :class="n.read ? '' : 'bg-dash-paper-2'"
            >
              <!-- Type icon -->
              <div
                class="h-8 w-8 rounded-lg grid place-items-center shrink-0"
                :style="`background: oklch(94% 0.04 ${n.hue}); color: oklch(34% 0.085 ${n.hue})`"
              >
                <component :is="notifIconMap[n.kind]" :size="14" />
              </div>
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-[12.5px] font-semibold leading-tight text-dash-text">{{ n.title }}</p>
                <p class="text-[11.5px] mt-0.5 truncate text-dash-muted">{{ n.sub }}</p>
              </div>
              <!-- Time + unread dot -->
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="text-[10.5px] text-dash-faint">{{ n.time }}</span>
                <span v-if="!n.read" class="h-1.5 w-1.5 rounded-full bg-dash-primary-dk" />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-4 py-2.5 border-t border-dash-border-lt text-center bg-dash-paper-2">
            <button class="text-[11.5px] font-medium text-dash-text-2">
              {{ $t('topbar.viewAll') }}
            </button>
          </div>
        </div>
      </div>

      <!-- New product button -->
      <button
        @click="router.push('/products/new')"
        class="h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-dash-text text-white inline-flex items-center gap-1.5 whitespace-nowrap hover:bg-dash-text-2 transition-colors"
      >
        <Plus :size="14" :stroke-width="2.5" />
        {{ $t('topbar.newProduct') }}
      </button>
    </div>
  </header>
</template>

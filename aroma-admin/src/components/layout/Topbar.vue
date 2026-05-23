<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLocale } from '../../composables/useLocale'
import { useNewProductDrawer } from '../../composables/useNewProductDrawer'
import { useNotificationsStore } from '../../stores/notifications'
import {
  CalendarDays,
  Bell,
  Plus,
  ShoppingBag,
  Package,
  Star,
  Ticket,
} from 'lucide-vue-next'
import type { NotifKind } from '../../types'

const { t, locale } = useI18n()
const { applyLocale } = useLocale()
const route  = useRoute()
const router = useRouter()
const { open: openNewProductDrawer } = useNewProductDrawer()
const notif = useNotificationsStore()

const meta = computed(() => {
  const routeName = route.name as string
  const eyebrowMap: Record<string, string> = {
    dashboard:        t('nav.workspace'),
    orders:           t('nav.workspace'),
    'order-detail':   t('nav.orders'),
    users:            t('nav.workspace'),
    'user-detail':    t('nav.customers'),
    products:         t('nav.catalog'),
    'product-create': t('nav.products'),
    'product-edit':   t('nav.products'),
    'product-detail': t('nav.products'),
    brands:           t('nav.catalog'),
    'brand-detail':   t('nav.brands'),
    categories:       t('nav.catalog'),
    coupons:          t('nav.catalog'),
    'spec-types':     t('nav.catalog'),
    admins:           t('nav.settings'),
    notifications:    t('nav.workspace'),
  }
  const headingMap: Record<string, string> = {
    dashboard:        t('pageTitles.dashboard'),
    orders:           t('pageTitles.orders'),
    'order-detail':   t('pageTitles.orderDetail'),
    users:            t('pageTitles.users'),
    'user-detail':    t('pageTitles.userDetail'),
    products:         t('pageTitles.products'),
    'product-create': t('productCreate.newProduct'),
    'product-edit':   t('products.editProduct'),
    'product-detail': t('pageTitles.products'),
    brands:           t('pageTitles.brands'),
    'brand-detail':   t('pageTitles.brandDetail'),
    categories:       t('pageTitles.categories'),
    coupons:          t('pageTitles.coupons'),
    'spec-types':     t('pageTitles.specTypes'),
    admins:           t('admins.title'),
    notifications:    t('topbar.notifications'),
  }
  return {
    eyebrow: eyebrowMap[routeName] ?? '',
    heading: headingMap[routeName] ?? '',
  }
})

const today = computed(() =>
  new Date().toLocaleDateString(locale.value === 'ar' ? 'ar-LY' : 'en-GB', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
)

function setLocale(l: string) {
  applyLocale(l as 'en' | 'ar')
}

const notifOpen = ref(false)

function closeNotif(e: MouseEvent) {
  if (!(e.target as Element).closest('[data-notif]')) notifOpen.value = false
}

function viewAll() {
  notifOpen.value = false
  router.push('/notifications')
}

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
            v-if="notif.unreadCount > 0"
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
                {{ notif.unreadCount }} {{ $t('topbar.unreadLabel') }}
              </p>
            </div>
            <button
              v-if="notif.unreadCount > 0"
              @click="notif.markAllRead()"
              class="text-[11.5px] font-medium text-dash-primary-dk hover:underline"
            >
              {{ $t('topbar.markAllRead') }}
            </button>
          </div>

          <!-- Items -->
          <div class="max-h-[360px] overflow-y-auto divide-y divide-dash-border-lt">
            <div
              v-if="notif.notifications.length === 0"
              class="px-4 py-6 text-center text-[12px] text-dash-muted"
            >
              No notifications yet
            </div>
            <div
              v-for="n in notif.notifications"
              :key="n.id"
              class="flex items-start gap-3 px-4 py-3 cursor-pointer"
              :class="n.read ? '' : 'bg-dash-paper-2'"
              @click="notif.markRead(n.id)"
            >
              <!-- Type icon -->
              <div
                class="h-8 w-8 rounded-lg grid place-items-center shrink-0"
                :style="`background: oklch(94% 0.04 ${notifHueMap[n.kind]}); color: oklch(34% 0.085 ${notifHueMap[n.kind]})`"
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
            <button
              @click="viewAll"
              class="text-[11.5px] font-medium text-dash-text-2 hover:underline"
            >
              {{ $t('topbar.viewAll') }}
            </button>
          </div>
        </div>
      </div>

      <!-- New product button -->
      <button
        @click="openNewProductDrawer"
        class="h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-dash-text text-white inline-flex items-center gap-1.5 whitespace-nowrap hover:bg-dash-text-2 transition-colors"
      >
        <Plus :size="14" :stroke-width="2.5" />
        {{ $t('topbar.newProduct') }}
      </button>
    </div>
  </header>
</template>

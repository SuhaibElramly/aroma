<template>
  <header class="flex h-14 items-center justify-between border-b border-dash-border bg-dash-surface px-6 shrink-0">
    <!-- Page context -->
    <div class="flex flex-col min-w-0">
      <h1 class="text-sm font-semibold text-dash-text leading-none">{{ pageTitle }}</h1>
      <p class="text-2xs text-dash-muted mt-0.5">{{ todayFormatted }}</p>
    </div>

    <!-- Language toggle pill -->
    <div class="flex items-center gap-0.5 rounded-full bg-dash-border/50 px-1 py-1">
      <button
        :class="locale === 'en'
          ? 'rounded-full bg-dash-secondary text-white px-3 py-1 text-xs font-medium transition-colors'
          : 'rounded-full px-3 py-1 text-xs text-dash-muted hover:text-dash-text transition-colors'"
        @click="locale !== 'en' && toggleLocale()"
      >EN</button>
      <button
        :class="locale === 'ar'
          ? 'rounded-full bg-dash-secondary text-white px-3 py-1 text-xs font-medium transition-colors'
          : 'rounded-full px-3 py-1 text-xs text-dash-muted hover:text-dash-text transition-colors'"
        @click="locale !== 'ar' && toggleLocale()"
      >AR</button>
    </div>

    <!-- Profile -->
    <button @click="handleLogout" class="flex items-center gap-2.5 rounded-xl px-3 py-1.5 hover:bg-dash-bg transition-colors group">
      <div class="h-7 w-7 rounded-full bg-dash-secondary flex items-center justify-center text-white text-xs font-semibold shrink-0">
        {{ initial }}
      </div>
      <div class="text-left hidden sm:block">
        <p class="text-xs font-medium text-dash-text leading-none">{{ auth.user?.name ?? 'Admin' }}</p>
        <p class="text-2xs text-dash-muted mt-0.5 group-hover:text-dash-danger transition-colors">Sign out</p>
      </div>
      <LogOut :size="13" class="text-dash-faint group-hover:text-dash-danger transition-colors rtl:scale-x-[-1]" />
    </button>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import dayjs from 'dayjs'
import { useAuthStore } from '../../stores/auth'
import { useLocale } from '../../composables/useLocale'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const { locale, toggleLocale } = useLocale()

const titles: Record<string, string> = {
  dashboard:          'Dashboard',
  orders:             'Orders',
  'order-detail':     'Order Detail',
  products:           'Products',
  'product-variants': 'Variants',
  brands:             'Brands',
  categories:         'Categories',
  users:              'Customers',
}

const pageTitle      = computed(() => titles[route.name as string] ?? 'Admin')
const todayFormatted = computed(() => dayjs().format('dddd, MMMM D'))
const initial        = computed(() => (auth.user?.name ?? 'A')[0].toUpperCase())

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

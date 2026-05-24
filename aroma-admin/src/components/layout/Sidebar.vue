<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useCommandPalette } from '../../composables/useCommandPalette'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  SlidersHorizontal,
  Tag,
  Grid3X3,
  Ticket,
  ShieldCheck,
  Search,
  LogOut,
  Home,
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const { openPalette } = useCommandPalette()

const isActive = (path: string) => route.path.startsWith('/' + path)

const groups = computed(() => {
  const c = (resource: string) => auth.can(resource, 'view')
  return [
    {
      label: t('nav.workspace'),
      items: [
        { key: 'dashboard',  label: t('nav.dashboard'),  icon: LayoutDashboard, path: 'dashboard',  badge: null },
        c('orders')    && { key: 'orders',     label: t('nav.orders'),    icon: ShoppingBag, path: 'orders',     badge: null },
        c('customers') && { key: 'users',      label: t('nav.customers'), icon: Users,       path: 'users',      badge: null },
      ].filter((x): x is { key: string; label: string; icon: any; path: string; badge: string | null } => Boolean(x)),
    },
    {
      label: t('nav.catalog'),
      items: [
        c('products') && { key: 'products',   label: t('nav.products'),  icon: Package,           path: 'products',   badge: null },
        c('specs')    && { key: 'spec-types', label: t('nav.specTypes'), icon: SlidersHorizontal, path: 'spec-types', badge: null },
        c('brands')   && { key: 'brands',     label: t('nav.brands'),    icon: Tag,               path: 'brands',     badge: null },
        c('brands')   && { key: 'categories', label: t('nav.categories'),icon: Grid3X3,           path: 'categories', badge: null }, // shares brands permission — no separate ROLE_PERMS key
        c('coupons')  && { key: 'coupons',    label: t('nav.coupons'),   icon: Ticket,            path: 'coupons',    badge: null },
      ].filter((x): x is { key: string; label: string; icon: any; path: string; badge: string | null } => Boolean(x)),
    },
    {
      label: t('nav.storefront'),
      items: [
        { key: 'homepage', label: t('nav.homepage'), icon: Home, path: 'homepage', badge: null },
      ],
    },
    auth.can('admins', 'view') ? {
      label: t('nav.settings'),
      items: [
        { key: 'admins', label: t('nav.admins'), icon: ShieldCheck, path: 'admins', badge: null },
      ],
    } : null,
  ].filter((g): g is { label: string; items: { key: string; label: string; icon: any; path: string; badge: string | null }[] } => Boolean(g))
})

const userInitials = computed(() => {
  const name = auth.user?.name ?? ''
  return name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')
    || 'A'
})

function signOut() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <aside
    class="flex flex-col w-[228px] shrink-0 h-screen bg-dash-paper border-e border-dash-border"
    :dir="locale === 'ar' ? 'rtl' : 'ltr'"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-5 pt-5 pb-4">
      <img
        src="/aroma-logo.png"
        alt="Aroma"
        class="h-12 w-auto select-none shrink-0"
        style="mix-blend-mode: multiply"
      />
      <div class="leading-tight min-w-0">
        <p class="font-display text-[16px] -mb-0.5 text-dash-text">Aroma</p>
        <p class="text-[10px] tracking-[.18em] uppercase text-dash-faint">{{ $t('nav.adminLabel') }}</p>
      </div>
    </div>

    <!-- Search -->
    <div class="px-3 mb-1">
      <button
        type="button"
        class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dash-border-lt bg-dash-paper-2 hover:border-dash-border transition-colors text-start"
        @click="openPalette"
      >
        <Search :size="14" class="text-dash-faint shrink-0" />
        <span class="flex-1 text-[12.5px] text-dash-muted">{{ $t('nav.search') }}…</span>
        <kbd class="text-[10px] px-1.5 py-0.5 rounded border border-dash-border-lt bg-white text-dash-faint">⌘K</kbd>
      </button>
    </div>

    <!-- Nav groups -->
    <nav class="flex-1 overflow-y-auto px-3 pt-2 space-y-4">
      <div v-for="group in groups" :key="group.label" class="mb-4">
        <p class="px-2.5 mb-1.5 text-[10px] font-semibold tracking-[.18em] uppercase text-dash-faint">
          {{ group.label }}
        </p>
        <div class="space-y-0.5">
          <router-link
            v-for="item in group.items"
            :key="item.key"
            :to="'/' + item.path"
            class="w-full flex items-center gap-3 rounded-lg ps-3 pe-2 py-2 text-[13px] font-medium rtl:text-right transition-colors"
            :class="isActive(item.path)
              ? 'bg-dash-text text-white'
              : 'text-dash-text-2 hover:bg-dash-bg'"
          >
            <component
              :is="item.icon"
              :size="18"
              :class="isActive(item.path) ? 'text-dash-primary-lt' : 'text-dash-muted'"
            />
            <span class="flex-1">{{ item.label }}</span>
            <span
              v-if="item.badge"
              class="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
              :class="isActive(item.path)
                ? 'bg-white/[.12] text-white'
                : 'bg-dash-fig-lt text-dash-fig'"
            >
              {{ item.badge }}
            </span>
          </router-link>
        </div>
      </div>
    </nav>

    <!-- User card -->
    <div class="border-t border-dash-border px-3 py-3 mt-auto">
      <div
        v-if="auth.user"
        class="flex items-center gap-2.5 p-1.5 rounded-lg bg-dash-paper-2 cursor-default"
      >
        <div class="h-8 w-8 rounded-full grid place-items-center text-[12px] font-semibold text-white bg-dash-text shrink-0">
          {{ userInitials }}
        </div>
        <div class="flex-1 min-w-0 leading-tight">
          <p class="text-[12.5px] font-semibold text-dash-text truncate">{{ auth.user?.name }}</p>
          <p class="text-[10.5px] text-dash-muted truncate">{{ auth.user?.email }}</p>
        </div>
        <button
          @click="signOut"
          class="text-dash-faint hover:text-dash-danger transition-colors shrink-0 p-1"
          :title="$t('topbar.signOut')"
        >
          <LogOut :size="15" />
        </button>
      </div>
    </div>
  </aside>
</template>

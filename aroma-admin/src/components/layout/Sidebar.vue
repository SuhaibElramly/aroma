<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'

const { t, locale } = useI18n()
const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const isActive = (path: string) => route.path.startsWith('/' + path)

const groups = computed(() => [
  {
    label: t('nav.workspace'),
    items: [
      { key: 'dashboard',  label: t('nav.dashboard'),  icon: '⊞', path: 'dashboard' },
      { key: 'orders',     label: t('nav.orders'),     icon: '◫', path: 'orders' },
      { key: 'users',      label: t('nav.customers'),  icon: '◯', path: 'users' },
    ],
  },
  {
    label: t('nav.catalog'),
    items: [
      { key: 'products',   label: t('nav.products'),   icon: '⬡', path: 'products' },
      { key: 'spec-types', label: t('nav.specTypes'),  icon: '≡',  path: 'spec-types' },
      { key: 'brands',     label: t('nav.brands'),     icon: '◈', path: 'brands' },
      { key: 'categories', label: t('nav.categories'), icon: '⊟', path: 'categories' },
      { key: 'coupons',    label: t('nav.coupons'),    icon: '◇', path: 'coupons' },
    ],
  },
  {
    label: t('nav.settings'),
    items: [
      { key: 'admins', label: t('nav.admins'), icon: '⬤', path: 'admins' },
    ],
  },
])

function signOut() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <aside
    class="flex flex-col w-60 shrink-0 h-screen bg-dash-paper border-e border-dash-border"
    :dir="locale === 'ar' ? 'rtl' : 'ltr'"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-5 pt-6 pb-4">
      <div class="w-9 h-9 rounded-lg bg-dash-bg flex items-center justify-center overflow-hidden shrink-0">
        <img src="/aroma-logo.png" alt="Aroma" class="w-8 h-8 object-contain" style="mix-blend-mode:multiply" />
      </div>
      <div class="min-w-0">
        <p class="font-display font-semibold text-dash-text text-sm leading-tight tracking-tight">Aroma</p>
        <p class="text-2xs text-dash-muted">{{ $t('nav.adminLabel') }}</p>
      </div>
    </div>

    <!-- Search -->
    <div class="px-3 mb-3">
      <div class="flex items-center gap-2 px-3 py-2 rounded-btn bg-dash-bg border border-dash-border text-dash-muted text-xs cursor-pointer hover:border-dash-primary/40 transition-colors">
        <span class="opacity-60">⌕</span>
        <span class="flex-1">{{ $t('nav.search') }}</span>
        <kbd class="opacity-50 font-sans">⌘K</kbd>
      </div>
    </div>

    <!-- Nav groups -->
    <nav class="flex-1 overflow-y-auto px-3 space-y-5 py-1">
      <div v-for="group in groups" :key="group.label">
        <p class="text-2xs font-medium text-dash-faint uppercase tracking-widest px-2 mb-1">{{ group.label }}</p>
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.key">
            <router-link
              :to="'/' + item.path"
              class="flex items-center gap-2.5 px-2.5 py-2 rounded-btn text-sm transition-colors"
              :class="isActive(item.path)
                ? 'bg-dash-text text-white font-medium'
                : 'text-dash-text-2 hover:bg-dash-bg'"
            >
              <span class="text-base leading-none opacity-70">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <!-- User card -->
    <div class="border-t border-dash-border px-3 py-3 mt-auto">
      <div class="flex items-center gap-2.5 px-2.5 py-2 rounded-btn hover:bg-dash-bg transition-colors cursor-default">
        <div class="w-8 h-8 rounded-full bg-dash-primary/20 flex items-center justify-center text-dash-primary font-semibold text-xs shrink-0">
          {{ auth.user?.name?.[0]?.toUpperCase() ?? 'A' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-dash-text truncate">{{ auth.user?.name }}</p>
          <p class="text-2xs text-dash-muted truncate">{{ auth.user?.email }}</p>
        </div>
        <button @click="signOut" class="text-dash-muted hover:text-dash-danger transition-colors text-sm" :title="$t('topbar.signOut')">⇥</button>
      </div>
    </div>
  </aside>
</template>

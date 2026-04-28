<template>
  <aside class="flex h-screen w-60 flex-col shrink-0 bg-dash-surface border-r border-dash-border">
    <!-- Logo -->
    <div class="flex items-center gap-3 px-5 py-5">
      <div class="h-9 w-9 rounded-xl bg-dash-primary flex items-center justify-center shrink-0 shadow-sm">
        <span class="text-[11px] font-bold text-white tracking-widest">AR</span>
      </div>
      <div>
        <p class="text-sm font-semibold text-dash-text leading-none">Aroma</p>
        <p class="text-2xs text-dash-muted mt-0.5">Admin Console</p>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-5 h-px bg-dash-border" />

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      <p class="px-3 mb-2 text-2xs font-semibold text-dash-faint uppercase tracking-widest">Main</p>
      <RouterLink
        v-for="item in mainItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ navigate, isActive }"
      >
        <button
          @click="navigate"
          :class="[
            'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left group',
            isActive
              ? 'bg-dash-secondary text-white shadow-sm'
              : 'text-dash-muted hover:bg-dash-bg hover:text-dash-text',
          ]"
        >
          <component
            :is="item.icon"
            :size="16"
            :class="isActive ? 'text-white' : 'text-dash-faint group-hover:text-dash-primary transition-colors'"
          />
          <span>{{ item.label }}</span>
          <span
            v-if="item.badge"
            :class="[
              'ml-auto text-2xs font-semibold rounded-full px-1.5 py-0.5',
              isActive ? 'bg-white/20 text-white' : 'bg-dash-primary-lt text-dash-primary',
            ]"
          >{{ item.badge }}</span>
        </button>
      </RouterLink>

      <p class="px-3 mt-4 mb-2 text-2xs font-semibold text-dash-faint uppercase tracking-widest">Catalog</p>
      <RouterLink
        v-for="item in catalogItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ navigate, isActive }"
      >
        <button
          @click="navigate"
          :class="[
            'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left group',
            isActive
              ? 'bg-dash-secondary text-white shadow-sm'
              : 'text-dash-muted hover:bg-dash-bg hover:text-dash-text',
          ]"
        >
          <component
            :is="item.icon"
            :size="16"
            :class="isActive ? 'text-white' : 'text-dash-faint group-hover:text-dash-primary transition-colors'"
          />
          <span>{{ item.label }}</span>
        </button>
      </RouterLink>
    </nav>

    <!-- Footer -->
    <div class="px-5 py-4 border-t border-dash-border">
      <div class="flex items-center gap-2.5">
        <div class="h-7 w-7 rounded-full bg-dash-secondary-lt flex items-center justify-center text-dash-secondary text-2xs font-semibold shrink-0">
          A
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-dash-text truncate">Admin</p>
          <p class="text-2xs text-dash-faint truncate">aromashop.ly</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { LayoutDashboard, ShoppingBag, Package, Tag, Grid3X3, Users } from 'lucide-vue-next'

const mainItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders',    label: 'Orders',    icon: ShoppingBag },
  { to: '/users',     label: 'Customers', icon: Users },
]

const catalogItems = [
  { to: '/products',   label: 'Products',   icon: Package },
  { to: '/brands',     label: 'Brands',     icon: Tag },
  { to: '/categories', label: 'Categories', icon: Grid3X3 },
]
</script>

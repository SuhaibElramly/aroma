<!-- aroma-admin/src/views/UserDetailView.vue -->
<template>
  <div class="space-y-6 max-w-4xl">

    <!-- Loading: profile skeleton -->
    <div v-if="profileLoading" class="flex items-center gap-4">
      <div class="h-12 w-12 rounded-full bg-dash-border animate-pulse shrink-0" />
      <div class="space-y-2">
        <div class="h-4 w-40 rounded bg-dash-border animate-pulse" />
        <div class="h-3 w-56 rounded bg-dash-border animate-pulse" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ error }}
    </div>

    <!-- Profile header -->
    <div v-else-if="user" class="flex items-start justify-between gap-6 flex-wrap">
      <div class="flex items-center gap-4">
        <div class="h-12 w-12 rounded-full bg-dash-secondary flex items-center justify-center text-white text-base font-semibold shrink-0">
          {{ user.name[0].toUpperCase() }}
        </div>
        <div>
          <RouterLink to="/users" class="inline-flex items-center gap-1 text-xs text-dash-faint hover:text-dash-muted transition-colors mb-1">
            <ArrowLeft :size="12" />
            {{ t('userDetail.back') }}
          </RouterLink>
          <h2 class="text-xl font-semibold text-dash-text tracking-tight leading-none">{{ user.name }}</h2>
          <p class="text-sm text-dash-muted mt-0.5">{{ user.email }}</p>
        </div>
      </div>
      <div class="flex items-center gap-6 text-xs">
        <div v-if="user.phone">
          <p class="text-dash-faint mb-0.5">{{ t('userDetail.phone') }}</p>
          <p class="font-medium text-dash-text">{{ user.phone }}</p>
        </div>
        <div>
          <p class="text-dash-faint mb-0.5">{{ t('userDetail.ordersLabel') }}</p>
          <p class="font-medium text-dash-text">{{ user.orderCount }}</p>
        </div>
        <div>
          <p class="text-dash-faint mb-0.5">{{ t('userDetail.joined') }}</p>
          <p class="font-medium text-dash-text">{{ user.joinedAt }}</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div v-if="user" class="flex gap-1 border-b border-dash-border">
      <button
        v-for="tab in (['orders', 'cart', 'wishlist'] as const)"
        :key="tab"
        @click="activeTab = tab"
        :class="[
          'px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
          activeTab === tab
            ? 'border-dash-primary text-dash-primary'
            : 'border-transparent text-dash-muted hover:text-dash-text',
        ]"
      >
        {{ tab === 'orders' ? t('userDetail.orders') : tab === 'cart' ? t('userDetail.cart') : t('userDetail.wishlist') }}
        <span
          v-if="(tab === 'orders' && orders.length) || (tab === 'cart' && cartItems.length) || (tab === 'wishlist' && wishlistItems.length)"
          class="ml-1.5 bg-dash-border-lt text-dash-muted rounded-full px-1.5 py-0.5 text-[10px]"
        >
          {{ tab === 'orders' ? orders.length : tab === 'cart' ? cartItems.length : wishlistItems.length }}
        </span>
      </button>
    </div>

    <!-- Orders tab -->
    <div v-if="user && activeTab === 'orders'">
      <div v-if="ordersLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-14 bg-dash-surface border border-dash-border rounded-xl animate-pulse" />
      </div>
      <div v-else-if="!orders.length" class="py-14 text-center text-xs text-dash-faint">
        {{ t('userDetail.ordersEmpty') }}
      </div>
      <div v-else class="bg-dash-surface rounded-xl border border-dash-border divide-y divide-dash-border-lt overflow-hidden">
        <RouterLink
          v-for="order in orders"
          :key="order.id"
          :to="`/orders/${order.id}`"
          class="flex items-center gap-4 px-5 py-4 hover:bg-dash-bg transition-colors"
        >
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-dash-text">#{{ order.id }}</p>
            <p class="text-[11px] text-dash-muted mt-0.5">{{ order.date }} · {{ order.itemCount }} item{{ order.itemCount !== 1 ? 's' : '' }} · {{ order.isPickup ? t('orderDetail.pickup') : t('orderDetail.homeDelivery') }}</p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <ABadge :status="order.status" />
            <p class="text-xs font-semibold text-dash-text tabular-nums">{{ Number(order.total).toFixed(2) }} LYD</p>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- Cart tab -->
    <div v-if="user && activeTab === 'cart'">
      <div v-if="cartLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-16 bg-dash-surface border border-dash-border rounded-xl animate-pulse" />
      </div>
      <div v-else-if="!cartItems.length" class="py-14 text-center text-xs text-dash-faint">
        {{ t('userDetail.cartEmpty') }}
      </div>
      <div v-else class="bg-dash-surface rounded-xl border border-dash-border divide-y divide-dash-border-lt overflow-hidden">
        <div
          v-for="item in cartItems"
          :key="item.product.id"
          class="flex items-center gap-4 px-5 py-4 hover:bg-dash-bg transition-colors"
        >
          <div class="h-11 w-11 rounded-lg overflow-hidden shrink-0 bg-dash-border flex items-center justify-center">
            <img v-if="item.product.thumbnailUrl" :src="item.product.thumbnailUrl" class="h-full w-full object-cover" />
            <Package v-else :size="16" class="text-dash-faint" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-dash-text truncate">{{ item.product.name }}</p>
            <p class="text-[11px] text-dash-muted mt-0.5">{{ item.product.brand }} · {{ item.product.selectedSize }} ml</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xs font-semibold text-dash-text tabular-nums">{{ Number(item.product.price).toFixed(2) }} LYD</p>
            <p class="text-[11px] text-dash-muted mt-0.5">{{ t('userDetail.qty') }}: {{ item.quantity }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Wishlist tab -->
    <div v-if="user && activeTab === 'wishlist'">
      <div v-if="wishlistLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-16 bg-dash-surface border border-dash-border rounded-xl animate-pulse" />
      </div>
      <div v-else-if="!wishlistItems.length" class="py-14 text-center text-xs text-dash-faint">
        {{ t('userDetail.wishlistEmpty') }}
      </div>
      <div v-else class="bg-dash-surface rounded-xl border border-dash-border divide-y divide-dash-border-lt overflow-hidden">
        <div
          v-for="product in wishlistItems"
          :key="product.id"
          class="flex items-center gap-4 px-5 py-4 hover:bg-dash-bg transition-colors"
        >
          <div class="h-11 w-11 rounded-lg overflow-hidden shrink-0 bg-dash-border flex items-center justify-center">
            <img v-if="product.thumbnailUrl" :src="product.thumbnailUrl" class="h-full w-full object-cover" />
            <Package v-else :size="16" class="text-dash-faint" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-dash-text truncate">{{ product.name }}</p>
            <p class="text-[11px] text-dash-muted mt-0.5">{{ product.brand }} · {{ product.selectedSize }} ml</p>
          </div>
          <div class="text-right shrink-0 flex flex-col items-end gap-1.5">
            <p class="text-xs font-semibold text-dash-text tabular-nums">{{ Number(product.price).toFixed(2) }} LYD</p>
            <ABadge :status="product.stock" />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Package } from 'lucide-vue-next'
import { apiGetUser, apiGetUserOrders, apiGetUserCart, apiGetUserWishlist } from '../api/admin'
import type { AdminUserRow, AdminUserOrder, AdminCartItem, AdminWishlistProduct } from '../types'
import ABadge from '../components/ui/ABadge.vue'

const props  = defineProps<{ id: string }>()
const { t } = useI18n()
const userId = Number(props.id)

const activeTab       = ref<'orders' | 'cart' | 'wishlist'>('orders')
const user            = ref<AdminUserRow | null>(null)
const orders          = ref<AdminUserOrder[]>([])
const cartItems       = ref<AdminCartItem[]>([])
const wishlistItems   = ref<AdminWishlistProduct[]>([])
const profileLoading  = ref(true)
const ordersLoading   = ref(true)
const cartLoading     = ref(true)
const wishlistLoading = ref(true)
const error           = ref<string | null>(null)

async function loadProfile() {
  try {
    const res  = await apiGetUser(userId)
    user.value = res.data
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load customer'
  } finally {
    profileLoading.value = false
  }
}

async function loadOrders() {
  try {
    const res    = await apiGetUserOrders(userId)
    orders.value = res.data as unknown as AdminUserOrder[]
  } catch {
    // non-fatal
  } finally {
    ordersLoading.value = false
  }
}

async function loadCart() {
  try {
    const res       = await apiGetUserCart(userId)
    cartItems.value = res.data as unknown as AdminCartItem[]
  } catch {
    // non-fatal: tab will show empty state
  } finally {
    cartLoading.value = false
  }
}

async function loadWishlist() {
  try {
    const res          = await apiGetUserWishlist(userId)
    wishlistItems.value = res.data as unknown as AdminWishlistProduct[]
  } catch {
    // non-fatal
  } finally {
    wishlistLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
  loadOrders()
  loadCart()
  loadWishlist()
})
</script>

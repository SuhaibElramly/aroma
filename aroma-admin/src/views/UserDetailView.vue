<!-- aroma-admin/src/views/UserDetailView.vue -->
<template>
  <div class="space-y-6 max-w-4xl">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs">
      <RouterLink to="/users" class="text-dash-faint hover:text-dash-text transition-colors">Customers</RouterLink>
      <span class="text-dash-border">/</span>
      <span class="text-dash-text font-medium">User #{{ id }}</span>
    </div>

    <!-- Error -->
    <div v-if="error" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ error }}
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-dash-border">
      <button
        v-for="tab in (['cart', 'wishlist'] as const)"
        :key="tab"
        @click="activeTab = tab"
        :class="[
          'px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
          activeTab === tab
            ? 'border-dash-primary text-dash-primary'
            : 'border-transparent text-dash-muted hover:text-dash-text',
        ]"
      >
        {{ tab === 'cart' ? 'Cart' : 'Wishlist' }}
        <span v-if="tab === 'cart' && cartItems.length" class="ml-1.5 bg-dash-border rounded-full px-1.5 py-0.5 text-[10px]">{{ cartItems.length }}</span>
        <span v-if="tab === 'wishlist' && wishlistItems.length" class="ml-1.5 bg-dash-border rounded-full px-1.5 py-0.5 text-[10px]">{{ wishlistItems.length }}</span>
      </button>
    </div>

    <!-- Cart tab -->
    <div v-if="activeTab === 'cart'">
      <div v-if="cartLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-16 bg-dash-border rounded-card animate-pulse" />
      </div>
      <div v-else-if="cartItems.length === 0" class="py-12 text-center text-xs text-dash-faint">
        Cart is empty
      </div>
      <div v-else class="bg-dash-surface rounded-card shadow-card divide-y divide-dash-border">
        <div
          v-for="item in cartItems"
          :key="item.product.id"
          class="flex items-center gap-4 px-5 py-4"
        >
          <div class="h-12 w-12 rounded-lg overflow-hidden bg-dash-border flex-shrink-0">
            <img v-if="item.product.thumbnailUrl" :src="item.product.thumbnailUrl" class="h-full w-full object-cover" />
            <div v-else class="h-full w-full flex items-center justify-center text-dash-faint">
              <Package :size="18" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-dash-text truncate">{{ item.product.name }}</p>
            <p class="text-[10px] text-dash-muted">{{ item.product.brand }} · {{ item.product.selectedSize }} ml</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-semibold text-dash-text">{{ Number(item.product.price).toFixed(2) }} LYD</p>
            <p class="text-[10px] text-dash-muted">Qty: {{ item.quantity }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Wishlist tab -->
    <div v-if="activeTab === 'wishlist'">
      <div v-if="wishlistLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-16 bg-dash-border rounded-card animate-pulse" />
      </div>
      <div v-else-if="wishlistItems.length === 0" class="py-12 text-center text-xs text-dash-faint">
        Wishlist is empty
      </div>
      <div v-else class="bg-dash-surface rounded-card shadow-card divide-y divide-dash-border">
        <div
          v-for="product in wishlistItems"
          :key="product.id"
          class="flex items-center gap-4 px-5 py-4"
        >
          <div class="h-12 w-12 rounded-lg overflow-hidden bg-dash-border flex-shrink-0">
            <img v-if="product.thumbnailUrl" :src="product.thumbnailUrl" class="h-full w-full object-cover" />
            <div v-else class="h-full w-full flex items-center justify-center text-dash-faint">
              <Package :size="18" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-dash-text truncate">{{ product.name }}</p>
            <p class="text-[10px] text-dash-muted">{{ product.brand }} · {{ product.selectedSize }} ml</p>
          </div>
          <div class="text-right flex flex-col items-end gap-1">
            <p class="text-xs font-semibold text-dash-text">{{ Number(product.price).toFixed(2) }} LYD</p>
            <ABadge :status="product.stock" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Package } from 'lucide-vue-next'
import { apiGetUserCart, apiGetUserWishlist } from '../api/admin'
import type { AdminCartItem, AdminWishlistProduct } from '../types'
import ABadge from '../components/ui/ABadge.vue'

const props  = defineProps<{ id: string }>()
const userId = Number(props.id)

const activeTab       = ref<'cart' | 'wishlist'>('cart')
const cartItems       = ref<AdminCartItem[]>([])
const wishlistItems   = ref<AdminWishlistProduct[]>([])
const cartLoading     = ref(false)
const wishlistLoading = ref(false)
const error           = ref<string | null>(null)

async function loadCart() {
  cartLoading.value = true
  try {
    const res = await apiGetUserCart(userId)
    cartItems.value = res.data as unknown as AdminCartItem[]
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load cart'
  } finally {
    cartLoading.value = false
  }
}

async function loadWishlist() {
  wishlistLoading.value = true
  try {
    const res = await apiGetUserWishlist(userId)
    wishlistItems.value = res.data as unknown as AdminWishlistProduct[]
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load wishlist'
  } finally {
    wishlistLoading.value = false
  }
}

onMounted(() => {
  loadCart()
  loadWishlist()
})
</script>

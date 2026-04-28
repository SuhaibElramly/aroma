<template>
  <div class="space-y-4">
    <!-- Status filter pills -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="opt in statusOptions"
        :key="opt.value"
        @click="setStatus(opt.value)"
        :class="[
          'rounded-full px-3 py-1 text-xs font-medium border transition-all',
          activeStatus === opt.value
            ? 'bg-dash-text text-white border-dash-text'
            : 'bg-dash-surface text-dash-muted border-dash-border hover:border-dash-text hover:text-dash-text',
        ]"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Table -->
    <ATable
      :columns="cols"
      :rows="items"
      :loading="loading"
      :on-row-click="(row) => router.push({ name: 'order-detail', params: { id: (row as AdminOrder).id } })"
    >
      <template #cell-id="{ value }">
        <span class="font-mono text-[11px] text-dash-muted">{{ value }}</span>
      </template>
      <template #cell-status="{ value }">
        <ABadge :status="value as string" />
      </template>
      <template #cell-total="{ value }">
        {{ Number(value).toFixed(2) }} LYD
      </template>
      <template #cell-isPickup="{ value }">
        <span :class="[
          'text-[11px] rounded-full px-2 py-0.5',
          value ? 'bg-dash-secondary-lt text-dash-secondary' : 'bg-dash-border-lt text-dash-muted'
        ]">
          {{ value ? 'Pickup' : 'Delivery' }}
        </span>
      </template>
      <template #empty>
        <AEmptyState :icon="ShoppingBag" heading="No orders found" sub="Try a different status filter" />
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShoppingBag } from 'lucide-vue-next'
import { apiGetOrders } from '../api/admin'
import type { AdminOrder } from '../types'
import { usePagination } from '../composables/usePagination'
import ATable      from '../components/ui/ATable.vue'
import ABadge      from '../components/ui/ABadge.vue'
import APagination from '../components/ui/APagination.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const router       = useRouter()
const activeStatus = ref('')

const statusOptions = [
  { value: '',          label: 'All' },
  { value: 'placed',    label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready',     label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const cols = [
  { key: 'id',        label: 'Order ID' },
  { key: 'user',      label: 'Customer' },
  { key: 'itemCount', label: 'Items' },
  { key: 'total',     label: 'Total' },
  { key: 'status',    label: 'Status' },
  { key: 'isPickup',  label: 'Type' },
  { key: 'date',      label: 'Date' },
]

const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetOrders({ status: activeStatus.value || undefined, page }).then((r) => r.data),
)

function setStatus(s: string) {
  activeStatus.value = s
  fetch(1)
}

onMounted(() => fetch(1))
</script>

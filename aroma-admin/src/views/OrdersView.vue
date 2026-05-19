<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1280px]">

    <!-- KPI strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-dash-paper border border-dash-border rounded-card p-5">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('orders.filterAll') }}</p>
        <p class="font-display text-[28px] leading-none mt-2 text-dash-text tabular-nums">{{ meta?.total ?? '—' }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">all time</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('orders.filterPlaced') }}</p>
        <p class="font-display text-[28px] leading-none mt-2 text-dash-text tabular-nums">
          {{ activeStatus === 'placed' ? (meta?.total ?? '—') : '—' }}
        </p>
        <p class="text-[11.5px] mt-2 text-dash-muted">awaiting confirmation</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('orders.filterShipped') }}</p>
        <p class="font-display text-[28px] leading-none mt-2 text-dash-text tabular-nums">
          {{ activeStatus === 'delivered' ? (meta?.total ?? '—') : '—' }}
        </p>
        <p class="text-[11.5px] mt-2 text-dash-muted">delivered orders</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('orders.filterCancelled') }}</p>
        <p class="font-display text-[28px] leading-none mt-2 text-dash-text tabular-nums">
          {{ activeStatus === 'cancelled' ? (meta?.total ?? '—') : '—' }}
        </p>
        <p class="text-[11.5px] mt-2 text-dash-muted">action needed</p>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="bg-dash-paper border border-dash-border rounded-card p-4 flex items-center gap-3 flex-wrap">
      <!-- Status pills group -->
      <div class="flex items-center gap-1 p-1 rounded-lg border border-dash-border-lt bg-dash-paper-2 overflow-x-auto">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          @click="setStatus(opt.value)"
          :class="[
            'rounded-lg px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-all',
            activeStatus === opt.value
              ? 'bg-dash-text text-white shadow-sm'
              : 'text-dash-muted hover:text-dash-text',
          ]"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Search input -->
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dash-border-lt bg-dash-paper-2 flex-1 min-w-[200px]">
        <Search :size="13" class="text-dash-faint shrink-0" />
        <input
          v-model="searchQuery"
          :placeholder="t('orders.searchPlaceholder')"
          class="bg-transparent text-[12.5px] outline-none flex-1 text-dash-text-2 placeholder:text-dash-faint"
        />
      </div>

      <!-- Date range inputs -->
      <div class="flex items-center gap-2">
        <input
          v-model="dateFrom"
          type="date"
          class="h-9 px-3 rounded-lg border border-dash-border bg-dash-paper text-[12px] text-dash-text-2 outline-none"
        />
        <span class="text-dash-faint text-[11px]">—</span>
        <input
          v-model="dateTo"
          type="date"
          class="h-9 px-3 rounded-lg border border-dash-border bg-dash-paper text-[12px] text-dash-text-2 outline-none"
        />
      </div>
    </div>

    <!-- Table -->
    <ATable
      :columns="cols"
      :rows="items"
      :loading="loading"
      :on-row-click="(row) => router.push({ name: 'order-detail', params: { id: (row as AdminOrder).id } })"
    >
      <template #cell-id="{ value }">
        <span class="font-mono text-[11px] text-dash-muted font-semibold">{{ value }}</span>
      </template>
      <template #cell-status="{ value }">
        <ABadge :status="value as string" />
      </template>
      <template #cell-total="{ value }">
        <span class="font-display text-[14px] text-dash-text font-semibold tabular-nums">
          {{ Number(value).toFixed(2) }}
        </span>
        <span class="text-dash-muted text-[11px] ml-1">LYD</span>
      </template>
      <template #cell-isPickup="{ value }">
        <span :class="[
          'text-[11px] rounded-full px-2 py-0.5',
          value ? 'bg-dash-secondary-lt text-dash-secondary' : 'bg-dash-border-lt text-dash-muted'
        ]">
          {{ value ? t('orderDetail.pickup') : t('orderDetail.homeDelivery') }}
        </span>
      </template>
      <template #empty>
        <AEmptyState :icon="ShoppingBag" :heading="t('orders.noOrders')" sub="" />
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ShoppingBag, Search } from 'lucide-vue-next'
import { apiGetOrders } from '../api/admin'
import type { AdminOrder } from '../types'
import { usePagination } from '../composables/usePagination'
import ATable      from '../components/ui/ATable.vue'
import ABadge      from '../components/ui/ABadge.vue'
import APagination from '../components/ui/APagination.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const { t } = useI18n()
const router       = useRouter()
const activeStatus = ref('')
const searchQuery  = ref('')
const dateFrom     = ref('')
const dateTo       = ref('')

// Derived search fields from unified query
const searchId    = computed(() => searchQuery.value.trim().startsWith('ORD') ? searchQuery.value.trim() : '')
const searchPhone = computed(() => /^\d/.test(searchQuery.value.trim()) ? searchQuery.value.trim() : '')

const statusOptions = computed(() => [
  { value: '',          label: t('orders.filterAll') },
  { value: 'placed',    label: t('orders.filterPlaced') },
  { value: 'confirmed', label: t('orders.filterConfirmed') },
  { value: 'preparing', label: t('orders.filterPreparing') },
  { value: 'ready',     label: t('orders.filterReady') },
  { value: 'delivered', label: t('orders.filterDelivered') },
  { value: 'cancelled', label: t('orders.filterCancelled') },
])

const cols = computed(() => [
  { key: 'id',        label: t('orders.columns.id') },
  { key: 'user',      label: t('orders.columns.customer') },
  { key: 'itemCount', label: t('orders.columns.items') },
  { key: 'total',     label: t('orders.columns.total') },
  { key: 'status',    label: t('orders.columns.status') },
  { key: 'isPickup',  label: t('orders.columns.type') },
  { key: 'date',      label: t('orders.columns.date') },
])

const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetOrders({
    status:    activeStatus.value || undefined,
    order_id:  searchId.value     || undefined,
    phone:     searchPhone.value  || undefined,
    date_from: dateFrom.value     || undefined,
    date_to:   dateTo.value       || undefined,
    page,
  }).then((r) => r.data),
)

function setStatus(s: string) {
  activeStatus.value = s
  fetch(1)
}

let debounceTimer: ReturnType<typeof setTimeout>

watch([searchQuery, dateFrom, dateTo], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 380)
})

onUnmounted(() => clearTimeout(debounceTimer))

onMounted(() => fetch(1))
</script>

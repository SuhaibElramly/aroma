<template>
  <div class="space-y-4">

    <!-- Search fields -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <AInput
        v-model="searchId"
        :label="t('orders.filterOrderId')"
        placeholder="e.g. ORD-001"
      />
      <AInput
        v-model="searchPhone"
        :label="t('orders.filterPhone')"
        placeholder="e.g. 0912345678"
      />
      <AInput
        v-model="dateFrom"
        :label="t('orders.filterFrom')"
        type="date"
      />
      <AInput
        v-model="dateTo"
        :label="t('orders.filterTo')"
        type="date"
      />
    </div>

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
import { ShoppingBag } from 'lucide-vue-next'
import { apiGetOrders } from '../api/admin'
import type { AdminOrder } from '../types'
import { usePagination } from '../composables/usePagination'
import ATable      from '../components/ui/ATable.vue'
import ABadge      from '../components/ui/ABadge.vue'
import APagination from '../components/ui/APagination.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'
import AInput      from '../components/ui/AInput.vue'

const { t } = useI18n()
const router       = useRouter()
const activeStatus = ref('')
const searchId     = ref('')
const searchPhone  = ref('')
const dateFrom     = ref('')
const dateTo       = ref('')

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
    order_id:  searchId.value.trim()    || undefined,
    phone:     searchPhone.value.trim() || undefined,
    date_from: dateFrom.value           || undefined,
    date_to:   dateTo.value             || undefined,
    page,
  }).then((r) => r.data),
)

function setStatus(s: string) {
  activeStatus.value = s
  fetch(1)
}

let debounceTimer: ReturnType<typeof setTimeout>

watch([searchId, searchPhone, dateFrom, dateTo], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 380)
})

onUnmounted(() => clearTimeout(debounceTimer))

onMounted(() => fetch(1))
</script>

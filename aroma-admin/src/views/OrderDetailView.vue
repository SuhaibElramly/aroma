<template>
  <!-- Loading -->
  <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
    <div class="space-y-5">
      <div class="h-20 rounded-xl bg-dash-surface border border-dash-border animate-pulse" />
      <div class="h-60 rounded-xl bg-dash-surface border border-dash-border animate-pulse" />
    </div>
    <div class="space-y-4">
      <div class="h-52 rounded-xl bg-dash-surface border border-dash-border animate-pulse" />
      <div class="h-40 rounded-xl bg-dash-surface border border-dash-border animate-pulse" />
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="rounded-xl bg-dash-danger-lt border border-dash-danger/20 px-5 py-4 text-sm text-dash-danger max-w-lg">
    {{ error }}
  </div>

  <!-- Content -->
  <div v-else-if="order" class="space-y-6">

    <!-- Page header -->
    <div class="flex items-start justify-between gap-6">
      <div>
        <RouterLink
          to="/orders"
          class="inline-flex items-center gap-1 text-xs text-dash-faint hover:text-dash-muted transition-colors mb-3"
        >
          <ArrowLeft :size="12" />
          {{ t('orderDetail.back') }}
        </RouterLink>
        <div class="flex items-center gap-2.5 flex-wrap">
          <h2 class="text-xl font-semibold text-dash-text tracking-tight">{{ order.user }}</h2>
          <ABadge :status="order.status" />
        </div>
        <p class="text-sm text-dash-muted mt-0.5">{{ order.userEmail }}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="font-mono text-xs text-dash-faint leading-none">{{ order.id }}</p>
        <p class="text-xs text-dash-muted mt-1.5">{{ order.date }}</p>
      </div>
    </div>

    <!-- Two-column body -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

      <!-- LEFT: items table -->
      <div class="bg-dash-surface rounded-xl border border-dash-border overflow-hidden">
        <div class="px-5 py-4 border-b border-dash-border flex items-center justify-between">
          <p class="text-sm font-semibold text-dash-text">{{ t('orderDetail.items') }}</p>
          <span class="text-xs text-dash-faint">
            {{ order.items?.length ?? order.itemCount }}
            item{{ (order.items?.length ?? order.itemCount) !== 1 ? 's' : '' }}
          </span>
        </div>
        <table class="w-full text-xs">
          <thead>
            <tr class="text-left border-b border-dash-border-lt">
              <th class="px-5 py-3 text-dash-faint font-medium">{{ t('orderDetail.product') }}</th>
              <th class="px-3 py-3 text-dash-faint font-medium hidden sm:table-cell">{{ t('orderDetail.brand') }}</th>
              <th class="px-3 py-3 text-dash-faint font-medium">{{ t('orderDetail.size') }}</th>
              <th class="px-3 py-3 text-dash-faint font-medium text-center">{{ t('orderDetail.qty') }}</th>
              <th class="px-5 py-3 text-dash-faint font-medium text-right">{{ t('orderDetail.price') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in mergedItems"
              :key="`${item.name}-${item.brand}-${item.size}`"
              class="border-b border-dash-border-lt last:border-0 hover:bg-dash-bg transition-colors"
            >
              <td class="px-5 py-3.5 font-medium text-dash-text">{{ item.name }}</td>
              <td class="px-3 py-3.5 text-dash-muted hidden sm:table-cell">{{ item.brand }}</td>
              <td class="px-3 py-3.5 text-dash-muted">{{ item.size }} ml</td>
              <td class="px-3 py-3.5 text-dash-muted text-center">{{ item.qty }}</td>
              <td class="px-5 py-3.5 text-right font-medium text-dash-text tabular-nums">
                {{ Number(item.unitPrice).toFixed(2) }}
                <span class="text-dash-faint font-normal ml-0.5">LYD</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-dash-border bg-dash-bg">
              <td colspan="4" class="px-5 py-3.5 text-right text-xs text-dash-faint font-medium">{{ t('orderDetail.orderTotal') }}</td>
              <td class="px-5 py-3.5 text-right tabular-nums">
                <span class="text-sm font-semibold text-dash-text">{{ Number(order.total).toFixed(2) }}</span>
                <span class="text-xs text-dash-faint font-normal ml-1">LYD</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- RIGHT: sidebar -->
      <div class="space-y-4">

        <!-- Order details -->
        <div class="bg-dash-surface rounded-xl border border-dash-border overflow-hidden">
          <div class="px-5 py-4 border-b border-dash-border">
            <p class="text-sm font-semibold text-dash-text">{{ t('orderDetail.orderDetails') }}</p>
          </div>
          <div class="divide-y divide-dash-border-lt">
            <div class="flex items-center justify-between px-5 py-3">
              <span class="text-xs text-dash-faint">{{ t('orderDetail.date') }}</span>
              <span class="text-xs font-medium text-dash-text">{{ order.date }}</span>
            </div>
            <div class="flex items-center justify-between px-5 py-3">
              <span class="text-xs text-dash-faint">{{ t('orderDetail.delivery') }}</span>
              <span class="text-xs font-medium text-dash-text">{{ order.isPickup ? t('orderDetail.pickup') : t('orderDetail.homeDelivery') }}</span>
            </div>
            <div class="flex items-center justify-between px-5 py-3">
              <span class="text-xs text-dash-faint">{{ t('orderDetail.items') }}</span>
              <span class="text-xs font-medium text-dash-text">{{ order.items?.length ?? order.itemCount }}</span>
            </div>
            <div v-if="order.discountAmount" class="flex justify-between text-sm text-dash-muted px-5 py-3">
              <span>{{ t('orderDetail.subtotal') }}</span>
              <span>{{ (parseFloat(String(order.total)) + parseFloat(String(order.discountAmount))).toFixed(2) }} LYD</span>
            </div>
            <div v-if="order.discountAmount" class="flex justify-between text-sm text-dash-muted px-5 py-3">
              <span>Coupon <span class="font-mono font-semibold text-dash-text">{{ order.couponCode }}</span></span>
              <span class="text-dash-success">−{{ order.discountAmount }} LYD</span>
            </div>
            <div class="flex items-center justify-between px-5 py-4">
              <span class="text-xs text-dash-faint">{{ t('orderDetail.total') }}</span>
              <div class="text-right">
                <span class="text-base font-semibold text-dash-text">{{ Number(order.total).toFixed(2) }}</span>
                <span class="text-xs text-dash-faint font-normal ml-1">LYD</span>
              </div>
            </div>
          </div>
          <div v-if="order.note" class="px-5 py-3.5 border-t border-dash-border bg-dash-bg">
            <p class="text-2xs text-dash-faint font-medium uppercase tracking-wide mb-1.5">{{ t('orderDetail.customerNote') }}</p>
            <p class="text-xs text-dash-text leading-relaxed">{{ order.note }}</p>
          </div>
        </div>

        <!-- Timeline -->
        <div class="bg-dash-surface rounded-xl border border-dash-border p-5">
          <p class="text-sm font-semibold text-dash-text mb-4">{{ t('orderDetail.timeline') }}</p>
          <div class="relative pl-1">
            <div class="absolute left-[5px] top-2 bottom-2 w-px bg-dash-border-lt" />
            <div class="space-y-4">
              <div
                v-for="step in order.timeline"
                :key="step.status"
                class="flex items-start gap-3.5 relative"
              >
                <div :class="[
                  'h-2.5 w-2.5 rounded-full shrink-0 mt-0.5 relative z-10 ring-2 ring-dash-surface',
                  step.done ? 'bg-dash-success' : 'bg-dash-border',
                ]" />
                <div class="flex-1 min-w-0 pb-0.5">
                  <p :class="['text-xs leading-snug', step.done ? 'font-medium text-dash-text' : 'text-dash-faint']">
                    {{ step.status }}
                  </p>
                  <p v-if="step.date" class="text-2xs text-dash-faint mt-0.5">{{ step.date }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin actions -->
        <div class="bg-dash-surface rounded-xl border border-dash-border overflow-hidden">
          <div class="px-5 py-4 border-b border-dash-border">
            <p class="text-sm font-semibold text-dash-text">{{ t('orderDetail.actions') }}</p>
          </div>
          <div class="p-5 space-y-5">

            <div class="space-y-2.5">
              <ASelect
                v-model="newStatus"
                :label="t('orderDetail.updateStatusLabel')"
                :placeholder="t('orderDetail.chooseStatus')"
                :options="statusOptions"
              />
              <AButton
                class="w-full justify-center"
                @click="handleStatusUpdate"
                :loading="updatingStatus"
                :disabled="!newStatus"
              >
                {{ t('orderDetail.apply') }}
              </AButton>
            </div>

            <div class="h-px bg-dash-border-lt" />

            <div class="space-y-2.5">
              <ATextarea
                v-model="adminNote"
                :label="t('orderDetail.noteToCustomer')"
                :placeholder="t('orderDetail.noteToCustomerPlaceholder')"
              />
              <AButton
                variant="secondary"
                class="w-full justify-center"
                @click="handleSaveNote"
                :loading="savingNote"
                :disabled="!adminNote.trim()"
              >
                {{ t('orderDetail.saveNote') }}
              </AButton>
            </div>

            <div v-if="order.adminNote" class="rounded-lg bg-dash-bg border border-dash-border px-4 py-3 text-xs">
              <p class="text-2xs text-dash-faint font-medium uppercase tracking-wide mb-1.5">{{ t('orderDetail.noteToCustomer') }}</p>
              <p class="text-dash-text leading-relaxed">{{ order.adminNote }}</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>

  <div v-else class="text-sm text-dash-faint py-16 text-center">{{ t('orderDetail.orderNotFound') }}</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { apiGetOrder, apiUpdateOrderStatus, apiAddAdminNote } from '../api/admin'
import type { AdminOrder } from '../types'
import ABadge    from '../components/ui/ABadge.vue'
import ASelect   from '../components/ui/ASelect.vue'
import ATextarea from '../components/ui/ATextarea.vue'
import AButton   from '../components/ui/AButton.vue'

const { t } = useI18n()
const props = defineProps<{ id: string }>()

const order          = ref<AdminOrder | null>(null)
const loading        = ref(true)
const error          = ref<string | null>(null)
const newStatus      = ref('')
const adminNote      = ref('')
const updatingStatus = ref(false)
const savingNote     = ref(false)

const mergedItems = computed(() => {
  if (!order.value?.items) return []
  const map = new Map<string, AdminOrderItem & { qty: number }>()
  for (const item of order.value.items) {
    const key = `${item.name}|||${item.brand}|||${item.size}`
    if (map.has(key)) {
      map.get(key)!.qty += item.qty
    } else {
      map.set(key, { ...item })
    }
  }
  return Array.from(map.values())
})

const statusOptions = computed(() => [
  { value: 'placed',    label: t('orders.filterPlaced') },
  { value: 'confirmed', label: t('orders.filterConfirmed') },
  { value: 'preparing', label: t('orders.filterPreparing') },
  { value: 'ready',     label: t('orders.filterReady') },
  { value: 'delivered', label: t('orders.filterDelivered') },
  { value: 'cancelled', label: t('orders.filterCancelled') },
])

onMounted(async () => {
  try {
    const res   = await apiGetOrder(props.id)
    order.value = res.data
    adminNote.value = order.value.adminNote ?? ''
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load order.'
  } finally {
    loading.value = false
  }
})

async function handleStatusUpdate() {
  if (!newStatus.value || !order.value) return
  updatingStatus.value = true
  try {
    const res   = await apiUpdateOrderStatus(order.value.id, newStatus.value)
    order.value = res.data
    newStatus.value = ''
  } finally {
    updatingStatus.value = false
  }
}

async function handleSaveNote() {
  if (!adminNote.value.trim() || !order.value) return
  savingNote.value = true
  try {
    await apiAddAdminNote(order.value.id, adminNote.value)
    if (order.value) order.value.adminNote = adminNote.value
  } finally {
    savingNote.value = false
  }
}
</script>

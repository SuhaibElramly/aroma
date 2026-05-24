<template>
  <!-- Loading -->
  <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
    <div class="space-y-5">
      <div class="h-20 rounded-card bg-dash-bg border border-dash-border animate-pulse" />
      <div class="h-60 rounded-card bg-dash-bg border border-dash-border animate-pulse" />
    </div>
    <div class="space-y-4">
      <div class="h-52 rounded-card bg-dash-bg border border-dash-border animate-pulse" />
      <div class="h-40 rounded-card bg-dash-bg border border-dash-border animate-pulse" />
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-5 py-4 text-sm text-dash-danger max-w-lg">
    {{ error }}
  </div>

  <!-- Content -->
  <div v-else-if="order" class="space-y-5 pb-10">

    <!-- Page header bar -->
    <div class="flex items-center justify-between">
      <RouterLink
        to="/orders"
        class="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-dash-text-2 hover:text-dash-text transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        {{ t('orderDetail.back') }}
      </RouterLink>
      <div class="flex items-center gap-2">
        <button class="h-9 px-3 rounded-btn border border-dash-border text-[12.5px] flex items-center gap-1.5 bg-dash-paper text-dash-text-2 whitespace-nowrap hover:bg-dash-bg transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M6 17h12v4H6z"/>
          </svg>
          {{ t('orderDetail.print') }}
        </button>
        <button class="h-9 px-3 rounded-btn border border-dash-danger/30 text-[12.5px] flex items-center gap-1.5 bg-dash-danger-lt text-dash-danger whitespace-nowrap hover:opacity-90 transition-opacity">
          {{ t('orderDetail.refund') }}
        </button>
        <button
          @click="showStatusPanel = !showStatusPanel"
          class="h-9 px-3.5 rounded-btn text-[12.5px] font-medium text-white inline-flex items-center gap-1.5 bg-dash-text whitespace-nowrap hover:opacity-90 transition-opacity"
        >
          {{ t('orderDetail.updateStatusBtn') }}
        </button>
      </div>
    </div>

    <!-- Order header card -->
    <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6 flex items-start justify-between gap-6">
      <div class="min-w-0">
        <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint whitespace-nowrap">{{ t('orderDetail.orderLabel') }}</p>
        <div class="flex items-baseline gap-3 mt-1 flex-wrap">
          <h1 class="font-display text-[28px] tabular-nums text-dash-text">{{ order.id }}</h1>
          <ABadge :status="order.status" />
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-dash-bg border border-dash-border text-dash-muted">
            {{ order.isPickup ? t('orderDetail.inStore') : t('orderDetail.delivery') }}
          </span>
        </div>
        <p class="text-[12px] mt-1 tabular-nums text-dash-muted">{{ order.date }}</p>
      </div>
      <div class="text-end shrink-0">
        <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('orderDetail.totalLabel') }}</p>
        <p class="font-display text-[28px] tabular-nums mt-1 text-dash-text">
          {{ Number(order.total).toFixed(2) }}
          <span class="text-[13px] font-normal text-dash-muted">LYD</span>
        </p>
        <p class="text-[11px] tabular-nums text-dash-muted">
          {{ order.items?.length ?? order.itemCount }} {{ (order.items?.length ?? order.itemCount) === 1 ? t('orderDetail.itemSingular') : t('orderDetail.itemPlural') }}
        </p>
      </div>
    </div>

    <!-- Two-column body -->
    <div class="grid grid-cols-12 gap-5 items-start">

      <!-- LEFT: line items + timeline -->
      <div class="col-span-8 space-y-5">

        <!-- Line items -->
        <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6">
          <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('orderDetail.items') }}</p>
          <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">
            {{ mergedItems.length }} {{ mergedItems.length === 1 ? t('orderDetail.itemSingular') : t('orderDetail.itemPlural') }}
          </h3>

          <table class="w-full text-[12.5px] mt-4">
            <thead>
              <tr class="text-[10.5px] uppercase tracking-wider text-dash-faint">
                <th class="text-start font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.product') }}</th>
                <th class="text-start font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.size') }}</th>
                <th class="text-end font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.qty') }}</th>
                <th class="text-end font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.price') }}</th>
                <th class="text-end font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.totalLabel') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in mergedItems"
                :key="`${item.name}-${item.brand}-${item.size}`"
              >
                <td class="py-3 border-b border-dash-border-lt">
                  <div class="flex items-center gap-3">
                    <!-- Bottle thumbnail -->
                    <div
                      class="h-10 w-10 rounded-md overflow-hidden shrink-0 relative"
                      :style="{ background: `oklch(94% 0.04 ${itemHue(item.name)})` }"
                    >
                      <div class="absolute inset-0 opacity-[0.08]" style="background-image: repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,.5) 6px 7px)" />
                      <svg viewBox="0 0 80 80" class="absolute inset-0 m-auto" style="width:70%;height:70%">
                        <g
                          fill="none"
                          :stroke="`oklch(28% 0.06 ${itemHue(item.name)})`"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          opacity="0.7"
                        >
                          <path d="M32 10h16v8l3 5v6"/>
                          <rect x="24" y="29" width="32" height="38" rx="5"/>
                          <path d="M32 14h16"/>
                        </g>
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium text-dash-text">{{ item.name }}</p>
                      <p class="text-[10.5px] tabular-nums text-dash-faint">{{ item.brand }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-3 border-b border-dash-border-lt tabular-nums text-dash-muted">{{ item.size }} ml</td>
                <td class="py-3 border-b border-dash-border-lt tabular-nums text-end text-dash-text-2">×{{ item.qty }}</td>
                <td class="py-3 border-b border-dash-border-lt tabular-nums text-end text-dash-text-2">
                  {{ Number(item.unitPrice).toFixed(2) }}
                  <span class="text-[10.5px] text-dash-muted">LYD</span>
                </td>
                <td class="py-3 border-b border-dash-border-lt tabular-nums text-end font-semibold whitespace-nowrap text-dash-text">
                  {{ (Number(item.unitPrice) * item.qty).toFixed(2) }}
                  <span class="text-[10.5px] font-normal text-dash-muted">LYD</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Order totals -->
          <div class="mt-4 ms-auto w-[300px] space-y-1.5 text-[12.5px]">
            <div class="flex items-center justify-between">
              <span class="text-dash-muted">{{ t('orderDetail.subtotal') }}</span>
              <span class="tabular-nums text-dash-text-2">{{ subtotal.toFixed(2) }} LYD</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-dash-muted">{{ t('orderDetail.shipping') }}</span>
              <span class="tabular-nums" :class="order.isPickup ? 'text-dash-success-dk' : 'text-dash-text-2'">
                {{ order.isPickup ? t('orderDetail.freeShipping') : '—' }}
              </span>
            </div>
            <div v-if="order.discountAmount" class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 text-dash-muted">
                {{ t('orderDetail.coupon') }}
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-dash-success-lt text-dash-success-dk">
                  {{ order.couponCode }}
                </span>
              </span>
              <span class="tabular-nums text-dash-success-dk">−{{ order.discountAmount }} LYD</span>
            </div>
            <div class="flex items-center justify-between pt-2 mt-1 border-t border-dash-border-lt">
              <span class="font-display text-[15px] text-dash-text">{{ t('orderDetail.total') }}</span>
              <span class="font-display text-[18px] tabular-nums text-dash-text">
                {{ Number(order.total).toFixed(2) }}
                <span class="text-[11px] font-normal text-dash-muted">LYD</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6">
          <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('orderDetail.timeline') }}</p>
          <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">{{ t('orderDetail.orderJourney') }}</h3>

          <div class="relative mt-5">
            <div class="absolute start-[7px] top-2 bottom-2 w-px bg-dash-border" />
            <div class="space-y-3.5">
              <div
                v-for="step in timelineSteps"
                :key="step.key"
                class="flex items-start gap-3"
              >
                <div
                  class="h-[15px] w-[15px] rounded-full border-2 grid place-items-center shrink-0 mt-0.5 relative z-10"
                  :class="step.done
                    ? 'bg-dash-success border-dash-success'
                    : step.isCurrent
                    ? 'bg-dash-paper border-dash-text'
                    : 'bg-dash-bg border-dash-border-lt'"
                >
                  <svg v-if="step.done" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5">
                    <path d="M5 12l5 5 9-11"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <p
                    class="text-[12.5px]"
                    :class="step.done
                      ? 'font-semibold text-dash-text'
                      : step.isCurrent
                      ? 'font-semibold text-dash-text'
                      : 'text-dash-faint'"
                  >{{ step.label }}</p>
                  <p v-if="step.date" class="text-[10.5px] tabular-nums mt-0.5 text-dash-faint">{{ step.date }}</p>
                  <p v-else-if="!step.done" class="text-[10.5px] mt-0.5 text-dash-faint">{{ t('orders.filterPending') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Status update panel (inline below timeline if open) -->
        <div v-if="showStatusPanel" class="bg-dash-paper border border-dash-border rounded-card p-6 space-y-4">
          <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('orderDetail.actions') }}</p>

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

          <div v-if="order.adminNote" class="rounded-btn bg-dash-bg border border-dash-border px-4 py-3 text-xs">
            <p class="text-[10px] text-dash-faint font-medium uppercase tracking-wide mb-1.5">{{ t('orderDetail.noteToCustomer') }}</p>
            <p class="text-dash-text leading-relaxed">{{ order.adminNote }}</p>
          </div>
        </div>
      </div>

      <!-- RIGHT: customer + payment + note -->
      <div class="col-span-4 space-y-5">

        <!-- Customer card -->
        <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-5">
          <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('orderDetail.customer') }}</p>
          <div class="flex items-center gap-3 mt-3">
            <div class="h-11 w-11 rounded-full grid place-items-center text-[13px] font-semibold text-white shrink-0 bg-dash-text select-none">
              {{ initials }}
            </div>
            <div class="min-w-0">
              <p class="font-display text-[15px] text-dash-text">{{ order.user }}</p>
              <p class="text-[10.5px] text-dash-faint">{{ t('orderDetail.customerSince') }} {{ customerSince }}</p>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-dash-border-lt space-y-1.5 text-[11.5px]">
            <p class="flex items-center gap-2 text-dash-text-2">
              <span class="text-dash-faint shrink-0">{{ t('orderDetail.emailLabel') }}</span>
              <span class="tabular-nums truncate">{{ order.userEmail }}</span>
            </p>
            <p class="flex items-center gap-2 text-dash-text-2">
              <span class="text-dash-faint shrink-0">{{ t('orderDetail.lifetimeLabel') }}</span>
              <span class="text-dash-text">{{ order.user }}</span>
            </p>
          </div>
        </div>

        <!-- Shipping / pickup card -->
        <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-5">
          <div class="flex items-center justify-between">
            <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">
              {{ order.isPickup ? t('orderDetail.pickup') : t('orderDetail.homeDelivery') }}
            </p>
            <span v-if="order.isPickup" class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-dash-fig-lt text-dash-fig">
              {{ t('orderDetail.pickup') }}
            </span>
          </div>
          <div class="mt-3 text-[12.5px] leading-relaxed text-dash-text-2">
            <template v-if="order.isPickup">
              <p class="font-semibold text-dash-text">{{ t('orderDetail.storeNameLabel') }}</p>
              <p class="text-dash-muted">{{ t('orderDetail.storeAddressLabel') }}</p>
              <p class="text-[11px] mt-1 text-dash-faint">{{ t('orderDetail.collectionNote') }}</p>
            </template>
            <template v-else>
              <p class="font-semibold text-dash-text">{{ order.user }}</p>
              <p class="text-dash-muted">{{ t('orderDetail.homeDelivery') }}</p>
              <p class="text-[11px] mt-2 tabular-nums text-dash-faint">{{ t('orderDetail.courierNote') }}</p>
            </template>
          </div>
        </div>

        <!-- Payment card -->
        <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-5 space-y-4">

          <!-- Header row: label + status badge -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('orderDetail.paymentLabel') }}</p>
              <p class="text-[11px] text-dash-muted mt-0.5">{{ t('paymentMethod') }}</p>
            </div>
            <ABadge :status="payments?.paymentStatus ?? order.paymentStatus ?? 'not_paid'" />
          </div>

          <!-- Financial summary rows -->
          <div class="space-y-1.5 text-[12.5px]">
            <div class="flex items-center justify-between">
              <span class="text-dash-muted">{{ t('paymentTotal') }}</span>
              <span class="tabular-nums text-dash-text-2">{{ Number(order.total).toFixed(2) }} LYD</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-dash-muted">{{ t('paymentPaid_amount') }}</span>
              <span
                class="tabular-nums font-semibold"
                :class="(payments?.paid ?? 0) > 0 ? 'text-dash-success-dk' : 'text-dash-text-2'"
              >{{ (payments?.paid ?? 0).toFixed(2) }} LYD</span>
            </div>
            <div class="flex items-center justify-between pt-1.5 border-t border-dash-border-lt">
              <span class="text-dash-muted">{{ t('paymentRemaining') }}</span>
              <span
                class="tabular-nums font-semibold"
                :class="paymentRemaining > 0 ? 'text-dash-danger' : 'text-dash-text-2'"
              >{{ paymentRemaining.toFixed(2) }} LYD</span>
            </div>
          </div>

          <!-- Payment history -->
          <div class="pt-1">
            <p class="text-[10.5px] tracking-[.14em] uppercase font-semibold text-dash-faint mb-2">{{ t('paymentHistory') }}</p>
            <div v-if="payments && payments.payments.length > 0" class="space-y-2">
              <div
                v-for="payment in payments.payments"
                :key="payment.id"
                class="flex items-start justify-between gap-3 rounded-btn bg-dash-bg border border-dash-border-lt px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="text-[11.5px] tabular-nums text-dash-muted">{{ payment.createdAt }}</p>
                  <p v-if="payment.note" class="text-[10.5px] text-dash-faint mt-0.5 truncate">{{ payment.note }}</p>
                </div>
                <span class="text-[12.5px] tabular-nums font-semibold text-dash-success-dk shrink-0">+{{ Number(payment.amount).toFixed(2) }} LYD</span>
              </div>
            </div>
            <p v-else class="text-[11px] text-dash-faint italic">{{ t('paymentNoHistory') }}</p>
          </div>

          <!-- Add payment form -->
          <div class="pt-1 border-t border-dash-border-lt space-y-2.5">
            <p class="text-[10.5px] tracking-[.14em] uppercase font-semibold text-dash-faint">{{ t('paymentAddTitle') }}</p>
            <AInput
              v-model="paymentAmount"
              :label="t('paymentAmount')"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            <AInput
              v-model="paymentNote"
              :label="t('paymentNote')"
              placeholder="…"
            />
            <AButton
              class="w-full justify-center"
              :loading="addingPayment"
              :disabled="!paymentAmount || Number(paymentAmount) <= 0"
              @click="handleAddPayment"
            >
              {{ t('paymentAddBtn') }}
            </AButton>
          </div>

        </div>

        <!-- Customer note card -->
        <div v-if="order.note" class="bg-dash-fig-lt border border-dash-fig/20 rounded-card p-4">
          <p class="text-[10px] uppercase tracking-[.14em] font-semibold text-dash-fig mb-2">
            {{ t('orderDetail.customerNote') }}
          </p>
          <p class="text-[13px] leading-relaxed text-dash-text italic">{{ order.note }}</p>
        </div>

      </div>
    </div>
  </div>

  <div v-else class="text-sm text-dash-faint py-16 text-center">{{ t('orderDetail.orderNotFound') }}</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { apiGetOrder, apiUpdateOrderStatus, apiAddAdminNote, apiGetOrderPayments, apiAddOrderPayment } from '../api/admin'
import type { AdminOrder, AdminOrderItem, OrderPaymentsResponse } from '../types'
import ABadge    from '../components/ui/ABadge.vue'
import ASelect   from '../components/ui/ASelect.vue'
import ATextarea from '../components/ui/ATextarea.vue'
import AButton   from '../components/ui/AButton.vue'
import AInput    from '../components/ui/AInput.vue'

const { t, locale } = useI18n()
const props = defineProps<{ id: string }>()

const order          = ref<AdminOrder | null>(null)
const loading        = ref(true)
const error          = ref<string | null>(null)
const newStatus      = ref('')
const adminNote      = ref('')
const updatingStatus = ref(false)
const savingNote     = ref(false)
const showStatusPanel = ref(false)

// Payment panel
const payments      = ref<OrderPaymentsResponse | null>(null)
const paymentAmount = ref('')
const paymentNote   = ref('')
const addingPayment = ref(false)

// Generate a stable hue from a product name string
function itemHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return Math.abs(h)
}

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

const subtotal = computed(() =>
  mergedItems.value.reduce((a, b) => a + Number(b.unitPrice) * b.qty, 0)
)

const paymentRemaining = computed(() => {
  const total = Number(order.value?.total ?? 0)
  const paid  = payments.value?.paid ?? 0
  return Math.max(0, total - paid)
})

const initials = computed(() => {
  if (!order.value?.user) return '?'
  return order.value.user
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const customerSince = computed(() => {
  if (!order.value?.date) return '—'
  const d = new Date(order.value.date)
  return isNaN(d.getTime())
    ? order.value.date
    : d.toLocaleDateString(locale.value === 'ar' ? 'ar-LY' : 'en-GB', { month: 'short', year: 'numeric' })
})

// Build timeline steps from the order's timeline or synthesise from status
const timelineSteps = computed(() => {
  const steps = [
    { key: 'placed',    label: t('orders.filterPlaced') },
    { key: 'confirmed', label: t('orders.filterConfirmed') },
    { key: 'preparing', label: t('orders.filterPreparing') },
    { key: 'ready',     label: t('orders.filterReady') },
    { key: 'delivered', label: t('orders.filterDelivered') },
  ]
  const statusOrder = ['placed', 'confirmed', 'preparing', 'ready', 'delivered']
  const currentIdx = statusOrder.indexOf(order.value?.status ?? '')

  if (order.value?.timeline?.length) {
    // Use API-provided timeline
    const statusLabelMap: Record<string, string> = {
      placed:    t('orders.filterPlaced'),
      confirmed: t('orders.filterConfirmed'),
      preparing: t('orders.filterPreparing'),
      ready:     t('orders.filterReady'),
      delivered: t('orders.filterDelivered'),
      cancelled: t('orders.filterCancelled'),
    }
    return order.value.timeline.map((entry, i) => ({
      key:       entry.status,
      label:     statusLabelMap[entry.status] ?? (entry.status.charAt(0).toUpperCase() + entry.status.slice(1)),
      done:      entry.done,
      date:      entry.date,
      isCurrent: !entry.done && (i === 0 || order.value!.timeline![i - 1]?.done),
    }))
  }

  return steps.map((s, i) => ({
    ...s,
    done:      i < currentIdx,
    date:      i < currentIdx ? order.value?.date ?? null : null,
    isCurrent: i === currentIdx,
  }))
})

const statusOptions = computed(() => [
  { value: 'placed',    label: t('orders.filterPlaced') },
  { value: 'confirmed', label: t('orders.filterConfirmed') },
  { value: 'preparing', label: t('orders.filterPreparing') },
  { value: 'ready',     label: t('orders.filterReady') },
  { value: 'delivered', label: t('orders.filterDelivered') },
  { value: 'cancelled', label: t('orders.filterCancelled') },
])

async function loadPayments() {
  if (!order.value) return
  try {
    const res = await apiGetOrderPayments(order.value.id)
    payments.value = res.data
  } catch {
    // silent — show empty state
  }
}

onMounted(async () => {
  try {
    const res   = await apiGetOrder(props.id)
    order.value = res.data
    adminNote.value = order.value.adminNote ?? ''
    await loadPayments()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : t('orderDetail.loadFailed')
  } finally {
    loading.value = false
  }
})

async function handleAddPayment() {
  if (!order.value || !paymentAmount.value || Number(paymentAmount.value) <= 0) return
  addingPayment.value = true
  try {
    const res = await apiAddOrderPayment(order.value.id, {
      amount: Number(paymentAmount.value),
      note: paymentNote.value.trim() || undefined,
    })
    payments.value = res.data
    paymentAmount.value = ''
    paymentNote.value = ''
  } finally {
    addingPayment.value = false
  }
}

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

<template>
  <div v-if="loading" class="space-y-4 max-w-2xl">
    <div v-for="i in 3" :key="i" class="h-28 rounded-xl bg-dash-surface border border-dash-border animate-pulse" />
  </div>

  <div v-else-if="error" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger max-w-2xl">
    {{ error }}
  </div>

  <div v-else-if="order" class="max-w-2xl space-y-4">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-2 mb-0.5">
          <RouterLink to="/orders" class="text-xs text-dash-faint hover:text-dash-text">← Orders</RouterLink>
        </div>
        <p class="font-mono text-xs text-dash-faint">{{ order.id }}</p>
        <h2 class="text-base font-semibold text-dash-text">{{ order.user }}</h2>
        <p class="text-xs text-dash-muted">{{ order.userEmail }}</p>
      </div>
      <ABadge :status="order.status" />
    </div>

    <!-- Meta -->
    <div class="bg-dash-surface rounded-xl border border-dash-border p-4 grid grid-cols-2 gap-3 text-xs">
      <div><p class="text-dash-faint mb-0.5">Date</p><p class="font-medium">{{ order.date }}</p></div>
      <div><p class="text-dash-faint mb-0.5">Total</p><p class="font-medium">{{ Number(order.total).toFixed(2) }} LYD</p></div>
      <div><p class="text-dash-faint mb-0.5">Delivery type</p><p class="font-medium">{{ order.isPickup ? 'Pickup' : 'Delivery' }}</p></div>
      <div><p class="text-dash-faint mb-0.5">Items</p><p class="font-medium">{{ order.items?.length ?? order.itemCount }}</p></div>
      <div v-if="order.note" class="col-span-2">
        <p class="text-dash-faint mb-0.5">Customer note</p>
        <p class="font-medium">{{ order.note }}</p>
      </div>
    </div>

    <!-- Items table -->
    <div class="bg-dash-surface rounded-xl border border-dash-border overflow-hidden">
      <p class="text-xs font-semibold text-dash-muted uppercase tracking-wide px-4 py-3 border-b border-dash-border">Items</p>
      <table class="w-full text-xs">
        <thead class="bg-dash-bg text-left text-dash-faint">
          <tr>
            <th class="px-4 py-2">Product</th>
            <th class="px-4 py-2">Brand</th>
            <th class="px-4 py-2">Size</th>
            <th class="px-4 py-2">Qty</th>
            <th class="px-4 py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-dash-border-lt">
          <tr v-for="item in order.items" :key="`${item.name}-${item.size}`">
            <td class="px-4 py-2.5 font-medium text-dash-text">{{ item.name }}</td>
            <td class="px-4 py-2.5 text-dash-muted">{{ item.brand }}</td>
            <td class="px-4 py-2.5">{{ item.size }} ml</td>
            <td class="px-4 py-2.5">× {{ item.qty }}</td>
            <td class="px-4 py-2.5 text-right font-medium">{{ Number(item.unitPrice).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Timeline -->
    <div class="bg-dash-surface rounded-xl border border-dash-border p-4">
      <p class="text-xs font-semibold text-dash-muted uppercase tracking-wide mb-3">Timeline</p>
      <div class="flex flex-col gap-2.5">
        <div v-for="step in order.timeline" :key="step.status" class="flex items-center gap-3 text-xs">
          <div :class="['h-2 w-2 rounded-full shrink-0', step.done ? 'bg-dash-success' : 'bg-dash-border']" />
          <span :class="step.done ? 'text-dash-text font-medium' : 'text-dash-faint'">{{ step.status }}</span>
          <span v-if="step.date" class="ml-auto text-dash-faint">{{ step.date }}</span>
        </div>
      </div>
    </div>

    <!-- Admin actions -->
    <div class="bg-dash-surface rounded-xl border border-dash-border p-4 space-y-4">
      <p class="text-xs font-semibold text-dash-muted uppercase tracking-wide">Admin Actions</p>

      <!-- Status update -->
      <div class="flex gap-2 items-end">
        <ASelect
          v-model="newStatus"
          label="Update Status"
          placeholder="Choose a status…"
          :options="statusOptions"
          class="flex-1"
        />
        <AButton size="sm" @click="handleStatusUpdate" :loading="updatingStatus" :disabled="!newStatus">
          Update
        </AButton>
      </div>

      <!-- Admin note -->
      <div class="flex gap-2 items-end">
        <ATextarea
          v-model="adminNote"
          label="Admin Note"
          placeholder="Internal note visible to staff only…"
          class="flex-1"
        />
        <AButton size="sm" variant="secondary" @click="handleSaveNote" :loading="savingNote" :disabled="!adminNote.trim()">
          Save
        </AButton>
      </div>

      <div v-if="order.adminNote" class="rounded-lg bg-dash-bg border border-dash-border px-3 py-2 text-xs text-dash-text">
        <span class="text-dash-faint font-medium">Saved note: </span>{{ order.adminNote }}
      </div>
    </div>
  </div>

  <div v-else class="text-sm text-dash-faint text-center py-16">Order not found.</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiGetOrder, apiUpdateOrderStatus, apiAddAdminNote } from '../api/admin'
import type { AdminOrder } from '../types'
import ABadge    from '../components/ui/ABadge.vue'
import ASelect   from '../components/ui/ASelect.vue'
import ATextarea from '../components/ui/ATextarea.vue'
import AButton   from '../components/ui/AButton.vue'

const props = defineProps<{ id: string }>()

const order          = ref<AdminOrder | null>(null)
const loading        = ref(true)
const error          = ref<string | null>(null)
const newStatus      = ref('')
const adminNote      = ref('')
const updatingStatus = ref(false)
const savingNote     = ref(false)

const statusOptions = [
  { value: 'placed',    label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready',     label: 'Ready for Pickup' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

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

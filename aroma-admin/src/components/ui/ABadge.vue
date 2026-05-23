<template>
  <span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', cls]">
    <span :class="['h-1.5 w-1.5 rounded-full shrink-0', dotCls]" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const map: Record<string, { label: string; cls: string; dotCls: string }> = {
  // Order statuses
  paid:            { label: 'Paid',            cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  confirmed:       { label: 'Confirmed',       cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  delivered:       { label: 'Delivered',       cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  placed:          { label: 'Placed',          cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
  pending:         { label: 'Pending',         cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
  preparing:       { label: 'Preparing',       cls: 'bg-dash-primary-lt text-dash-primary',    dotCls: 'bg-dash-primary' },
  packing:         { label: 'Packing',         cls: 'bg-dash-primary-lt text-dash-primary',    dotCls: 'bg-dash-primary' },
  ready:           { label: 'Ready',           cls: 'bg-dash-primary-lt text-dash-primary',    dotCls: 'bg-dash-primary' },
  shipped:         { label: 'Shipped',         cls: 'bg-dash-primary-lt text-dash-text-2',     dotCls: 'bg-dash-primary' },
  in_transit:      { label: 'In Transit',      cls: 'bg-dash-primary-lt text-dash-text-2',     dotCls: 'bg-dash-primary' },
  cancelled:       { label: 'Cancelled',       cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
  refunded:        { label: 'Refunded',        cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
  // Payment statuses
  not_paid:        { label: 'Not Paid',        cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
  partially_paid:  { label: 'Partially Paid',  cls: 'bg-dash-orange-lt text-dash-orange',      dotCls: 'bg-dash-orange' },
  // Stock / product statuses
  live:            { label: 'Live',            cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  in_stock:        { label: 'In Stock',        cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  low_stock:       { label: 'Low Stock',       cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
  low:             { label: 'Low',             cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
  out_of_stock:    { label: 'Out of Stock',    cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
  out:             { label: 'Out of Stock',    cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
}

const entry  = computed(() => map[props.status] ?? { label: props.status, cls: 'bg-dash-border text-dash-muted', dotCls: 'bg-dash-faint' })
const label  = computed(() => entry.value.label)
const cls    = computed(() => entry.value.cls)
const dotCls = computed(() => entry.value.dotCls)
</script>

<template>
  <span :class="['inline-flex items-center gap-1.5 rounded-tag px-2 py-0.5 text-2xs font-semibold', cls]">
    <span :class="['h-1.5 w-1.5 rounded-full shrink-0', dotCls]" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const map: Record<string, { label: string; cls: string; dotCls: string }> = {
  placed:       { label: 'Placed',          cls: 'text-dash-muted bg-dash-border',         dotCls: 'bg-dash-muted' },
  confirmed:    { label: 'Confirmed',        cls: 'text-dash-secondary bg-dash-secondary-lt', dotCls: 'bg-dash-secondary' },
  preparing:    { label: 'Preparing',        cls: 'text-dash-orange bg-dash-orange-lt',     dotCls: 'bg-dash-orange' },
  ready:        { label: 'Ready',            cls: 'text-dash-success bg-dash-success-lt',   dotCls: 'bg-dash-success' },
  delivered:    { label: 'Delivered',        cls: 'text-dash-success bg-dash-success-lt',   dotCls: 'bg-dash-success' },
  cancelled:    { label: 'Cancelled',        cls: 'text-dash-danger bg-dash-danger-lt',     dotCls: 'bg-dash-danger' },
  in_stock:     { label: 'In Stock',         cls: 'text-dash-success bg-dash-success-lt',   dotCls: 'bg-dash-success' },
  low_stock:    { label: 'Low Stock',        cls: 'text-dash-orange bg-dash-orange-lt',     dotCls: 'bg-dash-orange' },
  out_of_stock:    { label: 'Out of Stock',     cls: 'text-dash-danger bg-dash-danger-lt',     dotCls: 'bg-dash-danger' },
  paid:            { label: 'Paid',             cls: 'text-dash-success bg-dash-success-lt',   dotCls: 'bg-dash-success' },
  partially_paid:  { label: 'Partially Paid',   cls: 'text-dash-orange bg-dash-orange-lt',     dotCls: 'bg-dash-orange' },
  not_paid:        { label: 'Not Paid',         cls: 'text-dash-danger bg-dash-danger-lt',     dotCls: 'bg-dash-danger' },
}

const entry  = computed(() => map[props.status] ?? { label: props.status, cls: 'text-dash-muted bg-dash-border', dotCls: 'bg-dash-faint' })
const label  = computed(() => entry.value.label)
const cls    = computed(() => entry.value.cls)
const dotCls = computed(() => entry.value.dotCls)
</script>

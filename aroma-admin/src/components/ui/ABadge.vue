<template>
  <span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', cls]">
    <span :class="['h-1.5 w-1.5 rounded-full shrink-0', dotCls]" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{ status: string }>()

const styleMap: Record<string, { cls: string; dotCls: string }> = {
  // Order statuses
  paid:            { cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  confirmed:       { cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  delivered:       { cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  placed:          { cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
  pending:         { cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
  preparing:       { cls: 'bg-dash-primary-lt text-dash-primary',    dotCls: 'bg-dash-primary' },
  packing:         { cls: 'bg-dash-primary-lt text-dash-primary',    dotCls: 'bg-dash-primary' },
  ready:           { cls: 'bg-dash-primary-lt text-dash-primary',    dotCls: 'bg-dash-primary' },
  shipped:         { cls: 'bg-dash-primary-lt text-dash-text-2',     dotCls: 'bg-dash-primary' },
  in_transit:      { cls: 'bg-dash-primary-lt text-dash-text-2',     dotCls: 'bg-dash-primary' },
  cancelled:       { cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
  refunded:        { cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
  // Payment statuses
  not_paid:        { cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
  partially_paid:  { cls: 'bg-dash-orange-lt text-dash-orange',      dotCls: 'bg-dash-orange' },
  // Stock / product statuses
  live:            { cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  in_stock:        { cls: 'bg-dash-success-lt text-dash-success-dk', dotCls: 'bg-dash-success' },
  low_stock:       { cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
  low:             { cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
  out_of_stock:    { cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
  out:             { cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
}

const fallback = { cls: 'bg-dash-border text-dash-muted', dotCls: 'bg-dash-faint' }
const style    = computed(() => styleMap[props.status] ?? fallback)
const label    = computed(() => styleMap[props.status] ? t(`statuses.${props.status}`) : props.status)
const cls      = computed(() => style.value.cls)
const dotCls   = computed(() => style.value.dotCls)
</script>

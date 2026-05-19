<template>
  <div class="bg-dash-paper border border-dash-border rounded-card shadow-card p-5 flex flex-col gap-3">
    <!-- Label -->
    <p class="text-[12px] font-medium text-dash-muted leading-snug">{{ label }}</p>

    <!-- Value + suffix -->
    <div class="flex items-baseline gap-1.5 whitespace-nowrap">
      <span class="font-display text-[30px] leading-none text-dash-text tabular-nums">{{ value }}</span>
      <span v-if="suffix" class="text-[12.5px] font-medium text-dash-muted">{{ suffix }}</span>
    </div>

    <!-- Bottom row: change chip + hint -->
    <div class="flex items-center justify-between gap-3">
      <span
        v-if="change !== undefined && change !== null"
        :class="[
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0',
          change >= 0
            ? 'bg-dash-success-lt text-dash-success-dk'
            : 'bg-dash-danger-lt text-dash-danger',
        ]"
      >
        <span>{{ change >= 0 ? '↑' : '↓' }}</span>
        <span>{{ change >= 0 ? '+' : '' }}{{ change }}%</span>
      </span>
      <span v-else class="inline-flex shrink-0" />

      <span v-if="hint" class="text-[11.5px] text-dash-faint truncate text-right rtl:text-left">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label:   string
  value:   string | number
  suffix?: string
  change?: number | null
  hint?:   string
}>(), {})
</script>

<template>
  <div
    class="bg-dash-surface rounded-card p-5 shadow-card transition-card hover-lift flex flex-col gap-3"
    :class="featured ? 'col-span-2 sm:col-span-1' : ''"
  >
    <!-- Header row -->
    <div class="flex items-start justify-between gap-2">
      <p class="text-xs font-medium text-dash-muted leading-snug">{{ label }}</p>
      <div
        v-if="iconBg"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        :style="{ backgroundColor: iconBg + '20' }"
      >
        <component :is="icon" :size="15" :style="{ color: iconBg }" />
      </div>
    </div>

    <!-- Value -->
    <div class="flex items-end justify-between gap-3">
      <p class="text-2xl font-bold text-dash-text tabular-nums leading-none">{{ value }}</p>

      <!-- Change chip -->
      <div
        v-if="change !== undefined"
        :class="[
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold shrink-0 mb-0.5',
          change >= 0
            ? 'bg-dash-success-lt text-dash-success'
            : 'bg-dash-danger-lt text-dash-danger',
        ]"
      >
        <span>{{ change >= 0 ? '↑' : '↓' }}</span>
        <span>{{ Math.abs(change) }}%</span>
      </div>
    </div>

    <!-- Sub label -->
    <p v-if="sub" class="text-2xs text-dash-faint -mt-1">{{ sub }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
withDefaults(defineProps<{
  label:     string
  value:     string | number
  change?:   number
  sub?:      string
  icon?:     Component
  iconBg?:   string
  featured?: boolean
}>(), { featured: false })
</script>

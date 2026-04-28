<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-dash-border text-dash-faint mb-4">
      <component :is="icon" :size="22" />
    </div>
    <p class="text-sm font-medium text-dash-text">{{ heading }}</p>
    <p v-if="sub" class="text-xs text-dash-faint mt-1">{{ sub }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ icon: Component; heading: string; sub?: string }>()
</script>

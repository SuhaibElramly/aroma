<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="uid" class="text-2xs font-semibold text-dash-muted uppercase tracking-wider">
      {{ label }}
    </label>
    <input
      :id="uid"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      v-bind="$attrs"
      :class="[
        'w-full rounded-btn border px-3 py-2 text-xs text-dash-text placeholder:text-dash-faint',
        'bg-dash-surface transition-all duration-200',
        'focus:outline-none focus:border-dash-primary focus:ring-2 focus:ring-dash-primary/10',
        error ? 'border-dash-danger bg-dash-danger-lt/40' : 'border-dash-border hover:border-dash-muted/40',
      ]"
    />
    <p v-if="error" class="text-2xs text-dash-danger">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
defineProps<{ label?: string; modelValue?: string; error?: string }>()
defineEmits<{ 'update:modelValue': [v: string] }>()
const uid = useId()
</script>

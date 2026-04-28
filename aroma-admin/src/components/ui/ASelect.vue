<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="uid" class="text-2xs font-semibold text-dash-muted uppercase tracking-wider">
      {{ label }}
    </label>
    <select
      :id="uid"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      v-bind="$attrs"
      :class="[
        'w-full rounded-btn border px-3 py-2 text-xs text-dash-text bg-dash-surface',
        'focus:outline-none focus:border-dash-primary focus:ring-2 focus:ring-dash-primary/10 transition-all duration-200',
        error ? 'border-dash-danger' : 'border-dash-border hover:border-dash-muted/40',
      ]"
    >
      <option v-if="placeholder" value="" disabled :selected="!modelValue">{{ placeholder }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <p v-if="error" class="text-2xs text-dash-danger">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
defineProps<{
  label?: string
  modelValue?: string
  error?: string
  placeholder?: string
  options: { value: string; label: string }[]
}>()
defineEmits<{ 'update:modelValue': [v: string] }>()
const uid = useId()
</script>

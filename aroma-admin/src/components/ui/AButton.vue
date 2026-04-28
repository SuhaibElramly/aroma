<template>
  <button
    v-bind="$attrs"
    :class="[base, variants[variant], sizes[size]]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?:    'sm' | 'md'
  loading?: boolean
  disabled?: boolean
}>(), { variant: 'primary', size: 'md', loading: false, disabled: false })

const base = 'inline-flex items-center gap-1.5 rounded-btn font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed'

const variants = {
  primary:   'bg-dash-secondary text-white hover:bg-dash-secondary-dk shadow-sm',
  secondary: 'bg-dash-surface text-dash-text border border-dash-border hover:bg-dash-bg',
  danger:    'bg-dash-danger-lt text-dash-danger border border-dash-danger/20 hover:bg-dash-danger hover:text-white',
  ghost:     'text-dash-muted hover:bg-dash-border-lt hover:text-dash-text',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-xs',
}
</script>

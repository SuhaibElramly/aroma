<template>
  <div
    v-if="meta && meta.lastPage > 1"
    class="flex items-center justify-between pt-4 text-xs text-dash-muted"
  >
    <span class="text-2xs">
      Page {{ meta.currentPage }} of {{ meta.lastPage }}
      <span class="text-dash-faint">&nbsp;·&nbsp; {{ meta.total }} total</span>
    </span>
    <div class="flex gap-1.5">
      <button
        @click="$emit('change', meta!.currentPage - 1)"
        :disabled="meta.currentPage <= 1"
        class="rounded-btn border border-dash-border px-3 py-1.5 text-xs hover:bg-dash-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >← Prev</button>
      <button
        @click="$emit('change', meta!.currentPage + 1)"
        :disabled="meta.currentPage >= meta.lastPage"
        class="rounded-btn border border-dash-border px-3 py-1.5 text-xs hover:bg-dash-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >Next →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PageMeta } from '../../types'
defineProps<{ meta: PageMeta | null }>()
defineEmits<{ change: [page: number] }>()
</script>

<template>
  <div
    v-if="meta && meta.lastPage > 1"
    class="flex items-center justify-between pt-4 text-xs text-dash-muted"
  >
    <span class="text-2xs">
      {{ t('pagination.page') }} {{ meta.currentPage }} {{ t('pagination.of') }} {{ meta.lastPage }}
      <span class="text-dash-faint">&nbsp;·&nbsp; {{ meta.total }} {{ t('pagination.results') }}</span>
    </span>
    <div class="flex gap-1.5">
      <button
        @click="$emit('change', meta!.currentPage - 1)"
        :disabled="meta.currentPage <= 1"
        class="rounded-btn border border-dash-border px-3 py-1.5 text-xs hover:bg-dash-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >← {{ t('pagination.prev') }}</button>
      <button
        @click="$emit('change', meta!.currentPage + 1)"
        :disabled="meta.currentPage >= meta.lastPage"
        class="rounded-btn border border-dash-border px-3 py-1.5 text-xs hover:bg-dash-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >{{ t('pagination.next') }} →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PageMeta } from '../../types'
const { t } = useI18n()
defineProps<{ meta: PageMeta | null }>()
defineEmits<{ change: [page: number] }>()
</script>

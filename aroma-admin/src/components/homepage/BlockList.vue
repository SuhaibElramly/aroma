<!-- aroma-admin/src/components/homepage/BlockList.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import type { HomepageBlock } from '../../types'
import {
  Trophy, Sparkles, Tag, LayoutGrid, BadgePercent,
  GripVertical, Pencil, Trash2,
} from 'lucide-vue-next'

const props = defineProps<{
  blocks: HomepageBlock[]
}>()

const emit = defineEmits<{
  'update:blocks': [HomepageBlock[]]
  edit: [block: HomepageBlock]
  delete: [block: HomepageBlock]
  toggle: [block: HomepageBlock]
  'add-block': []
}>()

const ICONS: Record<string, any> = {
  bestsellers:    Trophy,
  new_arrivals:   Sparkles,
  offers:         BadgePercent,
  categories:     LayoutGrid,
  featured_brand: Tag,
}

const TYPE_LABELS: Record<string, string> = {
  bestsellers:    'Bestsellers',
  new_arrivals:   'New Arrivals',
  offers:         'Offers',
  categories:     'Categories',
  featured_brand: 'Featured Brand',
}

const list = computed({
  get: () => props.blocks,
  set: (val) => emit('update:blocks', val),
})

function blockMeta(block: HomepageBlock): string {
  if (['bestsellers', 'new_arrivals', 'offers'].includes(block.type)) {
    return `Showing ${block.config.limit ?? '?'} products`
  }
  if (block.type === 'featured_brand') {
    return block.config.brand_id ?? 'No brand selected'
  }
  if (block.type === 'categories') return 'All categories'
  return ''
}
</script>

<template>
  <div>
    <draggable
      v-model="list"
      item-key="id"
      handle=".drag-handle"
      class="space-y-2"
    >
      <template #item="{ element: block }">
        <div
          class="flex items-center gap-3 rounded-lg border border-dash-border bg-dash-paper-2 px-3 py-2.5"
          :class="{ 'opacity-50': !block.enabled }"
        >
          <!-- Drag handle -->
          <GripVertical :size="16" class="drag-handle cursor-grab text-dash-faint shrink-0" />

          <!-- Icon -->
          <div class="w-8 h-8 rounded-md bg-dash-bg flex items-center justify-center shrink-0">
            <component :is="ICONS[block.type]" :size="15" class="text-dash-primary" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-dash-muted">
              {{ TYPE_LABELS[block.type] }}
            </p>
            <p class="text-[13px] text-dash-text truncate" dir="rtl">
              {{ block.config.title || '—' }}
            </p>
            <p class="text-[11px] text-dash-faint">{{ blockMeta(block) }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Toggle -->
            <button
              type="button"
              role="switch"
              :aria-checked="block.enabled"
              @click="emit('toggle', block)"
              class="relative w-8 h-4 rounded-full transition-colors"
              :class="block.enabled ? 'bg-dash-primary' : 'bg-dash-border'"
            >
              <span
                class="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all"
                :class="block.enabled ? 'left-[18px]' : 'left-0.5'"
              />
            </button>

            <button
              @click="emit('edit', block)"
              class="p-1 text-dash-faint hover:text-dash-text transition-colors"
            >
              <Pencil :size="14" />
            </button>

            <button
              @click="emit('delete', block)"
              class="p-1 text-dash-faint hover:text-dash-danger transition-colors"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </template>
    </draggable>

    <!-- Add block button -->
    <button
      type="button"
      @click="emit('add-block')"
      class="mt-2 w-full rounded-lg border border-dashed border-dash-border py-3 text-[12px]
             text-dash-muted hover:border-dash-primary hover:text-dash-primary transition-colors
             flex items-center justify-center gap-1.5"
    >
      + Add Block
    </button>
  </div>
</template>

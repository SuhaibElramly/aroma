<!-- aroma-admin/src/components/homepage/ProductPicker.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import { apiGetProducts } from '../../api/admin'
import { GripVertical, X } from 'lucide-vue-next'
import type { AdminProduct } from '../../types'

interface PickedProduct {
  id: number
  name: string
  brand: string
  thumbnailUrl: string | null
}

const props = defineProps<{ modelValue: number[] }>()
const emit  = defineEmits<{ 'update:modelValue': [number[]] }>()

const query       = ref('')
const results     = ref<AdminProduct[]>([])
const selected    = ref<PickedProduct[]>([])
const showResults = ref(false)
let debounce: ReturnType<typeof setTimeout>

// Pre-populate selected list when editing an existing curated block
onMounted(async () => {
  if (props.modelValue.length === 0) return
  try {
    const res = await apiGetProducts({ ids: props.modelValue.join(',') })
    const byId = Object.fromEntries(res.data.data.map(p => [p.id, p]))
    selected.value = props.modelValue
      .map(id => byId[id])
      .filter(Boolean)
      .map(p => ({ id: p.id, name: p.name, brand: p.brand, thumbnailUrl: p.thumbnailUrl }))
  } catch { /* leave empty — IDs still saved correctly on submit */ }
})

function onInput() {
  clearTimeout(debounce)
  if (!query.value.trim()) {
    results.value  = []
    showResults.value = false
    return
  }
  debounce = setTimeout(async () => {
    try {
      const res = await apiGetProducts({ search: query.value })
      results.value = res.data.data.filter(
        p => !selected.value.some(s => s.id === p.id)
      )
      showResults.value = true
    } catch { results.value = [] }
  }, 300)
}

function pick(product: AdminProduct) {
  selected.value.push({
    id:          product.id,
    name:        product.name,
    brand:       product.brand,
    thumbnailUrl: product.thumbnailUrl,
  })
  query.value       = ''
  results.value     = []
  showResults.value = false
  emit('update:modelValue', selected.value.map(p => p.id))
}

function remove(id: number) {
  selected.value = selected.value.filter(p => p.id !== id)
  emit('update:modelValue', selected.value.map(p => p.id))
}

function onDragEnd() {
  emit('update:modelValue', selected.value.map(p => p.id))
}

function onBlur() {
  setTimeout(() => { showResults.value = false }, 150)
}
</script>

<template>
  <div class="space-y-2">
    <label class="block text-[11px] font-medium text-dash-muted uppercase tracking-wide">
      Products
    </label>

    <!-- Search input -->
    <div class="relative">
      <input
        v-model="query"
        type="text"
        placeholder="Search products…"
        @input="onInput"
        @blur="onBlur"
        @focus="showResults = results.length > 0"
        class="w-full rounded border border-dash-border bg-dash-paper-2 px-3 py-2 text-[13px]
               text-dash-text placeholder:text-dash-faint focus:outline-none focus:border-dash-primary"
      />

      <!-- Dropdown results -->
      <div
        v-if="showResults && results.length > 0"
        class="absolute z-10 top-full mt-1 w-full bg-dash-paper border border-dash-border
               rounded shadow-lg max-h-52 overflow-y-auto"
      >
        <button
          v-for="p in results"
          :key="p.id"
          type="button"
          @mousedown.prevent="pick(p)"
          class="w-full text-left px-3 py-2 hover:bg-dash-bg flex items-center gap-2.5"
        >
          <img
            v-if="p.thumbnailUrl"
            :src="p.thumbnailUrl"
            class="w-8 h-8 object-contain rounded shrink-0 bg-dash-bg"
            alt=""
          />
          <div v-else class="w-8 h-8 rounded bg-dash-bg shrink-0" />
          <div class="min-w-0">
            <p class="text-[13px] text-dash-text truncate">{{ p.name }}</p>
            <p class="text-[11px] text-dash-faint">{{ p.brand }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Selected list -->
    <draggable
      v-model="selected"
      item-key="id"
      handle=".pick-handle"
      @end="onDragEnd"
      class="space-y-1.5"
    >
      <template #item="{ element: p }">
        <div class="flex items-center gap-2 rounded border border-dash-border bg-dash-bg px-2 py-1.5">
          <GripVertical :size="14" class="pick-handle cursor-grab text-dash-faint shrink-0" />
          <img
            v-if="p.thumbnailUrl"
            :src="p.thumbnailUrl"
            class="w-7 h-7 object-contain rounded shrink-0"
            alt=""
          />
          <div v-else class="w-7 h-7 rounded bg-dash-border shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-[12px] text-dash-text truncate">{{ p.name }}</p>
            <p class="text-[11px] text-dash-faint">{{ p.brand }}</p>
          </div>
          <button
            type="button"
            @click="remove(p.id)"
            class="p-0.5 text-dash-faint hover:text-dash-danger transition-colors shrink-0"
          >
            <X :size="13" />
          </button>
        </div>
      </template>
    </draggable>

    <p v-if="selected.length === 0" class="text-[11px] text-dash-faint italic">
      No products selected. Search above to add.
    </p>
  </div>
</template>

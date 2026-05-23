<!-- aroma-admin/src/components/homepage/BlockEditor.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { HomepageBlock, HomepageBlockType, NewBlockPayload } from '../../types'
import AInput from '../ui/AInput.vue'
import AButton from '../ui/AButton.vue'
import ASelect from '../ui/ASelect.vue'

const props = defineProps<{
  open: boolean
  block: HomepageBlock | null
  brands: { id: string; name: string }[]
  saving: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: Partial<HomepageBlock> | NewBlockPayload]
}>()

const BLOCK_TYPES: { value: HomepageBlockType; label: string }[] = [
  { value: 'bestsellers',    label: 'Bestsellers' },
  { value: 'new_arrivals',   label: 'New Arrivals' },
  { value: 'offers',         label: 'Offers' },
  { value: 'categories',     label: 'Categories' },
  { value: 'featured_brand', label: 'Featured Brand' },
]

const type    = ref<HomepageBlockType>('bestsellers')
const label   = ref('')
const title   = ref('')
const limit   = ref(3)
const brandId = ref('')
const productLimit = ref(2)
const enabled = ref(true)

const isNew = computed(() => !props.block)

watch(() => props.block, (b) => {
  if (b) {
    type.value         = b.type
    label.value        = b.config.label  ?? ''
    title.value        = b.config.title  ?? ''
    limit.value        = b.config.limit  ?? 3
    brandId.value      = b.config.brand_id      ?? ''
    productLimit.value = b.config.product_limit ?? 2
    enabled.value      = b.enabled
  } else {
    type.value = 'bestsellers'
    label.value = title.value = brandId.value = ''
    limit.value = 3
    productLimit.value = 2
    enabled.value = true
  }
}, { immediate: true })

function submit() {
  const config: HomepageBlock['config'] = { label: label.value, title: title.value }

  if (['bestsellers', 'new_arrivals', 'offers'].includes(type.value)) {
    config.limit = limit.value
  }

  if (type.value === 'featured_brand') {
    config.brand_id      = brandId.value
    config.product_limit = productLimit.value
  }

  if (isNew.value) {
    emit('save', { type: type.value, config, enabled: enabled.value } as NewBlockPayload)
  } else {
    emit('save', { config, enabled: enabled.value })
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex"
      @click.self="emit('close')"
    >
      <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
      <div class="relative ms-auto h-full w-[380px] bg-dash-paper border-s border-dash-border flex flex-col shadow-2xl">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-dash-border flex items-center justify-between">
          <h3 class="text-[14px] font-semibold text-dash-text">
            {{ isNew ? 'Add Block' : 'Edit Block' }}
          </h3>
          <button @click="emit('close')" class="text-dash-muted hover:text-dash-text transition-colors text-lg">✕</button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <!-- Type selector (only for new blocks) -->
          <ASelect
            v-if="isNew"
            label="Block Type"
            :model-value="type"
            :options="BLOCK_TYPES.map(t => ({ value: t.value, label: t.label }))"
            @update:model-value="type = $event as HomepageBlockType"
          />

          <AInput
            label="Label (small uppercase above title)"
            dir="rtl"
            v-model="label"
          />

          <AInput
            label="Title"
            dir="rtl"
            v-model="title"
          />

          <!-- Product limit (for product blocks) -->
          <div v-if="['bestsellers', 'new_arrivals', 'offers'].includes(type)">
            <label class="block text-[11px] font-medium text-dash-muted uppercase tracking-wide mb-1">
              Products to show (1–12)
            </label>
            <input
              type="number"
              v-model.number="limit"
              min="1"
              max="12"
              class="w-full rounded border border-dash-border bg-dash-paper-2 px-3 py-2 text-[13px] text-dash-text focus:outline-none focus:border-dash-primary"
            />
          </div>

          <!-- Featured brand fields -->
          <template v-if="type === 'featured_brand'">
            <ASelect
              label="Brand"
              :model-value="brandId"
              :options="brands.map(b => ({ value: b.id, label: b.name }))"
              @update:model-value="brandId = $event"
            />
            <div>
              <label class="block text-[11px] font-medium text-dash-muted uppercase tracking-wide mb-1">
                Products to show (1–4)
              </label>
              <input
                type="number"
                v-model.number="productLimit"
                min="1"
                max="4"
                class="w-full rounded border border-dash-border bg-dash-paper-2 px-3 py-2 text-[13px] text-dash-text focus:outline-none focus:border-dash-primary"
              />
            </div>
          </template>

          <!-- Enabled toggle -->
          <div class="flex items-center gap-3 pt-1">
            <button
              type="button"
              role="switch"
              :aria-checked="enabled"
              @click="enabled = !enabled"
              class="relative w-10 h-5 rounded-full transition-colors"
              :class="enabled ? 'bg-dash-primary' : 'bg-dash-border'"
            >
              <span
                class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                :class="enabled ? 'left-[22px]' : 'left-0.5'"
              />
            </button>
            <span class="text-[13px] text-dash-text">{{ enabled ? 'Visible' : 'Hidden' }}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 border-t border-dash-border space-y-2">
          <p v-if="error" class="text-xs text-dash-danger">{{ error }}</p>
          <div class="flex gap-2 justify-end">
            <AButton variant="ghost" @click="emit('close')">Cancel</AButton>
            <AButton :loading="saving" @click="submit">
              {{ isNew ? 'Add Block' : 'Save Changes' }}
            </AButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

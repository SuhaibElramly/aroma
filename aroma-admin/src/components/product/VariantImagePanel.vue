<!-- aroma-admin/src/components/product/VariantImagePanel.vue -->
<template>
  <div class="mt-2 px-2 pb-3 border-t border-dash-border/50">
    <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mt-2 mb-2">
      {{ t('stepper.variantImagesTitle') }}
    </p>
    <p class="text-2xs text-dash-muted mb-3">{{ t('stepper.variantImagesHint') }}</p>

    <!-- Image grid -->
    <div v-if="localImages.length" class="flex flex-wrap gap-2 mb-3">
      <div
        v-for="img in localImages"
        :key="img.id"
        class="relative group w-14 h-14 rounded-tag overflow-hidden border border-dash-border bg-dash-bg"
      >
        <img :src="img.url" class="h-full w-full object-cover" />
        <button
          type="button"
          @click="handleDelete(img)"
          class="absolute inset-0 flex items-center justify-center bg-dash-text/50 text-white
                 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X :size="12" />
        </button>
      </div>
    </div>

    <!-- Upload button -->
    <label class="inline-flex items-center gap-1.5 cursor-pointer rounded-btn border border-dashed
                  border-dash-border px-3 py-1.5 text-xs text-dash-muted hover:border-dash-primary
                  hover:text-dash-primary transition-all duration-150">
      <span v-if="uploading" class="inline-block h-3 w-3 animate-spin rounded-full
                                    border-[1.5px] border-current border-t-transparent" />
      <ImagePlus v-else :size="13" />
      {{ uploading ? t('stepper.uploadingVariantImages') : t('stepper.addVariantImages') }}
      <input
        type="file"
        accept="image/*"
        multiple
        class="sr-only"
        :disabled="uploading"
        @change="handleUpload"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, ImagePlus } from 'lucide-vue-next'
import { apiGetVariantImages, apiUploadVariantImages, apiDeleteVariantImage } from '../../api/admin'
import type { ProductImage } from '../../types'

const props = defineProps<{
  productId: number
  variantId: number
}>()

const emit = defineEmits<{
  'update:imageCount': [count: number]
}>()

const { t } = useI18n()
const localImages = ref<ProductImage[]>([])
const uploading   = ref(false)

async function load() {
  try {
    const { data } = await apiGetVariantImages(props.productId, props.variantId)
    localImages.value = data
    emit('update:imageCount', data.length)
  } catch { /* silent */ }
}

async function handleUpload(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  ;(e.target as HTMLInputElement).value = ''
  uploading.value = true
  try {
    const { data } = await apiUploadVariantImages(props.productId, props.variantId, files)
    localImages.value = data
    emit('update:imageCount', data.length)
  } catch { /* silent */ } finally {
    uploading.value = false
  }
}

async function handleDelete(img: ProductImage) {
  try {
    await apiDeleteVariantImage(props.productId, props.variantId, img.id)
    localImages.value = localImages.value.filter(i => i.id !== img.id)
    emit('update:imageCount', localImages.value.length)
  } catch { /* silent */ }
}

watch(() => props.variantId, load, { immediate: true })
</script>

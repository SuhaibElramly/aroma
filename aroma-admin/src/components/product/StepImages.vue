<!-- aroma-admin/src/components/product/StepImages.vue -->
<template>
  <div class="space-y-4">
    <section class="bg-dash-surface rounded-card shadow-card p-5">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-xs font-semibold text-dash-text">{{ t('productCreate.images') }}</h2>
          <p class="text-2xs text-dash-muted mt-0.5">{{ t('productCreate.imagesHint') }}</p>
        </div>
        <label
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-medium
                 bg-dash-surface border border-dash-border text-dash-muted
                 hover:bg-dash-bg hover:text-dash-text transition-all duration-150 cursor-pointer"
        >
          <ImagePlus :size="13" />
          {{ t('productCreate.addImages') }}
          <input type="file" accept="image/*" multiple class="sr-only" @change="handleFileInput" />
        </label>
      </div>

      <!-- Drop zone (empty state) -->
      <div
        v-if="committed.length === 0 && pending.length === 0"
        class="relative rounded-card border-2 border-dashed border-dash-border bg-dash-bg
               flex flex-col items-center justify-center gap-2 py-10 px-6 text-center transition-all"
        :class="dragging ? 'border-dash-primary bg-dash-primary-lt/40' : ''"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="w-10 h-10 rounded-full bg-dash-border flex items-center justify-center">
          <ImagePlus :size="18" class="text-dash-muted" />
        </div>
        <div>
          <p class="text-xs font-medium text-dash-text">{{ t('productCreate.dropImages') }}</p>
          <p class="text-2xs text-dash-muted mt-0.5">{{ t('productCreate.dropImagesHint') }}</p>
        </div>
      </div>

      <!-- Image grid -->
      <div
        v-else
        class="rounded-card border-2 border-dashed border-dash-border bg-dash-bg p-3 transition-all"
        :class="dragging ? 'border-dash-primary bg-dash-primary-lt/40' : ''"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          <!-- Already-uploaded images (edit mode) -->
          <div
            v-for="img in committed"
            :key="`c-${img.id}`"
            class="relative group aspect-square rounded-tag overflow-hidden bg-dash-border cursor-pointer border-2 transition-all"
            :class="img.isThumbnail ? 'border-dash-primary' : 'border-transparent hover:border-dash-primary/40'"
            @click="setThumbnail(img)"
          >
            <img :src="img.url" class="h-full w-full object-cover" />
            <div v-if="img.isThumbnail"
              class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                     bg-dash-primary/80 text-white backdrop-blur-sm leading-none">
              {{ t('productCreate.cover') }}
            </div>
            <button type="button" @click.stop="deleteCommitted(img)"
              class="absolute top-1 right-1 w-5 h-5 rounded-full bg-dash-text/60 text-white
                     flex items-center justify-center opacity-0 group-hover:opacity-100
                     transition-opacity hover:bg-dash-danger">
              <X :size="10" />
            </button>
          </div>

          <!-- Pending (not yet uploaded) images -->
          <div
            v-for="(img, idx) in pending"
            :key="`p-${idx}`"
            class="relative group aspect-square rounded-tag overflow-hidden bg-dash-border border-2 border-transparent"
          >
            <img :src="img.preview" class="h-full w-full object-cover" />
            <div v-if="committed.length === 0 && idx === 0"
              class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                     bg-dash-text/70 text-white backdrop-blur-sm leading-none">
              {{ t('productCreate.cover') }}
            </div>
            <button type="button" @click="removePending(idx)"
              class="absolute top-1 right-1 w-5 h-5 rounded-full bg-dash-text/60 text-white
                     flex items-center justify-center opacity-0 group-hover:opacity-100
                     transition-opacity hover:bg-dash-danger">
              <X :size="10" />
            </button>
          </div>
        </div>
        <p class="text-2xs text-dash-faint mt-2 text-center">
          {{ t('stepper.imageCount', committed.length + pending.length) }}
          <span v-if="pending.length > 0">{{ t('stepper.pendingUpload', pending.length) }}</span>
        </p>
      </div>

      <!-- Required error -->
      <p v-if="showRequired" class="mt-2 text-2xs text-dash-danger">{{ t('stepper.imagesRequired') }}</p>
    </section>

    <!-- Upload error -->
    <p v-if="uploadError" class="text-2xs text-dash-danger mt-1">{{ uploadError }}</p>

    <!-- Nav -->
    <div class="flex items-center justify-between pt-2">
      <AButton size="sm" variant="secondary" @click="emit('back')">{{ t('stepper.back') }}</AButton>
      <AButton size="sm" :loading="uploading" @click="handleNext">{{ t('stepper.nextVariants') }}</AButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, ImagePlus } from 'lucide-vue-next'
import { apiGetImages, apiUploadImages, apiSetThumbnail, apiDeleteImage } from '../../api/admin'
import type { ProductImage } from '../../types'
import AButton from '../ui/AButton.vue'

const props = defineProps<{ productId: number }>()
const emit  = defineEmits<{ next: []; back: [] }>()

const { t } = useI18n()

interface Pending { file: File; preview: string }
const committed    = ref<ProductImage[]>([])
const pending      = ref<Pending[]>([])
const uploading    = ref(false)
const dragging     = ref(false)
const showRequired = ref(false)
const uploadError  = ref('')

function addFiles(files: File[]) {
  const images    = files.filter(f => f.type.startsWith('image/'))
  const remaining = 10 - committed.value.length - pending.value.length
  images.slice(0, remaining).forEach(f =>
    pending.value.push({ file: f, preview: URL.createObjectURL(f) })
  )
}

function handleFileInput(e: Event) {
  addFiles(Array.from((e.target as HTMLInputElement).files ?? []))
  ;(e.target as HTMLInputElement).value = ''
}

function handleDrop(e: DragEvent) {
  dragging.value = false
  addFiles(Array.from(e.dataTransfer?.files ?? []))
}

function removePending(idx: number) {
  URL.revokeObjectURL(pending.value[idx].preview)
  pending.value.splice(idx, 1)
}

async function setThumbnail(img: ProductImage) {
  if (img.isThumbnail) return
  try {
    await apiSetThumbnail(props.productId, img.id)
    committed.value.forEach(i => { i.isThumbnail = i.id === img.id })
  } catch { /* silent */ }
}

async function deleteCommitted(img: ProductImage) {
  try {
    await apiDeleteImage(props.productId, img.id)
    committed.value = committed.value.filter(i => i.id !== img.id)
  } catch { /* silent */ }
}

async function handleNext() {
  if (committed.value.length === 0 && pending.value.length === 0) {
    showRequired.value = true
    return
  }
  showRequired.value = false
  uploadError.value = ''
  if (pending.value.length > 0) {
    uploading.value = true
    let uploadOk = true
    try {
      const { data } = await apiUploadImages(props.productId, pending.value.map(p => p.file))
      pending.value.forEach(p => URL.revokeObjectURL(p.preview))
      pending.value = []
      committed.value = [...committed.value, ...data]
    } catch {
      uploadError.value = t('common.saveFailed')
      uploadOk = false
    } finally {
      uploading.value = false
    }
    if (!uploadOk) return
  }
  emit('next')
}

onMounted(async () => {
  try {
    const { data } = await apiGetImages(props.productId)
    committed.value = data
  } catch { /* silent */ }
})

onBeforeUnmount(() => {
  pending.value.forEach(p => URL.revokeObjectURL(p.preview))
})
</script>

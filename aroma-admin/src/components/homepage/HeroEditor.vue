<!-- aroma-admin/src/components/homepage/HeroEditor.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HeroConfig } from '../../types'
import AInput from '../ui/AInput.vue'
import AButton from '../ui/AButton.vue'

const { t } = useI18n()

defineProps<{
  modelValue: HeroConfig
  saving: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [HeroConfig]
  save: []
  'remove-image': []
}>()

const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

function removeImage() {
  imageFile.value = null
  imagePreview.value = null
  emit('remove-image')
}

defineExpose({ imageFile })
</script>

<template>
  <div class="rounded-lg border border-dash-border bg-dash-paper-2 p-5 space-y-4">
    <h2 class="text-[13px] font-semibold text-dash-text mb-1">{{ t('homepage.hero.sectionTitle') }}</h2>

    <div class="grid grid-cols-2 gap-3">
      <AInput
        :label="t('homepage.hero.headline')"
        dir="rtl"
        :model-value="modelValue.headline"
        @update:model-value="emit('update:modelValue', { ...modelValue, headline: $event })"
      />
      <AInput
        :label="t('homepage.hero.subtext')"
        dir="rtl"
        :model-value="modelValue.subtext"
        @update:model-value="emit('update:modelValue', { ...modelValue, subtext: $event })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <AInput
        :label="t('homepage.hero.primaryCtaLabel')"
        dir="rtl"
        :model-value="modelValue.cta_primary_label"
        @update:model-value="emit('update:modelValue', { ...modelValue, cta_primary_label: $event })"
      />
      <AInput
        :label="t('homepage.hero.primaryCtaUrl')"
        :model-value="modelValue.cta_primary_url"
        @update:model-value="emit('update:modelValue', { ...modelValue, cta_primary_url: $event })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <AInput
        :label="t('homepage.hero.secondaryCtaLabel')"
        dir="rtl"
        :model-value="modelValue.cta_secondary_label"
        @update:model-value="emit('update:modelValue', { ...modelValue, cta_secondary_label: $event })"
      />
      <AInput
        :label="t('homepage.hero.secondaryCtaUrl')"
        :model-value="modelValue.cta_secondary_url"
        @update:model-value="emit('update:modelValue', { ...modelValue, cta_secondary_url: $event })"
      />
    </div>

    <!-- Hero image -->
    <div>
      <p class="text-[11px] font-medium text-dash-muted mb-2 uppercase tracking-wide">{{ t('homepage.hero.heroImage') }}</p>
      <div v-if="imagePreview || modelValue.bg_image_path" class="relative w-48 h-28 rounded overflow-hidden mb-2">
        <img
          :src="imagePreview ?? '/storage/' + modelValue.bg_image_path"
          class="w-full h-full object-cover"
          alt="Hero preview"
        />
        <button
          type="button"
          @click="removeImage"
          class="absolute top-1 right-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px]"
        >
          {{ t('homepage.hero.removeImage') }}
        </button>
      </div>
      <label class="flex items-center gap-2 cursor-pointer">
        <span class="text-[12px] px-3 py-1.5 rounded border border-dash-border bg-dash-paper text-dash-text hover:bg-dash-bg transition-colors">
          {{ imagePreview || modelValue.bg_image_path ? t('homepage.hero.replaceImage') : t('homepage.hero.uploadImage') }}
        </span>
        <span class="text-[11px] text-dash-muted">{{ t('homepage.hero.imageHint') }}</span>
        <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
      </label>
    </div>

    <div class="flex justify-end pt-1">
      <AButton :loading="saving" @click="emit('save')">{{ t('homepage.hero.saveHero') }}</AButton>
    </div>
  </div>
</template>

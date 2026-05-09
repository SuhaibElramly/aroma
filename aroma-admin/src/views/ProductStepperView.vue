<!-- aroma-admin/src/views/ProductStepperView.vue -->
<template>
  <div class="min-h-full animate-fade-up">

    <!-- Sticky header -->
    <div class="sticky top-0 z-10 bg-dash-bg border-b border-dash-border -mx-6 px-6 py-3 mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <RouterLink
          to="/products"
          class="flex items-center justify-center w-7 h-7 rounded-btn text-dash-muted hover:text-dash-text hover:bg-dash-surface border border-dash-border transition-all duration-150"
        >
          <ChevronLeft :size="14" />
        </RouterLink>
        <div>
          <p class="text-2xs text-dash-muted leading-none mb-0.5">{{ t('nav.products') }}</p>
          <h1 class="text-sm font-semibold text-dash-text leading-none">
            {{ mode === 'create' ? t('stepper.newProduct') : (productName || t('stepper.editProduct')) }}
          </h1>
        </div>
      </div>
      <!-- Edit mode: Cancel button in header -->
      <div v-if="mode === 'edit'" class="flex items-center gap-2">
        <RouterLink to="/products">
          <AButton variant="secondary" size="sm">{{ t('common.cancel') }}</AButton>
        </RouterLink>
      </div>
    </div>

    <!-- Loading state (edit mode initial load) -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-dash-primary border-t-transparent" />
    </div>

    <template v-else>
      <!-- Step indicators -->
      <div class="flex items-center gap-0 mb-8 px-1">
        <template v-for="(step, idx) in steps" :key="step.key">
          <!-- Step -->
          <button
            type="button"
            class="flex items-center gap-2.5 flex-1 transition-opacity"
            :class="[
              canJumpTo(idx) ? 'cursor-pointer' : 'cursor-default',
              currentStep === idx ? 'opacity-100' : 'opacity-70 hover:opacity-90',
            ]"
            :disabled="!canJumpTo(idx)"
            @click="canJumpTo(idx) && (currentStep = idx)"
          >
            <!-- Circle -->
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all"
              :class="stepCircleClass(idx)"
            >
              <Check v-if="isComplete(idx)" :size="10" />
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div class="text-left">
              <div class="text-xs font-semibold" :class="currentStep === idx ? 'text-dash-text' : 'text-dash-muted'">
                {{ t(step.labelKey) }}
              </div>
              <div class="text-2xs" :class="stepSubLabel(idx) === t('stepper.inProgress') ? 'text-dash-primary' : 'text-dash-faint'">
                {{ stepSubLabel(idx) }}
              </div>
            </div>
          </button>
          <!-- Connector line -->
          <div
            v-if="idx < steps.length - 1"
            class="flex-1 h-px mx-2 transition-colors"
            :class="isComplete(idx) ? 'bg-emerald-500' : 'bg-dash-border'"
          />
        </template>
      </div>

      <!-- Step content -->
      <StepBasicInfo
        v-if="currentStep === 0"
        :productId="productId"
        :initialData="initialProduct"
        @saved="onBasicInfoSaved"
      />
      <StepImages
        v-else-if="currentStep === 1"
        :productId="productId!"
        @next="onImagesNext"
        @back="currentStep = 0"
      />
      <StepVariants
        v-else-if="currentStep === 2"
        :productId="productId!"
        @back="currentStep = 1"
        @done="handleDone"
      />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, Check } from 'lucide-vue-next'
import { apiGetProduct } from '../api/admin'
import type { AdminProduct } from '../types'
import AButton       from '../components/ui/AButton.vue'
import StepBasicInfo from '../components/product/StepBasicInfo.vue'
import StepImages    from '../components/product/StepImages.vue'
import StepVariants  from '../components/product/StepVariants.vue'

const route  = useRoute()
const router = useRouter()
const { t }  = useI18n()

const mode           = computed<'create' | 'edit'>(() => route.name === 'product-edit' ? 'edit' : 'create')
const productId      = ref<number | null>(null)
const productName    = ref('')
const initialProduct = ref<AdminProduct | null>(null)
const loading        = ref(false)

// 0=BasicInfo  1=Images  2=Variants
const currentStep = ref(0)
// In create mode, tracks the highest step reached (determines which steps are unlocked)
const highestStep = ref(0)

const steps = [
  { key: 'basicInfo', labelKey: 'stepper.stepBasicInfo' },
  { key: 'images',    labelKey: 'stepper.stepImages' },
  { key: 'variants',  labelKey: 'stepper.stepVariants' },
]

function isComplete(idx: number): boolean {
  if (mode.value === 'edit') return idx < currentStep.value || idx <= highestStep.value
  return idx < highestStep.value
}

function canJumpTo(idx: number): boolean {
  if (mode.value === 'edit') return true
  return idx <= highestStep.value
}

function stepCircleClass(idx: number): string {
  if (currentStep.value === idx) return 'bg-dash-primary text-white ring-2 ring-dash-primary/30'
  if (isComplete(idx)) return 'bg-emerald-500 text-white'
  return 'bg-dash-border text-dash-muted'
}

function stepSubLabel(idx: number): string {
  if (isComplete(idx) && currentStep.value !== idx) return t('stepper.done')
  if (currentStep.value === idx) return t('stepper.inProgress')
  if (mode.value === 'create' && idx > highestStep.value) return t('stepper.locked')
  return t('stepper.clickToEdit')
}

function onBasicInfoSaved(id: number) {
  productId.value = id
  currentStep.value = 1
  if (highestStep.value < 1) highestStep.value = 1
}

function onImagesNext() {
  currentStep.value = 2
  if (highestStep.value < 2) highestStep.value = 2
}

function handleDone() {
  router.push('/products')
}

onMounted(async () => {
  if (mode.value === 'edit') {
    const id = Number(route.params.id)
    if (!id || isNaN(id)) { router.replace('/products'); return }
    productId.value  = id
    highestStep.value = 2
    loading.value    = true
    try {
      const { data } = await apiGetProduct(id)
      initialProduct.value = data
      productName.value    = data.name
    } catch { /* handle gracefully — stepper still renders */ } finally {
      loading.value = false
    }
  }
})
</script>

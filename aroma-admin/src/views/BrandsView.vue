<!-- aroma-admin/src/views/BrandsView.vue -->
<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1280px]">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <!-- KPI strip -->
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('brands.kpiAllBrands') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ brands.length }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('brands.kpiInYourCatalog') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('brands.kpiActive') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ brands.filter(b => (b.productCount ?? 0) > 0).length }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('brands.kpiSellingNow') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('brands.kpiBrandProducts') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ brands.reduce((s, b) => s + (b.productCount ?? 0), 0) }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('brands.kpiAcrossCatalog') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('brands.kpiRevenue') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">—</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('brands.kpiLydThisMonth') }}</p>
      </div>
    </div>

    <!-- Toolbar: search + view toggle + add -->
    <div class="bg-dash-paper border border-dash-border rounded-card p-4 flex items-center gap-3 flex-wrap shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
      <!-- Search -->
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dash-border-lt flex-1 min-w-[200px] bg-dash-paper-2">
        <svg class="text-dash-faint shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input
          v-model="filterName"
          :placeholder="t('brands.searchPlaceholder')"
          class="bg-transparent text-[12.5px] outline-none flex-1 text-dash-text-2"
          @input="debouncedLoad"
        />
      </div>
      <!-- View toggle -->
      <div class="flex items-center p-1 rounded-lg border border-dash-border-lt bg-dash-paper-2">
        <button
          v-for="[k, ico] in viewOptions"
          :key="k"
          class="h-7 w-8 grid place-items-center rounded-md transition-colors"
          :style="{
            background: view === k ? 'white' : 'transparent',
            color: view === k ? 'var(--dash-text)' : 'var(--dash-muted)',
            boxShadow: view === k ? '0 1px 2px rgba(0,0,0,.04)' : 'none'
          }"
          @click="view = k"
          v-html="ico"
        />
      </div>
      <!-- Add button -->
      <button
        class="h-9 px-3 rounded-lg text-[12px] font-medium text-white inline-flex items-center gap-1.5 whitespace-nowrap bg-dash-text hover:opacity-90 transition-opacity"
        @click="openCreate"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {{ t('brands.add') }}
      </button>
    </div>

    <!-- Grid view -->
    <div v-if="view === 'grid'" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="(brand, i) in filteredBrands"
        :key="brand.id"
        class="bg-dash-paper border border-dash-border rounded-card overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      >
        <!-- Tinted header with monogram -->
        <div
          class="relative h-24"
          :style="{ background: `radial-gradient(120% 80% at 30% 20%, oklch(94% 0.05 ${brandHue(brand, i)}), oklch(88% 0.07 ${brandHue(brand, i) + 20}))` }"
        >
          <!-- diagonal texture -->
          <div class="absolute inset-0 opacity-[0.05] overflow-hidden"
            style="background-image: repeating-linear-gradient(135deg, transparent 0 8px, rgba(0,0,0,.6) 8px 9px)" />
          <!-- monogram badge at bottom-left, overlapping -->
          <div class="absolute -bottom-7 left-4 h-14 w-14 rounded-2xl bg-white grid place-items-center font-display text-[20px] border border-dash-border-lt overflow-hidden"
            :style="{ color: `oklch(34% 0.07 ${brandHue(brand, i)})`, boxShadow: '0 4px 14px oklch(26% 0.04 250 / .08)' }">
            <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.name" class="w-full h-full object-contain p-1.5" />
            <span v-else>{{ monogram(brand.name || brand.nameEn || '') }}</span>
          </div>
        </div>
        <!-- Card body -->
        <div class="px-4 pt-9 pb-4">
          <p class="font-display text-[15px] text-dash-text leading-snug">{{ brand.name || brand.nameEn }}</p>
          <p v-if="brand.nameEn && brand.name !== brand.nameEn" class="text-[11px] text-dash-faint mt-0.5">{{ brand.nameEn }}</p>
          <p v-if="brand.tagline" class="text-[11px] text-dash-muted mt-1 line-clamp-2">{{ brand.tagline }}</p>
          <div class="mt-3 flex items-center justify-between text-[11.5px]">
            <span v-if="brand.origin" class="text-dash-faint inline-flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="10" r="3"/><path d="M12 2c5 4 7 7 7 10 0 5-7 10-7 10S5 17 5 12c0-3 2-6 7-10z"/></svg>
              {{ brand.origin }}
            </span>
            <span class="font-semibold text-dash-text">{{ brand.productCount ?? 0 }} <span class="font-normal text-dash-muted">{{ t('brands.productsUnit') }}</span></span>
          </div>
          <!-- actions -->
          <div class="mt-3 pt-3 border-t border-dash-border-lt flex gap-1.5">
            <button class="text-[11px] text-dash-muted hover:text-dash-text px-2 py-0.5 rounded-btn border border-dash-border-lt" @click.stop="openEdit(brand)">{{ t('common.edit') }}</button>
            <button class="text-[11px] text-dash-danger px-2 py-0.5 rounded-btn border border-dash-danger-lt" @click.stop="confirmDelete(brand)">{{ t('common.delete') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <ATable v-else :columns="cols" :rows="filteredBrands" :loading="loading">
      <template #cell-name="{ row }">
        <RouterLink :to="`/brands/${(row as AdminBrand).id}`" class="group block">
          <div class="flex items-center gap-2.5">
            <div class="h-9 w-9 rounded-lg grid place-items-center font-display text-[13px] border border-dash-border-lt overflow-hidden"
              :style="{
                background: `oklch(94% 0.04 ${brandHue(row as AdminBrand, brands.indexOf(row as AdminBrand))})`,
                color: `oklch(34% 0.07 ${brandHue(row as AdminBrand, brands.indexOf(row as AdminBrand))})`
              }">
              <img v-if="(row as AdminBrand).logoUrl" :src="(row as AdminBrand).logoUrl!" :alt="(row as AdminBrand).name" class="w-full h-full object-contain p-1" />
              <span v-else>{{ monogram((row as AdminBrand).name || (row as AdminBrand).nameEn || '') }}</span>
            </div>
            <div>
              <p class="font-medium text-xs group-hover:text-dash-primary transition-colors">{{ (row as AdminBrand).name }}</p>
              <p v-if="(row as AdminBrand).nameEn" class="text-[10px] text-dash-faint">{{ (row as AdminBrand).nameEn }}</p>
            </div>
          </div>
        </RouterLink>
      </template>
      <template #cell-id="{ value }">
        <span class="font-mono text-[10px] text-dash-faint">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end rtl:justify-start">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminBrand)">{{ t('common.edit') }}</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminBrand)">{{ t('common.delete') }}</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Tag" :heading="t('brands.noData')" />
      </template>
    </ATable>

    <!-- Create / Edit Modal -->
    <AModal :open="modalOpen" :title="editing ? t('brands.editTitle') : t('brands.createTitle')" @close="closeModal">
      <form class="space-y-3" @submit.prevent>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.name"    :label="t('brands.nameArabic')"  :error="formErrors.name"    dir="rtl" />
          <AInput v-model="form.name_en" :label="t('brands.nameEnglish')" :error="formErrors.name_en" />
        </div>

        <div
          v-if="!editing"
          class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dash-border px-3 py-2"
        >
          <Link2 :size="12" class="text-dash-faint shrink-0" />
          <span class="text-2xs text-dash-muted">{{ t('brands.brandIdLabel') }}</span>
          <span v-if="generatedSlug" class="text-2xs font-medium text-dash-text font-mono">{{ generatedSlug }}</span>
          <span v-else class="text-2xs text-dash-faint italic">{{ t('brands.slugTypingHint') }}</span>
        </div>

        <AInput v-model="form.origin"  :label="t('brands.originLabel')" />
        <AInput v-model="form.tagline" :label="t('brands.taglineLabel')" />

        <div class="flex flex-col gap-1.5">
          <label class="text-2xs font-semibold text-dash-muted uppercase tracking-wider">
            {{ t('brands.bgLabel') }}
          </label>
          <div class="flex items-center gap-2">
            <div class="relative w-9 h-9 rounded-btn overflow-hidden border border-dash-border shrink-0">
              <input type="color" v-model="form.bg" class="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
              <div class="w-full h-full" :style="{ backgroundColor: form.bg }" />
            </div>
            <input
              type="text"
              v-model="form.bg"
              maxlength="7"
              placeholder="#F4EFE8"
              class="flex-1 min-w-0 rounded-btn border bg-dash-surface px-3 py-2 text-xs font-mono text-dash-text placeholder:text-dash-faint focus:outline-none focus:border-dash-primary focus:ring-2 focus:ring-dash-primary/10 transition-all duration-200"
              :class="formErrors.bg ? 'border-dash-danger bg-dash-danger-lt/40' : 'border-dash-border hover:border-dash-muted/40'"
            />
          </div>
          <p v-if="formErrors.bg" class="text-2xs text-dash-danger">{{ formErrors.bg }}</p>
        </div>

        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2">{{ t('brands.logoLabel') }}</p>
          <div v-if="logoPreview" class="flex items-center gap-3">
            <img :src="logoPreview" alt="Brand logo" class="h-12 w-12 object-contain rounded border border-dash-border bg-dash-bg p-1" />
            <AButton size="sm" variant="ghost" type="button" @click="removeLogo">
              <X :size="12" /> {{ t('common.remove') }}
            </AButton>
          </div>
          <label v-else class="flex items-center gap-2 cursor-pointer rounded-btn border border-dashed border-dash-border px-3 py-2.5 text-xs text-dash-faint hover:border-dash-muted transition-colors">
            <Image :size="14" />
            {{ t('brands.logoUploadHint') }}
            <input type="file" accept="image/*" class="sr-only" @change="pickLogoFile" />
          </label>
        </div>

        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="closeModal">{{ t('common.cancel') }}</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? t('brands.save') : t('brands.add') }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingBrand"
      :title="t('brands.deleteTitle')"
      :message="deletingBrand?.productCount
        ? t('brands.deleteHasProducts', { count: deletingBrand.productCount })
        : t('brands.deleteMessage', { name: deletingBrand?.name ?? '' })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingBrand = null"
    />
    <div v-if="deleteError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ deleteError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Tag, Link2, Image, X } from 'lucide-vue-next'
import { apiGetBrands, apiCreateBrand, apiUpdateBrand, apiDeleteBrand, apiUploadBrandLogo, apiDeleteBrandLogo } from '../api/admin'
import type { AdminBrand } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const { t } = useI18n()

// ── View state ────────────────────────────────────────────────────────
const view = ref<'grid' | 'list'>('grid')

const viewOptions: ['grid' | 'list', string][] = [
  ['grid', `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`],
  ['list', `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`],
]

// ── Filter state ──────────────────────────────────────────────────────
const filterName        = ref('')
const filterOrigin      = ref('')
const filterTagline     = ref('')
const filterMinProducts = ref('')
const filterMaxProducts = ref('')

// ── List state ────────────────────────────────────────────────────────
const brands      = ref<AdminBrand[]>([])
const loading     = ref(true)
const loadError   = ref<string | null>(null)

// ── Filtered brands ───────────────────────────────────────────────────
const filteredBrands = computed(() => {
  if (!filterName.value) return brands.value
  const q = filterName.value.toLowerCase()
  return brands.value.filter(b =>
    b.name?.toLowerCase().includes(q) ||
    b.nameEn?.toLowerCase().includes(q) ||
    b.origin?.toLowerCase().includes(q)
  )
})

// ── Modal state ───────────────────────────────────────────────────────
const modalOpen    = ref(false)
const editing      = ref<AdminBrand | null>(null)
const saving       = ref(false)
const deletingBrand= ref<AdminBrand | null>(null)
const deleting     = ref(false)
const deleteError  = ref<string | null>(null)
const formErrors   = ref<Record<string, string>>({})

const logoPreview     = ref<string | null>(null)
const pendingLogoFile = ref<File | null>(null)
const logoRemoved     = ref(false)

const emptyForm = () => ({ name: '', name_en: '', origin: '', tagline: '', bg: '#F4EFE8' })
const form = ref(emptyForm())

// Derive slug from English name: "Jo Malone" → "jo-malone"
const generatedSlug = computed(() =>
  form.value.name_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
)

const cols = computed(() => [
  { key: 'id',           label: t('brands.columns.id') },
  { key: 'name',         label: t('brands.columns.name') },
  { key: 'origin',       label: t('brands.columns.origin') },
  { key: 'tagline',      label: t('brands.columns.tagline') },
  { key: 'productCount', label: t('brands.columns.products') },
])

// ── Design helpers ────────────────────────────────────────────────────
const HUE_PALETTE = [32, 340, 200, 96, 48, 140, 280, 18, 54, 24, 8, 160]

function brandHue(_brand: AdminBrand, index: number): number {
  return HUE_PALETTE[index % HUE_PALETTE.length]
}

function monogram(name: string): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  return (words[0][0] + (words[1]?.[0] ?? words[0][1] ?? '')).toUpperCase()
}

// ── Data fetching ─────────────────────────────────────────────────────
async function loadBrands() {
  loading.value  = true
  loadError.value = null
  try {
    brands.value = (await apiGetBrands({
      name:         filterName.value        || undefined,
      origin:       filterOrigin.value      || undefined,
      tagline:      filterTagline.value     || undefined,
      min_products: filterMinProducts.value ? Number(filterMinProducts.value) : undefined,
      max_products: filterMaxProducts.value ? Number(filterMaxProducts.value) : undefined,
    })).data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : t('brands.loadError')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadBrands(), 350)
}

// ── Modal helpers ─────────────────────────────────────────────────────
function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formErrors.value = {}
  if (logoPreview.value?.startsWith('blob:')) URL.revokeObjectURL(logoPreview.value)
  logoPreview.value     = null
  pendingLogoFile.value = null
  logoRemoved.value     = false
  modalOpen.value = true
}

function openEdit(b: AdminBrand) {
  editing.value = b
  form.value = { name: b.name, name_en: b.nameEn ?? '', origin: b.origin ?? '', tagline: b.tagline ?? '', bg: b.bg }
  formErrors.value  = {}
  if (logoPreview.value?.startsWith('blob:')) URL.revokeObjectURL(logoPreview.value)
  logoPreview.value  = b.logoUrl ?? null
  pendingLogoFile.value = null
  logoRemoved.value  = false
  modalOpen.value    = true
}

function pickLogoFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (logoPreview.value?.startsWith('blob:')) URL.revokeObjectURL(logoPreview.value)
  pendingLogoFile.value = file
  logoRemoved.value     = false
  logoPreview.value     = URL.createObjectURL(file)
}

function removeLogo() {
  if (logoPreview.value?.startsWith('blob:')) URL.revokeObjectURL(logoPreview.value)
  pendingLogoFile.value = null
  logoPreview.value     = null
  logoRemoved.value     = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.name) { formErrors.value.name = t('common.nameRequired'); return }
  if (!form.value.bg)   { formErrors.value.bg   = t('common.colourRequired'); return }
  if (!editing.value && !generatedSlug.value) {
    formErrors.value.name_en = t('brands.nameEnRequired')
    return
  }

  saving.value = true
  try {
    let brandId: string
    if (editing.value) {
      await apiUpdateBrand(editing.value.id, form.value)
      brandId = editing.value.id
    } else {
      const res = await apiCreateBrand({ id: generatedSlug.value, ...form.value })
      brandId = res.data.id
    }

    if (pendingLogoFile.value) {
      await apiUploadBrandLogo(brandId, pendingLogoFile.value)
    } else if (logoRemoved.value && editing.value?.logoUrl) {
      await apiDeleteBrandLogo(brandId)
    }

    closeModal()
    loadBrands()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : t('common.saveFailed')
    loadBrands()
  } finally {
    saving.value = false
  }
}

function closeModal() {
  if (logoPreview.value?.startsWith('blob:')) URL.revokeObjectURL(logoPreview.value)
  logoPreview.value     = null
  pendingLogoFile.value = null
  logoRemoved.value     = false
  modalOpen.value       = false
}

function confirmDelete(b: AdminBrand) { deletingBrand.value = b }

async function handleDelete() {
  if (!deletingBrand.value) return
  deleteError.value = null
  deleting.value = true
  try {
    await apiDeleteBrand(deletingBrand.value.id)
    deletingBrand.value = null
    loadBrands()
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : t('common.deleteFailed')
    deletingBrand.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(loadBrands)
onUnmounted(() => clearTimeout(debounceTimer))
</script>

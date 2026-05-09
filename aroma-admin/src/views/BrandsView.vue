<!-- aroma-admin/src/views/BrandsView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> {{ t('brands.add') }}</AButton>
    </div>

    <!-- Filters -->
    <div class="space-y-3">
      <div class="grid grid-cols-3 gap-3">
        <AInput v-model="filterName"    :label="t('brands.filterName')"    placeholder="Search AR / EN…"  @input="debouncedLoad" />
        <AInput v-model="filterOrigin"  :label="t('brands.filterOrigin')"  placeholder="e.g. France"      @input="debouncedLoad" />
        <AInput v-model="filterTagline" :label="t('brands.filterTagline')" placeholder="Keyword…"         @input="debouncedLoad" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AInput v-model="filterMinProducts" :label="t('brands.filterMinProducts')" type="number" placeholder="0"   @input="debouncedLoad" />
        <AInput v-model="filterMaxProducts" :label="t('brands.filterMaxProducts')" type="number" placeholder="Any" @input="debouncedLoad" />
      </div>
    </div>

    <ATable :columns="cols" :rows="brands" :loading="loading">
      <template #cell-name="{ row }">
        <RouterLink
          :to="`/brands/${(row as AdminBrand).id}`"
          class="group block"
        >
          <p class="font-medium text-xs group-hover:text-dash-primary transition-colors">{{ (row as AdminBrand).name }}</p>
          <p v-if="(row as AdminBrand).nameEn" class="text-[10px] text-dash-faint">{{ (row as AdminBrand).nameEn }}</p>
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

    <AModal :open="modalOpen" :title="editing ? t('brands.editTitle') : t('brands.createTitle')" @close="closeModal">
      <form class="space-y-3" @submit.prevent>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.name"    :label="t('brands.nameArabic')"  :error="formErrors.name"    dir="rtl" />
          <AInput v-model="form.name_en" :label="t('brands.nameEnglish')" :error="formErrors.name_en" />
        </div>

        <!-- Slug preview — only shown when creating -->
        <div
          v-if="!editing"
          class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dash-border px-3 py-2"
        >
          <Link2 :size="12" class="text-dash-faint shrink-0" />
          <span class="text-2xs text-dash-muted">{{ t('brands.brandIdLabel') }}</span>
          <span
            v-if="generatedSlug"
            class="text-2xs font-medium text-dash-text font-mono"
          >{{ generatedSlug }}</span>
          <span v-else class="text-2xs text-dash-faint italic">{{ t('brands.slugTypingHint') }}</span>
        </div>

        <AInput v-model="form.origin"  :label="t('brands.originLabel')" />
        <AInput v-model="form.tagline" :label="t('brands.taglineLabel')" />
        <AInput v-model="form.bg"      :label="t('brands.bgLabel')" placeholder="#F4EFE8" :error="formErrors.bg" />

        <!-- Logo -->
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
import { Plus, Tag, Link2, Image, X } from 'lucide-vue-next'
import { apiGetBrands, apiCreateBrand, apiUpdateBrand, apiDeleteBrand, apiUploadBrandLogo, apiDeleteBrandLogo } from '../api/admin'
import type { AdminBrand } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const { t } = useI18n()

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

const emptyForm = () => ({ name: '', name_en: '', origin: '', tagline: '', bg: '' })
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

<!-- aroma-admin/src/views/CategoriesView.vue -->
<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1280px]">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <!-- KPI strip -->
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('categories.title') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ categories.length }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('categories.kpiInCatalog') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('categories.kpiTaggedProducts') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ categories.reduce((s, c) => s + (c.productCount ?? 0), 0) }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('categories.kpiProductsTaggedSub') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('categories.kpiTopCategory') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text truncate">{{ topCategory?.label ?? '—' }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ topCategory ? `${topCategory.productCount} ${t('categories.productsUnit')}` : t('categories.kpiNoData') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('categories.kpiEmpty') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ categories.filter(c => (c.productCount ?? 0) === 0).length }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('categories.kpiNoProductsYet') }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-dash-paper border border-dash-border rounded-card p-4 flex items-center gap-3 flex-wrap shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
      <!-- Search -->
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dash-border-lt flex-1 min-w-[200px] bg-dash-paper-2">
        <svg class="text-dash-faint shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input
          v-model="filterLabel"
          :placeholder="t('categories.searchPlaceholder')"
          class="bg-transparent text-[12.5px] outline-none flex-1 text-dash-text-2"
          @input="debouncedLoad"
        />
      </div>
      <button
        class="h-9 px-3 rounded-lg text-[12px] font-medium text-white inline-flex items-center gap-1.5 whitespace-nowrap bg-dash-text hover:opacity-90 transition-opacity"
        @click="openCreate"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {{ t('categories.add') }}
      </button>
    </div>

    <!-- Categories grid -->
    <div v-if="!loading" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      <div
        v-for="(cat, i) in filteredCategories"
        :key="cat.id"
        class="bg-dash-paper border border-dash-border rounded-card p-4 flex flex-col items-center gap-2 transition-shadow hover:shadow-md"
      >
        <!-- monogram circle -->
        <div
          class="h-12 w-12 rounded-full flex items-center justify-center text-[20px] font-display font-semibold text-white"
          :style="{ background: `oklch(58% 0.07 ${catHue(i)})` }"
        >
          {{ cat.label[0]?.toUpperCase() ?? '?' }}
        </div>
        <p class="text-[13px] font-medium text-dash-text text-center">{{ cat.label }}</p>
        <p class="text-[11px] text-dash-faint">{{ cat.productCount ?? 0 }} {{ t('categories.productsUnit') }}</p>
        <!-- Edit/Delete buttons -->
        <div class="flex gap-1.5 mt-1">
          <button
            class="text-[11px] text-dash-muted hover:text-dash-text px-2 py-0.5 rounded-btn border border-dash-border-lt"
            @click.stop="openEdit(cat)"
          >{{ t('common.edit') }}</button>
          <button
            class="text-[11px] text-dash-danger px-2 py-0.5 rounded-btn border border-dash-danger-lt"
            @click.stop="confirmDelete(cat)"
          >{{ t('common.delete') }}</button>
        </div>
      </div>
      <!-- Empty state -->
      <div v-if="filteredCategories.length === 0" class="col-span-full py-12 text-center text-sm text-dash-muted">
        {{ t('categories.noData') }}
      </div>
    </div>

    <!-- Loading state -->
    <div v-else class="py-12 text-center text-sm text-dash-muted">{{ t('common.loading') }}</div>

    <!-- Create / Edit Modal -->
    <AModal :open="modalOpen" :title="editing ? t('categories.editTitle') : t('categories.createTitle')" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-model="form.label" :label="t('categories.labelField')" :error="formErrors.label" />
        <AInput v-model="form.bg"    :label="t('categories.bgLabel')" placeholder="#F4EFE8" :error="formErrors.bg" />
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">{{ t('common.cancel') }}</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? t('common.save') : t('common.add') }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingCat"
      :title="t('categories.deleteTitle')"
      :message="t('categories.deleteMessage', { name: deletingCat?.label ?? '' })"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingCat = null"
    />
    <div v-if="deleteError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ deleteError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../api/admin'
import type { AdminCategory } from '../types'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const { t } = useI18n()

const categories = ref<AdminCategory[]>([])
const loading    = ref(true)
const loadError  = ref<string | null>(null)
const modalOpen  = ref(false)
const editing    = ref<AdminCategory | null>(null)
const saving     = ref(false)
const deletingCat= ref<AdminCategory | null>(null)
const deleting   = ref(false)
const deleteError= ref<string | null>(null)
const formErrors = ref<Record<string,string>>({})

const filterLabel       = ref('')
const filterMinProducts = ref('')
const filterMaxProducts = ref('')

const emptyForm = () => ({ label: '', bg: '' })
const form = ref(emptyForm())

// ── Computed ──────────────────────────────────────────────────────────
const filteredCategories = computed(() => {
  if (!filterLabel.value) return categories.value
  const q = filterLabel.value.toLowerCase()
  return categories.value.filter(c => c.label.toLowerCase().includes(q))
})

const topCategory = computed(() => {
  if (!categories.value.length) return null
  return categories.value.reduce((best, c) =>
    (c.productCount ?? 0) > (best.productCount ?? 0) ? c : best
  )
})

// ── Design helpers ────────────────────────────────────────────────────
const HUE_PALETTE = [32, 200, 140, 96, 48, 280, 18, 340, 54, 160]
function catHue(index: number): number {
  return HUE_PALETTE[index % HUE_PALETTE.length]
}

// ── Data fetching ─────────────────────────────────────────────────────
async function loadCats() {
  loading.value = true
  loadError.value = null
  try {
    categories.value = (await apiGetCategories({
      label:        filterLabel.value       || undefined,
      min_products: filterMinProducts.value ? Number(filterMinProducts.value) : undefined,
      max_products: filterMaxProducts.value ? Number(filterMaxProducts.value) : undefined,
    })).data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : t('categories.loadError')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadCats(), 350)
}
onUnmounted(() => clearTimeout(debounceTimer))

function openCreate() { editing.value = null; form.value = emptyForm(); formErrors.value = {}; modalOpen.value = true }
function openEdit(c: AdminCategory) {
  editing.value = c
  form.value = { label: c.label, bg: c.bg }
  formErrors.value = {}; modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.label) { formErrors.value.label = t('categories.labelRequired'); return }
  if (!form.value.bg)    { formErrors.value.bg    = t('common.colourRequired'); return }
  saving.value = true
  try {
    editing.value
      ? await apiUpdateCategory(editing.value.id, form.value)
      : await apiCreateCategory(form.value)
    modalOpen.value = false; loadCats()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : t('common.saveFailed')
  } finally { saving.value = false }
}

function confirmDelete(c: AdminCategory) { deletingCat.value = c }

async function handleDelete() {
  if (!deletingCat.value) return
  deleteError.value = null
  deleting.value = true
  try {
    await apiDeleteCategory(deletingCat.value.id)
    deletingCat.value = null
    loadCats()
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : t('common.deleteFailed')
    deletingCat.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(loadCats)
</script>

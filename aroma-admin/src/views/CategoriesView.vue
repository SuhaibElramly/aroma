<!-- aroma-admin/src/views/CategoriesView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>
    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> {{ t('categories.add') }}</AButton>
    </div>

    <!-- Filters -->
    <div class="space-y-3">
      <div class="grid grid-cols-1 gap-3">
        <AInput v-model="filterLabel" :label="t('categories.filterLabel')" placeholder="Search label…" @input="debouncedLoad" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AInput v-model="filterMinProducts" :label="t('categories.filterMinProducts')" type="number" placeholder="0"   @input="debouncedLoad" />
        <AInput v-model="filterMaxProducts" :label="t('categories.filterMaxProducts')" type="number" placeholder="Any" @input="debouncedLoad" />
      </div>
    </div>

    <ATable :columns="cols" :rows="categories" :loading="loading">
      <template #cell-id="{ value }">
        <span class="font-mono text-[10px] text-dash-faint">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end rtl:justify-start">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminCategory)">{{ t('common.edit') }}</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminCategory)">{{ t('common.delete') }}</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Grid3X3" :heading="t('categories.noData')" />
      </template>
    </ATable>

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
import { Plus, Grid3X3 } from 'lucide-vue-next'
import { apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../api/admin'
import type { AdminCategory } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
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

const cols = computed(() => [
  { key: 'id',           label: t('categories.columns.id') },
  { key: 'label',        label: t('categories.columns.label') },
  { key: 'productCount', label: t('categories.columns.products') },
])

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
      ? await apiUpdateCategory(String(editing.value.id), form.value)
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
    await apiDeleteCategory(String(deletingCat.value.id))
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

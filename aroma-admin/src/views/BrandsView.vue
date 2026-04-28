<!-- aroma-admin/src/views/BrandsView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>
    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Brand</AButton>
    </div>

    <ATable :columns="cols" :rows="brands" :loading="loading">
      <template #cell-name="{ row }">
        <div>
          <p class="font-medium text-xs">{{ (row as AdminBrand).name }}</p>
          <p v-if="(row as AdminBrand).nameEn" class="text-[10px] text-dash-faint">{{ (row as AdminBrand).nameEn }}</p>
        </div>
      </template>
      <template #cell-id="{ value }">
        <span class="font-mono text-[10px] text-dash-faint">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminBrand)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminBrand)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Tag" heading="No brands yet" />
      </template>
    </ATable>

    <AModal :open="modalOpen" :title="editing ? 'Edit Brand' : 'Add Brand'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-if="!editing" v-model="form.id"      label="ID (slug, e.g. chanel)" :error="formErrors.id" />
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.name"    label="Name (Arabic)" :error="formErrors.name" />
          <AInput v-model="form.name_en" label="Name (English)" />
        </div>
        <AInput v-model="form.origin"  label="Country of origin" />
        <AInput v-model="form.tagline" label="Tagline" />
        <AInput v-model="form.bg"      label="Background colour" placeholder="#F4EFE8" :error="formErrors.bg" />
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Add' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingBrand"
      title="Delete brand?"
      :message="deletingBrand?.productCount
        ? `This brand has ${deletingBrand.productCount} products. Reassign them first.`
        : `Delete &quot;${deletingBrand?.name}&quot;? This cannot be undone.`"
      confirm-label="Delete"
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
import { ref, onMounted } from 'vue'
import { Plus, Tag } from 'lucide-vue-next'
import { apiGetBrands, apiCreateBrand, apiUpdateBrand, apiDeleteBrand } from '../api/admin'
import type { AdminBrand } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const brands       = ref<AdminBrand[]>([])
const loading      = ref(true)
const loadError    = ref<string | null>(null)
const modalOpen    = ref(false)
const editing      = ref<AdminBrand | null>(null)
const saving       = ref(false)
const deletingBrand= ref<AdminBrand | null>(null)
const deleting     = ref(false)
const deleteError  = ref<string | null>(null)
const formErrors   = ref<Record<string,string>>({})

const emptyForm = () => ({ id: '', name: '', name_en: '', origin: '', tagline: '', bg: '' })
const form = ref(emptyForm())

const cols = [
  { key: 'id',           label: 'ID' },
  { key: 'name',         label: 'Name' },
  { key: 'origin',       label: 'Origin' },
  { key: 'tagline',      label: 'Tagline' },
  { key: 'productCount', label: 'Products' },
]

async function loadBrands() {
  loading.value = true
  loadError.value = null
  try {
    brands.value = (await apiGetBrands()).data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load brands.'
  } finally {
    loading.value = false
  }
}

function openCreate() { editing.value = null; form.value = emptyForm(); formErrors.value = {}; modalOpen.value = true }
function openEdit(b: AdminBrand) {
  editing.value = b
  form.value = { id: b.id, name: b.name, name_en: b.nameEn ?? '', origin: b.origin ?? '', tagline: b.tagline ?? '', bg: b.bg }
  formErrors.value = {}; modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!editing.value && !form.value.id) { formErrors.value.id = 'ID is required'; return }
  if (!form.value.name) { formErrors.value.name = 'Name is required'; return }
  if (!form.value.bg)   { formErrors.value.bg   = 'Colour is required'; return }
  saving.value = true
  try {
    editing.value
      ? await apiUpdateBrand(editing.value.id, form.value)
      : await apiCreateBrand(form.value)
    modalOpen.value = false; loadBrands()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally { saving.value = false }
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
    deleteError.value = e instanceof Error ? e.message : 'Delete failed.'
    deletingBrand.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(loadBrands)
</script>

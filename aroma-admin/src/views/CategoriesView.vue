<!-- aroma-admin/src/views/CategoriesView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>
    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Category</AButton>
    </div>

    <ATable :columns="cols" :rows="categories" :loading="loading">
      <template #cell-id="{ value }">
        <span class="font-mono text-[10px] text-dash-faint">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminCategory)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminCategory)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Grid3X3" heading="No categories yet" />
      </template>
    </ATable>

    <AModal :open="modalOpen" :title="editing ? 'Edit Category' : 'Add Category'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-if="!editing" v-model="form.id"    label="ID (slug, e.g. women)" :error="formErrors.id" />
        <AInput v-model="form.label" label="Label" :error="formErrors.label" />
        <AInput v-model="form.bg"    label="Background colour" placeholder="#F4EFE8" :error="formErrors.bg" />
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Add' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingCat"
      title="Delete category?"
      :message="`Delete &quot;${deletingCat?.label}&quot;? Products in this category will lose their category.`"
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
import { ref, onMounted } from 'vue'
import { Plus, Grid3X3 } from 'lucide-vue-next'
import { apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../api/admin'
import type { AdminCategory } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

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

const emptyForm = () => ({ id: '', label: '', bg: '' })
const form = ref(emptyForm())

const cols = [
  { key: 'id',           label: 'ID' },
  { key: 'label',        label: 'Label' },
  { key: 'productCount', label: 'Products' },
]

async function loadCats() {
  loading.value = true
  loadError.value = null
  try {
    categories.value = (await apiGetCategories()).data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load categories.'
  } finally {
    loading.value = false
  }
}

function openCreate() { editing.value = null; form.value = emptyForm(); formErrors.value = {}; modalOpen.value = true }
function openEdit(c: AdminCategory) {
  editing.value = c
  form.value = { id: c.id, label: c.label, bg: c.bg }
  formErrors.value = {}; modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!editing.value && !form.value.id)    { formErrors.value.id    = 'ID is required';    return }
  if (!form.value.label) { formErrors.value.label = 'Label is required'; return }
  if (!form.value.bg)    { formErrors.value.bg    = 'Colour is required'; return }
  saving.value = true
  try {
    editing.value
      ? await apiUpdateCategory(editing.value.id, form.value)
      : await apiCreateCategory(form.value)
    modalOpen.value = false; loadCats()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
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
    deleteError.value = e instanceof Error ? e.message : 'Delete failed.'
    deletingCat.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(loadCats)
</script>

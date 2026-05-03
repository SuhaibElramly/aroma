<!-- aroma-admin/src/views/SpecTypesView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <div class="flex items-center gap-3">
      <div>
        <h1 class="text-sm font-semibold text-dash-text">Spec Types</h1>
        <p class="text-2xs text-dash-muted mt-0.5">Global list of product specification types (Size, Color, Weight…)</p>
      </div>
      <div class="ml-auto">
        <AButton size="sm" @click="openCreate"><Plus :size="14" /> New Spec Type</AButton>
      </div>
    </div>

    <ATable :columns="cols" :rows="specTypes" :loading="loading">
      <template #cell-unit="{ value }">
        <span class="text-dash-muted text-xs">{{ value ?? '—' }}</span>
      </template>
      <template #cell-productCount="{ value }">
        <span class="text-xs">{{ value }} product{{ value !== 1 ? 's' : '' }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as SpecType)">Edit</AButton>
          <AButton
            size="sm"
            variant="danger"
            :disabled="(row as SpecType).productCount > 0"
            :title="(row as SpecType).productCount > 0 ? 'In use — cannot delete' : ''"
            @click.stop="confirmDelete(row as SpecType)"
          >Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="SlidersHorizontal" heading="No spec types yet" sub="Create spec types to use as product variant options" />
      </template>
    </ATable>

    <!-- Create / Edit modal -->
    <AModal :open="modalOpen" :title="editing ? 'Edit Spec Type' : 'New Spec Type'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-model="form.name" label="Name" placeholder="e.g. Size, Color, Weight" :error="formErrors.name" />
        <AInput v-model="form.unit" label="Unit (optional)" placeholder="e.g. ml, g, oz" />
        <p class="text-2xs text-dash-muted">Unit is appended to variant values when displayed (e.g. "30ml").</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Create' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deleting"
      title="Delete spec type?"
      message="This spec type will be permanently removed."
      :loading="deleteLoading"
      @confirm="handleDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, SlidersHorizontal } from 'lucide-vue-next'
import { apiGetSpecTypes, apiCreateSpecType, apiUpdateSpecType, apiDeleteSpecType } from '../api/admin'
import type { SpecType } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const specTypes     = ref<SpecType[]>([])
const loading       = ref(true)
const loadError     = ref<string | null>(null)
const modalOpen     = ref(false)
const editing       = ref<SpecType | null>(null)
const saving        = ref(false)
const deleting      = ref<SpecType | null>(null)
const deleteLoading = ref(false)
const formErrors    = ref<Record<string, string>>({})

const emptyForm = () => ({ name: '', unit: '' })
const form = ref(emptyForm())

const cols = [
  { key: 'name',         label: 'Name' },
  { key: 'unit',         label: 'Unit' },
  { key: 'productCount', label: 'In Use' },
]

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const res = await apiGetSpecTypes()
    specTypes.value = res.data
  } catch (e: unknown) {
    loadError.value = (e as any)?.response?.data?.message ?? 'Failed to load spec types.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(spec: SpecType) {
  editing.value = spec
  form.value = { name: spec.name, unit: spec.unit ?? '' }
  formErrors.value = {}
  modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.name.trim()) {
    formErrors.value.name = 'Name is required'
    return
  }
  saving.value = true
  try {
    const payload = { name: form.value.name.trim(), unit: form.value.unit.trim() || null }
    if (editing.value) {
      const res = await apiUpdateSpecType(editing.value.id, payload)
      specTypes.value = specTypes.value.map(s =>
        s.id === editing.value!.id ? { ...s, name: res.data.name, unit: res.data.unit } : s
      )
    } else {
      const res = await apiCreateSpecType(payload)
      specTypes.value = [...specTypes.value, { ...res.data, productCount: 0 }]
    }
    modalOpen.value = false
  } catch (e: unknown) {
    const msg = (e as any)?.response?.data?.errors?.name?.[0]
      ?? (e as any)?.response?.data?.message
      ?? 'Save failed.'
    formErrors.value.name = msg
  } finally {
    saving.value = false
  }
}

function confirmDelete(spec: SpecType) { deleting.value = spec }

async function handleDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await apiDeleteSpecType(deleting.value.id)
    specTypes.value = specTypes.value.filter(s => s.id !== deleting.value!.id)
    deleting.value = null
  } catch (e: unknown) {
    loadError.value = (e as any)?.response?.data?.message ?? 'Delete failed.'
    deleting.value = null
  } finally {
    deleteLoading.value = false
  }
}

onMounted(load)
</script>

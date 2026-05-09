<!-- aroma-admin/src/views/SpecTypesView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <div class="flex items-center gap-3">
      <div>
        <h1 class="text-sm font-semibold text-dash-text">{{ t('specTypes.title') }}</h1>
        <p class="text-2xs text-dash-muted mt-0.5">{{ t('specTypes.subtitle') }}</p>
      </div>
      <div class="ml-auto">
        <AButton size="sm" @click="openCreate"><Plus :size="14" /> {{ t('specTypes.add') }}</AButton>
      </div>
    </div>

    <ATable :columns="cols" :rows="specTypes" :loading="loading">
      <template #cell-unit="{ value }">
        <span class="text-dash-muted text-xs">{{ value ?? '—' }}</span>
      </template>
      <template #cell-productCount="{ value }">
        <span class="text-xs">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end rtl:justify-start">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as SpecType)">{{ t('common.edit') }}</AButton>
          <AButton
            size="sm"
            variant="danger"
            :disabled="(row as SpecType).productCount > 0"
            :title="(row as SpecType).productCount > 0 ? t('specTypes.inUseTooltip') : ''"
            @click.stop="confirmDelete(row as SpecType)"
          >{{ t('common.delete') }}</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="SlidersHorizontal" :heading="t('specTypes.noData')" :sub="t('specTypes.noDataSub')" />
      </template>
    </ATable>

    <!-- Create / Edit modal -->
    <AModal :open="modalOpen" :title="editing ? t('specTypes.modal.editTitle') : t('specTypes.modal.createTitle')" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-model="form.name" :label="t('specTypes.form.nameLabel')" :placeholder="t('specTypes.form.namePlaceholder')" :error="formErrors.name" />
        <AInput v-model="form.unit" :label="t('specTypes.form.unitLabel')" :placeholder="t('specTypes.form.unitPlaceholder')" />
        <p class="text-2xs text-dash-muted">{{ t('specTypes.form.unitHint') }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">{{ t('common.cancel') }}</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? t('common.save') : t('specTypes.create') }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deleting"
      :title="t('specTypes.confirm.deleteTitle')"
      :message="t('specTypes.confirm.deleteMessage')"
      :loading="deleteLoading"
      @confirm="handleDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, SlidersHorizontal } from 'lucide-vue-next'
import { apiGetSpecTypes, apiCreateSpecType, apiUpdateSpecType, apiDeleteSpecType } from '../api/admin'
import type { SpecType } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const { t } = useI18n()

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

const cols = computed(() => [
  { key: 'name',         label: t('specTypes.columns.name') },
  { key: 'unit',         label: t('specTypes.columns.unit') },
  { key: 'productCount', label: t('specTypes.columns.inUse') },
])

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

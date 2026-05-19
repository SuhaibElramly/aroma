<!-- aroma-admin/src/views/SpecTypesView.vue -->
<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1400px]">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <!-- KPI strip -->
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">Spec types</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ specTypes.length }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">reusable across catalog</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">Total values</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">—</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">across all specs</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">Linked products</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ specTypes.reduce((s, t) => s + (t.productCount ?? 0), 0) }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">products tagged</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">With units</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ specTypes.filter(s => s.unit).length }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">e.g. ml, h</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-dash-paper border border-dash-border rounded-card p-4 flex items-center gap-3 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
      <div class="relative flex-1 min-w-[200px]">
        <svg class="absolute start-3 top-1/2 -translate-y-1/2 text-dash-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input
          v-model="searchQuery"
          placeholder="Search spec types…"
          class="w-full rounded-lg border border-dash-border bg-dash-paper-2 ps-9 pe-3 py-2 text-[13px] outline-none text-dash-text focus:border-dash-primary transition-colors"
        />
      </div>
      <button
        class="h-9 px-3 rounded-lg text-[12px] font-medium text-white inline-flex items-center gap-1.5 whitespace-nowrap bg-dash-text hover:opacity-90 transition-opacity"
        @click="openCreate"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {{ t('specTypes.add') }}
      </button>
    </div>

    <!-- Two-column layout -->
    <div class="flex gap-5 items-start">
      <!-- Left: spec type list -->
      <div class="w-72 shrink-0 bg-dash-paper border border-dash-border rounded-card overflow-hidden shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <div v-if="loading" class="py-10 text-center text-xs text-dash-muted">{{ t('common.loading') }}</div>
        <div v-else class="divide-y divide-dash-border-lt">
          <button
            v-for="(spec, i) in filteredSpecTypes"
            :key="spec.id"
            class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-dash-paper-2"
            :class="{ 'bg-dash-primary-lt': selectedSpec?.id === spec.id }"
            @click="selectSpec(spec)"
          >
            <!-- Number badge -->
            <div class="w-8 h-8 bg-dash-paper-2 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold text-dash-text shrink-0 border border-dash-border-lt">
              {{ String(i + 1).padStart(2, '0') }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[13px] font-medium text-dash-text truncate">{{ spec.name }}</p>
              <p class="text-[10.5px] text-dash-faint mt-0.5">{{ spec.productCount }} products</p>
            </div>
            <!-- Unit chip -->
            <span v-if="spec.unit" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-dash-paper-2 border border-dash-border-lt text-dash-muted shrink-0">
              {{ spec.unit }}
            </span>
          </button>
          <div v-if="filteredSpecTypes.length === 0" class="py-8 text-center text-xs text-dash-muted">
            {{ t('specTypes.noData') }}
          </div>
        </div>
      </div>

      <!-- Right: detail panel -->
      <div class="flex-1 min-w-0">
        <!-- Placeholder when nothing selected -->
        <div v-if="!selectedSpec" class="bg-dash-paper border border-dash-border rounded-card p-12 flex flex-col items-center justify-center text-center shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
          <div class="h-12 w-12 rounded-xl bg-dash-paper-2 border border-dash-border-lt flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-dash-faint"><path d="M4 6h10"/><path d="M4 12h6"/><path d="M4 18h12"/><circle cx="17" cy="6" r="2"/><circle cx="13" cy="12" r="2"/><circle cx="19" cy="18" r="2"/></svg>
          </div>
          <p class="text-[13px] font-medium text-dash-text">Select a spec type to view details</p>
          <p class="text-[12px] text-dash-muted mt-1">Choose from the list on the left</p>
        </div>

        <!-- Detail panel -->
        <div v-else class="bg-dash-paper border border-dash-border rounded-card p-6 space-y-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
          <!-- Header -->
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">Spec type</p>
              <h2 class="font-display text-[22px] leading-tight mt-0.5 text-dash-text">{{ selectedSpec.name }}</h2>
              <p v-if="selectedSpec.unit" class="text-[12px] text-dash-muted mt-0.5">Unit: <span class="font-medium text-dash-text">{{ selectedSpec.unit }}</span></p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white text-dash-text-2 hover:bg-dash-paper-2 transition-colors"
                @click="openEdit(selectedSpec)"
              >{{ t('common.edit') }}</button>
              <button
                class="h-8 px-3 rounded-lg text-[12px] bg-dash-danger-lt border border-dash-danger-lt text-dash-danger hover:opacity-80 transition-opacity"
                :disabled="(selectedSpec.productCount ?? 0) > 0"
                :title="(selectedSpec.productCount ?? 0) > 0 ? t('specTypes.inUseTooltip') : ''"
                @click="confirmDelete(selectedSpec)"
              >{{ t('common.delete') }}</button>
            </div>
          </div>

          <!-- Stats row -->
          <div class="flex gap-4">
            <div class="bg-dash-paper-2 border border-dash-border-lt rounded-card px-4 py-3">
              <p class="text-[10.5px] text-dash-muted">Products</p>
              <p class="font-display text-[20px] text-dash-text leading-none mt-1">{{ selectedSpec.productCount }}</p>
            </div>
          </div>

          <!-- Values section -->
          <div>
            <p class="text-[10.5px] tracking-[.14em] uppercase font-semibold text-dash-faint mb-3">Values</p>
            <div v-if="selectedSpec" class="flex flex-wrap gap-2 mb-4">
              <p v-if="specTypeValues.length === 0" class="text-[12px] text-dash-muted italic">No values yet.</p>
              <span
                v-for="val in specTypeValues"
                :key="val"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-dash-paper-2 border border-dash-border text-dash-text"
              >
                {{ val }}
                <button
                  class="text-dash-faint hover:text-dash-danger transition-colors ml-0.5"
                  @click="removeValue(val)"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </span>
            </div>
            <!-- Add value input -->
            <div class="flex items-center gap-2">
              <input
                v-model="newValueInput"
                :placeholder="t('specTypes.form.unitPlaceholder') || 'Add a new value…'"
                class="flex-1 rounded-lg border border-dash-border bg-dash-paper-2 px-3 py-2 text-[13px] outline-none text-dash-text focus:border-dash-primary transition-colors"
                @keydown.enter.prevent="addValue"
              />
              <button
                class="h-9 px-3 rounded-lg text-[12px] font-medium bg-dash-text text-white hover:opacity-90 transition-opacity"
                @click="addValue"
              >Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>

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
import { apiGetSpecTypes, apiCreateSpecType, apiUpdateSpecType, apiDeleteSpecType } from '../api/admin'
import type { SpecType } from '../types'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
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

// ── Detail panel state ────────────────────────────────────────────────
const selectedSpec   = ref<SpecType | null>(null)
const specTypeValues = ref<string[]>([])
const newValueInput  = ref('')
const searchQuery    = ref('')

// ── Filtered spec types ───────────────────────────────────────────────
const filteredSpecTypes = computed(() => {
  if (!searchQuery.value) return specTypes.value
  const q = searchQuery.value.toLowerCase()
  return specTypes.value.filter(s => s.name.toLowerCase().includes(q))
})

function selectSpec(spec: SpecType) {
  selectedSpec.value = spec
  // In a real app you'd load values from API; for now show empty list
  specTypeValues.value = []
  newValueInput.value = ''
}

function removeValue(val: string) {
  specTypeValues.value = specTypeValues.value.filter(v => v !== val)
}

function addValue() {
  const v = newValueInput.value.trim()
  if (!v || specTypeValues.value.includes(v)) return
  specTypeValues.value.push(v)
  newValueInput.value = ''
}

const emptyForm = () => ({ name: '', unit: '' })
const form = ref(emptyForm())

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const res = await apiGetSpecTypes()
    specTypes.value = res.data
    // If selected spec was updated, refresh it
    if (selectedSpec.value) {
      const updated = res.data.find(s => s.id === selectedSpec.value!.id)
      if (updated) selectedSpec.value = updated
    }
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
      if (selectedSpec.value?.id === editing.value.id) {
        selectedSpec.value = { ...selectedSpec.value, name: res.data.name, unit: res.data.unit }
      }
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
    if (selectedSpec.value?.id === deleting.value.id) {
      selectedSpec.value = null
      specTypeValues.value = []
    }
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

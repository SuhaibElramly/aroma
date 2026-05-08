<!-- aroma-admin/src/views/CouponsView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <div class="flex items-center gap-3">
      <AInput v-model="search" :placeholder="t('coupons.searchPlaceholder')" class="w-56" @input="debouncedLoad" />
      <div class="ml-auto">
        <AButton size="sm" @click="openCreate"><Plus :size="14" /> {{ t('coupons.add') }}</AButton>
      </div>
    </div>

    <ATable :columns="cols" :rows="coupons" :loading="loading">
      <template #cell-code="{ value }">
        <span class="font-mono text-xs font-semibold tracking-wider">{{ value }}</span>
      </template>
      <template #cell-type="{ row }">
        <span class="text-xs">
          {{ (row as AdminCoupon).type === 'percentage' ? t('coupons.typePercentage') : t('coupons.typeFixed') }}
        </span>
      </template>
      <template #cell-value="{ row }">
        <span class="text-xs">
          {{ (row as AdminCoupon).type === 'percentage'
            ? `${(row as AdminCoupon).value}%`
            : `${(row as AdminCoupon).value} LYD` }}
        </span>
      </template>
      <template #cell-minOrderAmount="{ value }">
        <span class="text-xs text-dash-muted">{{ value ? `${value} LYD` : '—' }}</span>
      </template>
      <template #cell-uses="{ row }">
        <span class="text-xs">
          {{ (row as AdminCoupon).usesCount }} / {{ (row as AdminCoupon).maxUses ?? '∞' }}
        </span>
      </template>
      <template #cell-expiresAt="{ value }">
        <span class="text-xs text-dash-muted">{{ value ? value.slice(0, 10) : t('coupons.never') }}</span>
      </template>
      <template #cell-isActive="{ value }">
        <span
          :class="value
            ? 'bg-dash-success-lt text-dash-success border-dash-success/20'
            : 'bg-dash-danger-lt text-dash-danger border-dash-danger/20'"
          class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
        >{{ value ? t('coupons.statusActive') : t('coupons.statusInactive') }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminCoupon)">{{ t('common.edit') }}</AButton>
          <AButton size="sm" variant="ghost" @click.stop="handleToggle(row as AdminCoupon)">
            {{ (row as AdminCoupon).isActive ? t('coupons.disable') : t('coupons.enable') }}
          </AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminCoupon)">{{ t('common.delete') }}</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Ticket" :heading="t('coupons.noData')" />
      </template>
    </ATable>

    <!-- Create / Edit Modal -->
    <AModal :open="modalOpen" :title="editing ? t('coupons.editTitle') : t('coupons.createTitle')" @close="closeModal">
      <form class="space-y-3" @submit.prevent>
        <AInput
          v-model="form.code"
          :label="t('coupons.form.codeLabel')"
          placeholder="e.g. SAVE20"
          :error="formErrors.code"
          @input="form.code = form.code.toUpperCase()"
        />
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-1">{{ t('coupons.form.typeLabel') }}</label>
            <select
              v-model="form.type"
              class="w-full rounded-btn border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus:outline-none focus:ring-1 focus:ring-dash-primary"
            >
              <option value="percentage">{{ t('coupons.form.typePercentage') }}</option>
              <option value="fixed">{{ t('coupons.form.typeFixed') }}</option>
            </select>
          </div>
          <AInput
            v-model.number="form.value"
            :label="form.type === 'percentage' ? t('coupons.form.valuePercentage') : t('coupons.form.valueFixed')"
            type="number"
            :placeholder="form.type === 'percentage' ? '20' : '5.00'"
            :error="formErrors.value"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AInput
            v-model.number="form.min_order_amount"
            :label="t('coupons.form.minOrderLabel')"
            type="number"
            :placeholder="t('coupons.form.optional')"
          />
          <AInput
            v-model.number="form.max_uses"
            :label="t('coupons.form.maxUsesLabel')"
            type="number"
            :placeholder="t('coupons.form.optionalUnlimited')"
          />
        </div>
        <AInput
          v-model="form.expires_at"
          :label="t('coupons.form.expiresLabel')"
          type="date"
          :placeholder="t('coupons.form.optional')"
        />
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="form.is_active" type="checkbox" class="rounded" />
          <span class="text-sm text-dash-text">{{ t('coupons.form.activeLabel') }}</span>
        </label>
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="closeModal">{{ t('common.cancel') }}</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? t('common.save') : t('coupons.create') }}</AButton>
      </template>
    </AModal>

    <!-- Delete confirm -->
    <AConfirmDialog
      :open="!!deletingCoupon"
      :title="t('coupons.deleteTitle')"
      :message="t('coupons.deleteMessage', { code: deletingCoupon?.code ?? '' })"
      :confirm-label="t('common.delete')"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingCoupon = null"
    />
    <div v-if="deleteError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ deleteError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Ticket } from 'lucide-vue-next'
import {
  apiGetCoupons, apiCreateCoupon, apiUpdateCoupon,
  apiDeleteCoupon, apiToggleCoupon,
} from '../api/admin'
import type { AdminCoupon } from '../types'
import ATable from '../components/ui/ATable.vue'
import AButton from '../components/ui/AButton.vue'
import AInput from '../components/ui/AInput.vue'
import AModal from '../components/ui/AModal.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const { t } = useI18n()

const cols = computed(() => [
  { key: 'code',           label: t('coupons.columns.code') },
  { key: 'type',           label: t('coupons.columns.type') },
  { key: 'value',          label: t('coupons.columns.value') },
  { key: 'minOrderAmount', label: t('coupons.columns.minOrder') },
  { key: 'uses',           label: t('coupons.columns.uses') },
  { key: 'expiresAt',      label: t('coupons.columns.expiry') },
  { key: 'isActive',       label: t('coupons.columns.status') },
])

const coupons      = ref<AdminCoupon[]>([])
const loading      = ref(false)
const loadError    = ref('')
const search       = ref('')

const modalOpen    = ref(false)
const editing      = ref<AdminCoupon | null>(null)
const saving       = ref(false)
const formErrors   = ref<Record<string, string>>({})

const deletingCoupon = ref<AdminCoupon | null>(null)
const deleting       = ref(false)
const deleteError    = ref('')

const emptyForm = () => ({
  code:             '',
  type:             'percentage' as 'percentage' | 'fixed',
  value:            0,
  min_order_amount: null as number | null,
  max_uses:         null as number | null,
  expires_at:       '',
  is_active:        true,
})

const form = ref(emptyForm())

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
}

async function load() {
  loading.value  = true
  loadError.value = ''
  try {
    const res   = await apiGetCoupons({ search: search.value || undefined })
    coupons.value = res.data
  } catch {
    loadError.value = 'Failed to load coupons.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value   = null
  form.value      = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(coupon: AdminCoupon) {
  editing.value   = coupon
  form.value = {
    code:             coupon.code,
    type:             coupon.type,
    value:            coupon.value,
    min_order_amount: coupon.minOrderAmount,
    max_uses:         coupon.maxUses,
    expires_at:       coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    is_active:        coupon.isActive,
  }
  formErrors.value = {}
  modalOpen.value  = true
}

function closeModal() {
  modalOpen.value = false
}

async function handleSave() {
  formErrors.value = {}
  saving.value     = true
  try {
    const payload = {
      ...form.value,
      min_order_amount: form.value.min_order_amount || null,
      max_uses:         form.value.max_uses || null,
      expires_at:       form.value.expires_at || null,
    }
    if (editing.value) {
      await apiUpdateCoupon(editing.value.id, payload)
    } else {
      await apiCreateCoupon(payload)
    }
    closeModal()
    await load()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? {}
    formErrors.value = {
      code:    errors.code?.[0]    ?? '',
      value:   errors.value?.[0]   ?? '',
      general: errors.general?.[0] ?? (Object.keys(errors).length ? 'Please check the fields above.' : 'Something went wrong.'),
    }
  } finally {
    saving.value = false
  }
}

async function handleToggle(coupon: AdminCoupon) {
  try {
    const res = await apiToggleCoupon(coupon.id)
    const idx = coupons.value.findIndex(c => c.id === coupon.id)
    if (idx !== -1) coupons.value[idx] = res.data
  } catch {
    loadError.value = 'Failed to toggle coupon.'
  }
}

function confirmDelete(coupon: AdminCoupon) {
  deletingCoupon.value = coupon
  deleteError.value    = ''
}

async function handleDelete() {
  if (! deletingCoupon.value) return
  deleting.value = true
  try {
    await apiDeleteCoupon(deletingCoupon.value.id)
    deletingCoupon.value = null
    await load()
  } catch (err: any) {
    deleteError.value = err?.response?.data?.message ?? 'Failed to delete coupon.'
    deletingCoupon.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(load)
onUnmounted(() => clearTimeout(debounceTimer))
</script>

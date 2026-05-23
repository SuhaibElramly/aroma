<!-- aroma-admin/src/views/CouponsView.vue -->
<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1280px]">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <!-- KPI strip -->
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('coupons.kpiActiveCodes') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ coupons.filter(c => c.isActive).length }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('coupons.kpiRunningNow') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('coupons.kpiRedemptions') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ coupons.reduce((s, c) => s + (c.usesCount ?? 0), 0) }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('coupons.kpiTotalUses') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('coupons.kpiDiscountsGiven') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">—</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('coupons.kpiLydGiven') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('coupons.kpiExpiringSoon') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ expiringCount }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('coupons.kpiInNext30Days') }}</p>
      </div>
    </div>

    <!-- Toolbar: tabs + add button -->
    <div class="bg-dash-paper border border-dash-border rounded-card p-4 flex items-center gap-3 flex-wrap shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
      <!-- Status filter tabs -->
      <div class="flex items-center gap-1 p-1 rounded-lg border border-dash-border-lt bg-dash-paper-2 overflow-x-auto">
        <button
          v-for="[key, label] in statusTabs"
          :key="key"
          class="px-2.5 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-all"
          :style="{
            background: statusFilter === key ? 'white' : 'transparent',
            color: statusFilter === key ? 'var(--dash-text)' : 'var(--dash-muted)',
            boxShadow: statusFilter === key ? '0 1px 2px rgba(0,0,0,.05)' : 'none'
          }"
          @click="statusFilter = key"
        >{{ label }}</button>
      </div>
      <!-- Search -->
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dash-border-lt flex-1 min-w-[160px] bg-dash-paper-2">
        <svg class="text-dash-faint shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input
          v-model="search"
          :placeholder="t('coupons.searchPlaceholder')"
          class="bg-transparent text-[12.5px] outline-none flex-1 text-dash-text-2"
          @input="debouncedLoad"
        />
      </div>
      <button
        class="h-9 px-3 rounded-lg text-[12px] font-medium text-white inline-flex items-center gap-1.5 whitespace-nowrap bg-dash-text hover:opacity-90 transition-opacity"
        @click="openCreate"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {{ t('coupons.add') }}
      </button>
    </div>

    <!-- Coupon cards grid -->
    <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="(coupon, i) in filteredCoupons"
        :key="coupon.id"
        class="bg-dash-paper border border-dash-border rounded-card overflow-hidden flex"
      >
        <!-- Left: discount stub -->
        <div
          class="w-24 shrink-0 flex flex-col items-center justify-center text-white p-3"
          :style="{ background: `oklch(52% 0.07 ${couponHue(i)})` }"
        >
          <p class="text-[22px] font-display font-semibold leading-none">{{ coupon.type === 'percentage' ? coupon.value : coupon.value }}</p>
          <p class="text-[11px] mt-0.5 font-medium">{{ coupon.type === 'percentage' ? '%' : 'LYD' }}</p>
          <p class="text-[9px] uppercase tracking-wider mt-1 opacity-80">OFF</p>
        </div>
        <!-- Perforated divider -->
        <div class="w-px border-l-2 border-dashed border-dash-border self-stretch" />
        <!-- Right: coupon details -->
        <div class="flex-1 p-4 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-display text-[15px] text-dash-text font-medium tracking-wider">{{ coupon.code }}</p>
              <p class="text-[11px] text-dash-muted mt-0.5">
                {{ coupon.type === 'percentage' ? t('coupons.percentOff', { value: coupon.value }) : t('coupons.lydOff', { value: coupon.value }) }}
                <span v-if="coupon.minOrderAmount"> · {{ t('coupons.minOrderAmount', { amount: coupon.minOrderAmount }) }}</span>
              </p>
            </div>
            <!-- Status chip -->
            <span
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap"
              :class="statusChipClass(coupon.isActive)"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="statusDotClass(coupon.isActive)" />
              {{ coupon.isActive ? t('coupons.statusActive') : t('coupons.statusInactive') }}
            </span>
          </div>
          <!-- Redemption bar -->
          <div class="mt-3">
            <div class="flex items-center justify-between text-[10.5px] text-dash-faint mb-1">
              <span>{{ coupon.usesCount ?? 0 }} {{ t('coupons.redeemed') }}</span>
              <span v-if="coupon.expiresAt">{{ t('coupons.expires') }} {{ coupon.expiresAt.slice(0, 10) }}</span>
              <span v-else>{{ t('coupons.noExpiry') }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-dash-bg overflow-hidden">
              <div
                class="h-full rounded-full bg-dash-primary transition-all"
                :style="{ width: redemptionPct(coupon) + '%' }"
              />
            </div>
          </div>
          <!-- Footer actions -->
          <div class="mt-3 pt-3 border-t border-dash-border-lt flex items-center justify-end gap-1">
            <button
              class="h-7 px-2 rounded-md text-[11px] font-medium border border-dash-border bg-white text-dash-text-2"
              @click.stop="openEdit(coupon)"
            >{{ t('common.edit') }}</button>
            <button
              class="h-7 px-2 rounded-md text-[11px] font-medium border border-dash-border bg-white text-dash-text-2"
              @click.stop="openOrders(coupon)"
            >{{ t('coupons.ordersBtn') }}</button>
            <button
              class="h-7 px-2 rounded-md text-[11px] font-medium border border-dash-border bg-white text-dash-text-2"
              @click.stop="handleToggle(coupon)"
            >{{ coupon.isActive ? t('coupons.disable') : t('coupons.enable') }}</button>
            <button
              class="h-7 px-2 rounded-md text-[11px] font-medium text-dash-danger border border-dash-danger-lt"
              @click.stop="confirmDelete(coupon)"
            >{{ t('common.delete') }}</button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredCoupons.length === 0" class="col-span-full py-12 text-center text-sm text-dash-muted">
        {{ t('coupons.noData') }}
      </div>
    </div>

    <!-- Loading -->
    <div v-else class="py-12 text-center text-sm text-dash-muted">{{ t('common.loading') }}</div>

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

    <!-- Coupon Orders Modal -->
    <AModal
      :open="!!ordersForCoupon"
      :title="ordersForCoupon ? t('coupons.ordersModalTitle', { code: ordersForCoupon.code }) : ''"
      @close="ordersForCoupon = null"
    >
      <div v-if="ordersLoading" class="py-6 text-center text-xs text-dash-muted">{{ t('common.loading') }}</div>
      <div v-else-if="couponOrders.length === 0" class="py-6 text-center text-xs text-dash-muted">
        {{ t('coupons.noOrdersUsedCoupon') }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="o in couponOrders"
          :key="o.id"
          class="flex items-center justify-between rounded-lg border border-dash-border px-4 py-3 hover:bg-dash-bg transition-colors cursor-pointer"
          @click="router.push(`/orders/${o.id}`)"
        >
          <div>
            <p class="text-xs font-semibold text-dash-text font-mono">{{ o.id }}</p>
            <p class="text-2xs text-dash-muted mt-0.5">{{ o.user }} · {{ o.date }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-semibold text-dash-text">{{ o.total.toFixed(2) }} LYD</p>
            <p v-if="o.discountAmount" class="text-2xs text-dash-success mt-0.5">−{{ o.discountAmount.toFixed(2) }} LYD</p>
          </div>
        </div>
      </div>
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
import { useRouter } from 'vue-router'
import {
  apiGetCoupons, apiCreateCoupon, apiUpdateCoupon,
  apiDeleteCoupon, apiToggleCoupon, apiGetCouponOrders,
} from '../api/admin'
import type { AdminCoupon, CouponOrder } from '../types'
import AButton from '../components/ui/AButton.vue'
import AInput from '../components/ui/AInput.vue'
import AModal from '../components/ui/AModal.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const { t } = useI18n()
const router = useRouter()

// ── Filter state ──────────────────────────────────────────────────────
const statusFilter = ref<string>('all')
const search       = ref('')

const statusTabs = computed<[string, string][]>(() => [
  ['all',      t('coupons.filterAll')],
  ['active',   t('coupons.filterActive')],
  ['inactive', t('coupons.filterInactive')],
])

// ── Design helpers ────────────────────────────────────────────────────
const HUE_PALETTE = [32, 200, 140, 96]

function couponHue(index: number): number {
  return HUE_PALETTE[index % HUE_PALETTE.length]
}

function statusChipClass(isActive: boolean): string {
  return isActive
    ? 'bg-dash-success-lt text-dash-success-dk'
    : 'bg-dash-danger-lt text-dash-danger'
}

function statusDotClass(isActive: boolean): string {
  return isActive ? 'bg-dash-success' : 'bg-dash-danger'
}

function redemptionPct(coupon: AdminCoupon): number {
  if (!coupon.maxUses) return 0
  return Math.min(Math.round((coupon.usesCount / coupon.maxUses) * 100), 100)
}

// ── KPI helpers ───────────────────────────────────────────────────────
const expiringCount = computed(() => {
  const now = Date.now()
  const in30 = now + 30 * 24 * 60 * 60 * 1000
  return coupons.value.filter(c => {
    if (!c.expiresAt || !c.isActive) return false
    const exp = new Date(c.expiresAt).getTime()
    return exp > now && exp < in30
  }).length
})

// ── Filtered coupons ──────────────────────────────────────────────────
const filteredCoupons = computed(() => {
  let list = coupons.value
  if (statusFilter.value === 'active') list = list.filter(c => c.isActive)
  else if (statusFilter.value === 'inactive') list = list.filter(c => !c.isActive)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(c => c.code.toLowerCase().includes(q))
  }
  return list
})

// ── Data state ────────────────────────────────────────────────────────
const coupons      = ref<AdminCoupon[]>([])
const loading      = ref(false)
const loadError    = ref('')

const modalOpen    = ref(false)
const editing      = ref<AdminCoupon | null>(null)
const saving       = ref(false)
const formErrors   = ref<Record<string, string>>({})

const deletingCoupon = ref<AdminCoupon | null>(null)
const deleting       = ref(false)
const deleteError    = ref('')

// ── Orders modal ───────────────────────────────────────────────────────
const ordersForCoupon = ref<AdminCoupon | null>(null)
const couponOrders    = ref<CouponOrder[]>([])
const ordersLoading   = ref(false)

async function openOrders(coupon: AdminCoupon) {
  ordersForCoupon.value = coupon
  couponOrders.value    = []
  ordersLoading.value   = true
  try {
    const res = await apiGetCouponOrders(coupon.id)
    couponOrders.value = res.data
  } finally {
    ordersLoading.value = false
  }
}

// ── Form ───────────────────────────────────────────────────────────────
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
    loadError.value = t('coupons.loadFailed')
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
    loadError.value = t('coupons.toggleFailed')
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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ProductVariant, ProductDiscount } from '../types'

const props  = defineProps<{ id: string }>()
const router = useRouter()

// ── State ──────────────────────────────────────────────────────────────────
const product   = ref<any>(null)
const variants  = ref<ProductVariant[]>([])
const discounts = ref<ProductDiscount[]>([])
const loading   = ref(true)
const error     = ref('')

// New discount form
const showDiscountForm = ref(false)
const form = ref({
  name: '', type: 'percentage' as 'percentage' | 'fixed',
  value: 0, scope: 'all' as 'all' | 'specific',
  variantIds: [] as number[], startsAt: '', endsAt: '',
})

// ── API helpers ────────────────────────────────────────────────────────────
const BASE    = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const token   = () => localStorage.getItem('auth_token') ?? ''
const headers = () => ({
  'Authorization': `Bearer ${token()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
})

async function load() {
  try {
    loading.value = true
    const [pRes, vRes, dRes] = await Promise.all([
      fetch(`${BASE}/admin/products/${props.id}`, { headers: headers() }),
      fetch(`${BASE}/admin/products/${props.id}/variants`, { headers: headers() }),
      fetch(`${BASE}/admin/products/${props.id}/discounts`, { headers: headers() }),
    ])
    product.value   = await pRes.json()
    variants.value  = await vRes.json()
    discounts.value = await dRes.json()
  } catch {
    error.value = 'Failed to load product'
  } finally {
    loading.value = false
  }
}

async function addDiscount() {
  const body: any = {
    name:        form.value.name,
    type:        form.value.type,
    value:       form.value.value,
    scope:       form.value.scope,
    variant_ids: form.value.scope === 'specific' ? form.value.variantIds : null,
    starts_at:   form.value.startsAt || null,
    ends_at:     form.value.endsAt || null,
  }
  const res = await fetch(`${BASE}/admin/products/${props.id}/discounts`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  })
  if (res.ok) {
    discounts.value.unshift(await res.json())
    showDiscountForm.value = false
    form.value = { name: '', type: 'percentage', value: 0, scope: 'all', variantIds: [], startsAt: '', endsAt: '' }
  }
}

async function toggleDiscount(d: ProductDiscount) {
  const res = await fetch(`${BASE}/admin/products/${props.id}/discounts/${d.id}/toggle`, {
    method: 'PATCH', headers: headers(),
  })
  if (res.ok) { const updated = await res.json(); Object.assign(d, updated) }
}

async function deleteDiscount(d: ProductDiscount) {
  if (!confirm('Delete this discount?')) return
  const res = await fetch(`${BASE}/admin/products/${props.id}/discounts/${d.id}`, {
    method: 'DELETE', headers: headers(),
  })
  if (res.ok) discounts.value = discounts.value.filter(x => x.id !== d.id)
}

// Best active discount for a variant (client-side preview)
function bestDiscount(variantId: number, price: number): { discountedPrice: number; discount: ProductDiscount | null } {
  const now = new Date()
  const applicable = discounts.value.filter(d => {
    if (!d.is_active) return false
    if (d.starts_at && new Date(d.starts_at) > now) return false
    if (d.ends_at && new Date(d.ends_at) < now) return false
    if (d.scope === 'specific' && !d.variant_ids?.includes(variantId)) return false
    return true
  })
  if (!applicable.length) return { discountedPrice: price, discount: null }
  const best = applicable.reduce((a, b) => {
    const aDisc = a.type === 'percentage' ? price * Number(a.value) / 100 : Number(a.value)
    const bDisc = b.type === 'percentage' ? price * Number(b.value) / 100 : Number(b.value)
    return bDisc > aDisc ? b : a
  })
  const discountedPrice = best.type === 'percentage'
    ? Math.max(0, price * (1 - Number(best.value) / 100))
    : Math.max(0, price - Number(best.value))
  return { discountedPrice, discount: best }
}

const activeDiscounts  = computed(() => discounts.value.filter(d => d.is_active))
const expiredDiscounts = computed(() => discounts.value.filter(d => !d.is_active))

onMounted(load)
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center h-64 text-dash-muted text-sm">Loading…</div>
  <div v-else-if="error" class="text-dash-danger text-sm">{{ error }}</div>

  <div v-else class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <button @click="router.back()" class="text-xs text-dash-muted hover:text-dash-text flex items-center gap-1">
        ← Back
      </button>
      <button
        @click="router.push(`/products/${id}/edit`)"
        class="h-8 px-4 bg-dash-text text-white text-xs font-medium rounded-btn hover:opacity-90 transition-opacity"
      >
        Edit product
      </button>
    </div>

    <!-- Hero card -->
    <div class="bg-dash-paper rounded-card border border-dash-border p-5">
      <div class="flex items-start gap-4">
        <div class="w-20 h-20 rounded-card bg-dash-bg flex items-center justify-center text-3xl shrink-0">🧴</div>
        <div class="flex-1 min-w-0">
          <p class="font-display font-semibold text-dash-text text-lg leading-tight">
            {{ product.name_en ?? product.name ?? product.slug }}
          </p>
          <p class="text-xs text-dash-muted mt-0.5">{{ product.slug }}</p>
          <div class="flex gap-2 mt-2 flex-wrap">
            <span
              class="px-2 py-0.5 rounded-tag text-2xs font-medium"
              :class="product.is_active ? 'bg-dash-success-lt text-dash-success-dk' : 'bg-dash-fig-lt text-dash-fig'"
            >
              {{ product.is_active ? 'Live' : 'Draft' }}
            </span>
            <span v-if="product.type" class="px-2 py-0.5 rounded-tag text-2xs bg-dash-primary-lt text-dash-primary-dk">
              {{ product.type }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Variants table -->
    <div class="bg-dash-paper rounded-card border border-dash-border overflow-hidden">
      <div class="px-5 py-4 border-b border-dash-border">
        <p class="text-sm font-medium text-dash-text">Variants</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-dash-bg">
            <tr>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Variant</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Cost</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Price</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Discounted</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Margin</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Stock</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dash-border">
            <tr v-for="v in variants" :key="v.id" class="hover:bg-dash-bg/50 transition-colors">
              <td class="py-3 px-4">
                <span class="text-dash-text">
                  {{ v.specs.map(s => `${s.value}${s.unit ?? ''}`).join(' / ') || 'Default' }}
                </span>
                <span v-if="v.isDefault" class="ms-2 px-1.5 py-0.5 rounded text-2xs bg-dash-primary-lt text-dash-primary-dk">
                  Default
                </span>
              </td>
              <td class="py-3 px-4 text-dash-muted">
                {{ v.costPrice != null ? Number(v.costPrice).toFixed(2) + ' LYD' : '—' }}
              </td>
              <td class="py-3 px-4 font-medium text-dash-text">{{ Number(v.price).toFixed(2) }} LYD</td>
              <td class="py-3 px-4">
                <template v-if="bestDiscount(v.id, Number(v.price)).discount">
                  <span class="font-medium text-dash-success">
                    {{ bestDiscount(v.id, Number(v.price)).discountedPrice.toFixed(2) }} LYD
                  </span>
                  <span class="ms-1 line-through text-dash-muted">{{ Number(v.price).toFixed(2) }}</span>
                </template>
                <span v-else class="text-dash-muted">—</span>
              </td>
              <td class="py-3 px-4">
                <template v-if="v.costPrice != null && Number(v.price) > 0">
                  <span
                    :class="(Number(v.price) - Number(v.costPrice)) >= 0 ? 'text-dash-success' : 'text-dash-danger'"
                    class="font-medium"
                  >
                    {{ Math.round(((Number(v.price) - Number(v.costPrice)) / Number(v.price)) * 100) }}%
                  </span>
                </template>
                <span v-else class="text-dash-faint">—</span>
              </td>
              <td class="py-3 px-4">
                <span
                  class="px-2 py-0.5 rounded-tag text-2xs font-medium"
                  :class="{
                    'bg-dash-success-lt text-dash-success-dk': v.stock === 'in_stock',
                    'bg-dash-fig-lt text-dash-fig':            v.stock === 'low_stock',
                    'bg-dash-danger-lt text-dash-danger':      v.stock === 'out_of_stock',
                  }"
                >
                  {{ v.quantity }} · {{ v.stock === 'in_stock' ? 'In stock' : v.stock === 'low_stock' ? 'Low' : 'Out' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!variants.length" class="text-xs text-dash-muted text-center py-6">No variants.</p>
      </div>
    </div>

    <!-- Discounts -->
    <div class="bg-dash-paper rounded-card border border-dash-border p-5">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm font-medium text-dash-text">Discounts</p>
        <button
          @click="showDiscountForm = !showDiscountForm"
          class="h-7 px-3 bg-dash-text text-white text-xs rounded-btn hover:opacity-90 transition-opacity"
        >
          + Add discount
        </button>
      </div>

      <!-- Discount form -->
      <form v-if="showDiscountForm" @submit.prevent="addDiscount" class="mb-5 p-4 rounded-card bg-dash-bg border border-dash-border space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Name</label>
            <input v-model="form.name" required placeholder="Summer sale"
              class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary" />
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Type</label>
            <select v-model="form.type"
              class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (LYD)</option>
            </select>
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Value</label>
            <input v-model.number="form.value" type="number" min="0" required
              class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary" />
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Scope</label>
            <select v-model="form.scope"
              class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary">
              <option value="all">All variants</option>
              <option value="specific">Specific variants</option>
            </select>
          </div>
          <div v-if="form.scope === 'specific'" class="col-span-2">
            <label class="text-2xs text-dash-muted mb-1 block">Variants</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="v in variants" :key="v.id" class="flex items-center gap-1.5 text-xs text-dash-text cursor-pointer">
                <input type="checkbox" :value="v.id" v-model="form.variantIds" class="accent-dash-primary" />
                {{ v.specs.map(s => `${s.value}${s.unit ?? ''}`).join(' / ') || 'Default' }}
              </label>
            </div>
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Starts at</label>
            <input v-model="form.startsAt" type="datetime-local"
              class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary" />
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Ends at</label>
            <input v-model="form.endsAt" type="datetime-local"
              class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary" />
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button type="button" @click="showDiscountForm = false"
            class="h-8 px-4 border border-dash-border rounded-btn text-xs text-dash-text hover:bg-dash-bg transition-colors">
            Cancel
          </button>
          <button type="submit"
            class="h-8 px-4 bg-dash-text text-white rounded-btn text-xs hover:opacity-90 transition-opacity">
            Save discount
          </button>
        </div>
      </form>

      <!-- Active discounts -->
      <div v-if="activeDiscounts.length">
        <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest mb-2">Active</p>
        <ul class="space-y-2 mb-4">
          <li v-for="d in activeDiscounts" :key="d.id"
            class="flex items-center gap-3 p-3 rounded-card bg-dash-success-lt border border-dash-border">
            <span class="flex-1 text-xs text-dash-text font-medium">{{ d.name }}</span>
            <span class="text-xs text-dash-muted">{{ d.type === 'percentage' ? d.value + '%' : d.value + ' LYD' }}</span>
            <span class="text-xs text-dash-muted">{{ d.scope === 'all' ? 'All variants' : 'Specific' }}</span>
            <button @click="toggleDiscount(d)"
              class="text-2xs text-dash-muted hover:text-dash-fig px-2 py-1 rounded border border-dash-border">
              Pause
            </button>
            <button @click="deleteDiscount(d)" class="text-2xs text-dash-danger hover:underline">Delete</button>
          </li>
        </ul>
      </div>

      <!-- Paused/expired discounts -->
      <div v-if="expiredDiscounts.length">
        <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest mb-2">Paused / Expired</p>
        <ul class="space-y-2">
          <li v-for="d in expiredDiscounts" :key="d.id"
            class="flex items-center gap-3 p-3 rounded-card bg-dash-bg border border-dash-border opacity-70">
            <span class="flex-1 text-xs text-dash-text">{{ d.name }}</span>
            <span class="text-xs text-dash-muted">{{ d.type === 'percentage' ? d.value + '%' : d.value + ' LYD' }}</span>
            <button @click="toggleDiscount(d)"
              class="text-2xs text-dash-primary hover:underline px-2 py-1 rounded border border-dash-border">
              Reactivate
            </button>
            <button @click="deleteDiscount(d)" class="text-2xs text-dash-danger hover:underline">Delete</button>
          </li>
        </ul>
      </div>

      <p v-if="!discounts.length && !showDiscountForm" class="text-xs text-dash-muted text-center py-6">
        No discounts yet.
      </p>
    </div>
  </div>
</template>

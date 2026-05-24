<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ProductVariant, ProductDiscount } from '../types'
import AModal from '../components/ui/AModal.vue'
import { useI18n } from 'vue-i18n'

const props  = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()

// ── State ──────────────────────────────────────────────────────────────────
const product   = ref<any>(null)
const variants  = ref<ProductVariant[]>([])
const discounts = ref<ProductDiscount[]>([])
const loading   = ref(true)
const error     = ref('')
const images    = ref<{ id: number; url: string; isThumbnail: boolean; sortOrder: number }[]>([])
const uploadingImages  = ref(false)
const deletingImageId  = ref<number | null>(null)
const settingThumbId   = ref<number | null>(null)

// Product edit
const editingProduct  = ref(false)
const savingProduct   = ref(false)
const productForm     = ref({ name: '', name_en: '', type: '', description: '', brand_id: '', category_id: '', is_new: false, is_bestseller: false, is_offer: false, placeholder_bg: '#F2E8E5' })
const brands          = ref<{ id: string; name: string }[]>([])
const categories      = ref<{ id: number; label: string }[]>([])

// Variant edit
const editingVariantId = ref<number | null>(null)
const savingVariant    = ref(false)
const variantDraft     = ref({ price: '', costPrice: '', originalPrice: '', quantity: 0 })

// New discount form
const showDiscountForm = ref(false)
const form = ref({
  name: '', type: '%' as '%' | 'LYD',
  value: '' as string | number, scope: 'all' as 'all' | 'specific',
  variantIds: [] as number[], startsAt: '', endsAt: '',
})

// ── API helpers ────────────────────────────────────────────────────────────
const BASE    = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const token   = () => localStorage.getItem('admin_token') ?? ''
const headers = () => ({
  'Authorization': `Bearer ${token()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
})

async function load() {
  try {
    loading.value = true
    const [pRes, vRes, dRes, bRes, cRes] = await Promise.all([
      fetch(`${BASE}/admin/products/${props.id}`, { headers: headers() }),
      fetch(`${BASE}/admin/products/${props.id}/variants`, { headers: headers() }),
      fetch(`${BASE}/admin/products/${props.id}/discounts`, { headers: headers() }),
      fetch(`${BASE}/admin/brands`, { headers: headers() }),
      fetch(`${BASE}/admin/categories`, { headers: headers() }),
    ])
    product.value   = await pRes.json()
    images.value    = product.value.images ?? []
    variants.value  = await vRes.json()
    discounts.value = await dRes.json()
    brands.value    = (await bRes.json()) ?? []
    categories.value = (await cRes.json()) ?? []
  } catch {
    error.value = t('productDetail.loadFailed')
  } finally {
    loading.value = false
  }
}

async function uploadImages(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  uploadingImages.value = true
  try {
    const formData = new FormData()
    Array.from(input.files).forEach(f => formData.append('images[]', f))
    const res = await fetch(`${BASE}/admin/products/${props.id}/images`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}`, 'Accept': 'application/json' },
      body: formData,
    })
    if (res.ok) {
      const newImgs = await res.json()
      images.value.push(...newImgs)
    }
  } finally {
    uploadingImages.value = false
    input.value = ''
  }
}

async function setThumbnail(imageId: number) {
  settingThumbId.value = imageId
  try {
    const res = await fetch(`${BASE}/admin/products/${props.id}/images/${imageId}/thumbnail`, {
      method: 'PATCH',
      headers: headers(),
    })
    if (res.ok) {
      images.value.forEach(img => { img.isThumbnail = img.id === imageId })
    }
  } finally {
    settingThumbId.value = null
  }
}

async function deleteImage(imageId: number) {
  if (!confirm(t('productDetail.deleteImageConfirm'))) return
  deletingImageId.value = imageId
  try {
    const res = await fetch(`${BASE}/admin/products/${props.id}/images/${imageId}`, {
      method: 'DELETE',
      headers: headers(),
    })
    if (res.ok) {
      const wasThumbnail = images.value.find(img => img.id === imageId)?.isThumbnail
      images.value = images.value.filter(img => img.id !== imageId)
      if (wasThumbnail && images.value.length > 0) {
        const next = [...images.value].sort((a, b) => a.sortOrder - b.sortOrder)[0]
        next.isThumbnail = true
      }
    }
  } finally {
    deletingImageId.value = null
  }
}

function openProductEdit() {
  productForm.value = {
    name:         product.value.name ?? '',
    name_en:      product.value.name_en ?? product.value.nameEn ?? '',
    type:         product.value.type ?? '',
    description:  product.value.description ?? '',
    brand_id:     product.value.brandId ?? '',
    category_id:  String(product.value.categoryId ?? ''),
    is_new:       product.value.isNew ?? false,
    is_bestseller: product.value.isBestseller ?? false,
    is_offer:     product.value.isOffer ?? false,
    placeholder_bg: product.value.placeholderBg || '#F2E8E5',
  }
  editingProduct.value = true
}

async function saveProduct() {
  savingProduct.value = true
  const res = await fetch(`${BASE}/admin/products/${props.id}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({
      name:          productForm.value.name,
      name_en:       productForm.value.name_en || null,
      type:          productForm.value.type,
      description:   productForm.value.description || null,
      brand_id:      productForm.value.brand_id,
      category_id:   parseInt(productForm.value.category_id),
      is_new:        productForm.value.is_new,
      is_bestseller: productForm.value.is_bestseller,
      is_offer:      productForm.value.is_offer,
      placeholder_bg: productForm.value.placeholder_bg,
    }),
  })
  if (res.ok) { await load(); editingProduct.value = false }
  savingProduct.value = false
}

function openVariantEdit(v: ProductVariant) {
  editingVariantId.value = v.id
  variantDraft.value = {
    price:         v.price,
    costPrice:     v.costPrice ?? '',
    originalPrice: v.originalPrice ?? '',
    quantity:      v.quantity,
  }
}

async function saveVariant(variantId: number) {
  savingVariant.value = true
  const res = await fetch(`${BASE}/admin/products/${props.id}/variants/${variantId}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({
      price:          parseFloat(String(variantDraft.value.price)) || 0,
      cost_price:     variantDraft.value.costPrice !== '' ? parseFloat(String(variantDraft.value.costPrice)) : null,
      original_price: variantDraft.value.originalPrice !== '' ? parseFloat(String(variantDraft.value.originalPrice)) : null,
      quantity:       parseInt(String(variantDraft.value.quantity)) || 0,
    }),
  })
  if (res.ok) {
    const updated = await res.json()
    const idx = variants.value.findIndex(v => v.id === variantId)
    if (idx !== -1) variants.value[idx] = updated
    editingVariantId.value = null
  }
  savingVariant.value = false
}

async function addDiscount() {
  const body: any = {
    name:        form.value.name,
    type:        form.value.type === '%' ? 'percentage' : 'fixed',
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
    resetForm()
  }
}

function resetForm() {
  form.value = { name: '', type: '%', value: '', scope: 'all', variantIds: [], startsAt: '', endsAt: '' }
}

async function toggleDiscount(d: ProductDiscount) {
  const res = await fetch(`${BASE}/admin/products/${props.id}/discounts/${d.id}/toggle`, {
    method: 'PATCH', headers: headers(),
  })
  if (res.ok) { const updated = await res.json(); Object.assign(d, updated) }
}

async function deleteDiscount(d: ProductDiscount) {
  if (!confirm(t('productDetail.deleteDiscountConfirm'))) return
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

function variantLabel(v: ProductVariant): string {
  return v.specs.map(s => `${s.value}${s.unit ?? ''}`).join(' / ') || t('productDetail.defaultBadge')
}

function marginClass(margin: number): string {
  if (margin >= 40) return 'text-dash-success-dk'
  if (margin >= 20) return 'text-dash-fig'
  return 'text-dash-danger'
}

function toggleVariantId(id: number) {
  const ids = form.value.variantIds
  const idx = ids.indexOf(id)
  if (idx === -1) ids.push(id)
  else ids.splice(idx, 1)
}

// Hue from product name for bottle visual
const productHue = computed(() => {
  const name = (product.value?.name_en ?? product.value?.name ?? '') as string
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return Math.abs(h)
})

const thumbnailUrl = computed(() =>
  images.value.find(i => i.isThumbnail)?.url ?? images.value[0]?.url ?? null
)

const bottleGradient = computed(() => {
  const h = productHue.value
  return `radial-gradient(120% 80% at 30% 20%, oklch(94% 0.04 ${h}), oklch(86% 0.07 ${h}))`
})

const activeDiscounts  = computed(() => discounts.value.filter(d => d.is_active))
const expiredDiscounts = computed(() => discounts.value.filter(d => !d.is_active))

const totalStock = computed(() => variants.value.reduce((a, v) => a + (v.quantity ?? 0), 0))

const kpiChips = computed(() => [
  { l: t('productDetail.kpiRevenue'),  v: product.value?.revenue ? `${product.value.revenue}k` : '—', s: t('productDetail.kpiLydLifetime') },
  { l: t('productDetail.kpiSold'),     v: product.value?.sales_count ?? product.value?.sold ?? '—',    s: t('productDetail.kpiUnits') },
  { l: t('productDetail.kpiStock'),    v: totalStock.value,  s: t('productDetail.variantCount', { n: variants.value.length }, variants.value.length) },
  { l: t('productDetail.kpiVariants'), v: variants.value.length, s: t('productDetail.kpiSizes') },
])

// Placeholder past discounts (until API returns historical data)
const pastDiscounts = computed(() => expiredDiscounts.value)

onMounted(load)
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center h-64 text-dash-muted text-sm">{{ t('common.loading') }}</div>
  <div v-else-if="error" class="text-dash-danger text-sm">{{ error }}</div>

  <div v-else class="space-y-5 pb-10">

    <!-- Page header -->
    <div class="flex items-center justify-between">
      <button
        @click="router.back()"
        class="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-dash-text-2 hover:text-dash-text transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        {{ t('productDetail.back') }}
      </button>
      <div class="flex items-center gap-2">
        <button
          @click="openProductEdit"
          class="h-9 px-3 rounded-btn border border-dash-border text-[12.5px] flex items-center gap-1.5 bg-dash-paper text-dash-text-2 whitespace-nowrap hover:bg-dash-bg transition-colors"
        >
          {{ t('common.edit') }}
        </button>
        <button
          @click="showDiscountForm = true"
          class="h-9 px-3.5 rounded-btn text-[12.5px] font-medium text-white inline-flex items-center gap-1.5 bg-dash-text whitespace-nowrap hover:opacity-90 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14"/><path d="M5 12h14"/>
          </svg>
          {{ t('productDetail.addDiscountBtn') }}
        </button>
      </div>
    </div>

    <!-- Hero card -->
    <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6 grid grid-cols-12 gap-6">
      <!-- Real product image or placeholder -->
      <div class="col-span-4">
        <div
          class="relative w-full rounded-card overflow-hidden"
          style="height: 16rem;"
        >
          <img
            v-if="thumbnailUrl"
            :src="thumbnailUrl"
            :alt="product?.name_en ?? product?.name ?? ''"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center"
            :style="{ background: bottleGradient }"
          >
            <!-- hatching overlay -->
            <div
              class="absolute inset-0 opacity-[0.08]"
              style="background-image: repeating-linear-gradient(45deg, transparent 0 8px, rgba(0,0,0,.6) 8px 9px)"
            />
            <svg viewBox="0 0 80 80" class="relative" style="width:56%;height:56%">
              <g
                fill="none"
                :stroke="`oklch(28% 0.06 ${productHue})`"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                opacity="0.85"
              >
                <path d="M32 10h16v8l3 5v6"/>
                <rect x="24" y="29" width="32" height="38" rx="5"/>
                <path d="M32 14h16"/>
              </g>
            </svg>
          </div>
        </div>
      </div>

      <!-- Product info -->
      <div class="col-span-8">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint whitespace-nowrap">
              {{ product.category ?? product.brand ?? t('productDetail.categoryFallback') }} · EDP
            </p>
            <h1 class="font-display text-[26px] leading-tight mt-1 text-dash-text">
              {{ product.name_en ?? product.name ?? product.slug }}
            </h1>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
              <span class="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-dash-bg border border-dash-border text-dash-muted font-mono">
                {{ product.sku ?? product.slug }}
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-dash-bg border border-dash-border text-dash-muted">
                /p/{{ product.slug }}
              </span>
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                :class="product.is_active ? 'bg-dash-success-lt text-dash-success-dk' : 'bg-dash-fig-lt text-dash-fig'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="product.is_active ? 'bg-dash-success' : 'bg-dash-fig'" />
                {{ product.is_active ? t('productDetail.statusLive') : t('productDetail.statusDraft') }}
              </span>
            </div>
          </div>
        </div>

        <!-- KPI chips -->
        <div class="grid grid-cols-4 gap-2 mt-5">
          <div
            v-for="kpi in kpiChips"
            :key="kpi.l"
            class="rounded-xl border border-dash-border-lt p-3 bg-dash-bg"
          >
            <p class="text-[10px] uppercase tracking-[.14em] text-dash-faint">{{ kpi.l }}</p>
            <p class="font-display text-[20px] tabular-nums mt-1 text-dash-text">{{ kpi.v }}</p>
            <p class="text-[10.5px] mt-0.5 text-dash-muted">{{ kpi.s }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Images panel -->
    <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('productDetail.imagesSectionLabel') }}</p>
          <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">
            {{ t('productDetail.imagesCount', { n: images.length }, images.length) }}
          </h3>
        </div>
        <label
          class="h-8 px-3 rounded-btn text-[12px] font-medium border border-dash-border-lt inline-flex items-center gap-1.5 text-dash-text-2 bg-dash-paper hover:bg-dash-bg transition-colors cursor-pointer"
          :class="uploadingImages ? 'opacity-50 pointer-events-none' : ''"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {{ uploadingImages ? t('productDetail.uploadingLabel') : t('productDetail.uploadImagesBtn') }}
          <input type="file" multiple accept="image/*" class="sr-only" @change="uploadImages" />
        </label>
      </div>

      <!-- Image grid -->
      <div v-if="images.length" class="grid grid-cols-4 gap-3">
        <div
          v-for="img in [...images].sort((a, b) => a.sortOrder - b.sortOrder)"
          :key="img.id"
          class="group relative rounded-xl overflow-hidden border aspect-square"
          :class="img.isThumbnail ? 'border-dash-primary ring-1 ring-dash-primary' : 'border-dash-border'"
        >
          <img :src="img.url" :alt="img.isThumbnail ? t('productDetail.thumbnailBadge') : ''" class="w-full h-full object-cover" />

          <!-- Thumbnail badge -->
          <span
            v-if="img.isThumbnail"
            class="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-dash-primary text-white"
          >{{ t('productDetail.thumbnailBadge') }}</span>

          <!-- Hover actions -->
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2 gap-1">
            <button
              v-if="!img.isThumbnail"
              @click="setThumbnail(img.id)"
              :disabled="settingThumbId === img.id"
              class="text-[10.5px] font-semibold px-2 py-1 rounded-md bg-white/90 text-dash-text hover:bg-white disabled:opacity-50 transition-colors"
            >{{ t('productDetail.setThumbnailBtn') }}</button>
            <span v-else class="flex-1" />
            <button
              @click="deleteImage(img.id)"
              :disabled="deletingImageId === img.id"
              class="text-[10.5px] font-semibold px-2 py-1 rounded-md bg-dash-danger text-white hover:opacity-90 disabled:opacity-50 transition-opacity ms-auto"
            >{{ t('common.delete') }}</button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-10 rounded-xl border border-dashed border-dash-border text-dash-muted">
        <p class="text-[12.5px]">{{ t('productDetail.noImages') }}</p>
        <p class="text-[11px] mt-1 text-dash-faint">{{ t('productDetail.noImagesHint') }}</p>
      </div>
    </div>

    <!-- Variants table (full width) -->
    <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6">
        <div>
          <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('productDetail.variantsSectionTitle') }}</p>
          <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">
            {{ t('productDetail.variantCount', { n: variants.length }, variants.length) }}
          </h3>
        </div>

        <table class="w-full text-[12.5px] mt-4 table-fixed">
          <thead>
            <tr class="text-[10.5px] uppercase tracking-wider text-dash-faint">
              <th class="text-start font-semibold py-2 border-b border-dash-border-lt w-[22%]">{{ t('productDetail.colVariant') }}</th>
              <th class="text-start font-semibold py-2 border-b border-dash-border-lt w-[13%]">{{ t('productDetail.colCost') }}</th>
              <th class="text-start font-semibold py-2 border-b border-dash-border-lt w-[15%]">{{ t('productDetail.colPrice') }}</th>
              <th class="text-start font-semibold py-2 border-b border-dash-border-lt w-[10%]">{{ t('productDetail.colMargin') }}</th>
              <th class="text-start font-semibold py-2 border-b border-dash-border-lt w-[20%]">{{ t('productDetail.colStock') }}</th>
              <th class="text-start font-semibold py-2 border-b border-dash-border-lt">{{ t('productDetail.colDiscount') }}</th>
              <th class="py-2 border-b border-dash-border-lt w-16"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="v in variants" :key="v.id">
              <!-- view row -->
              <tr v-if="editingVariantId !== v.id" class="hover:bg-dash-bg/50 transition-colors group">
                <td class="py-3 border-b border-dash-border-lt font-semibold text-dash-text truncate">
                  {{ variantLabel(v) }}
                  <span v-if="v.isDefault" class="ms-1.5 px-1.5 py-0.5 rounded text-[10px] bg-dash-primary-lt text-dash-primary font-normal">{{ t('productDetail.defaultBadge') }}</span>
                </td>
                <td class="py-3 border-b border-dash-border-lt text-dash-muted tabular-nums">
                  <template v-if="v.costPrice != null">{{ Number(v.costPrice).toFixed(2) }} <span class="text-[10.5px]">LYD</span></template>
                  <span v-else class="text-dash-faint">—</span>
                </td>
                <td class="py-3 border-b border-dash-border-lt tabular-nums font-semibold">
                  <template v-if="bestDiscount(v.id, Number(v.price)).discount">
                    <span class="inline-flex items-baseline gap-1.5">
                      <span class="text-dash-danger">{{ bestDiscount(v.id, Number(v.price)).discountedPrice.toFixed(2) }}</span>
                      <span class="line-through text-[10.5px] font-normal text-dash-faint">{{ Number(v.price).toFixed(2) }}</span>
                      <span class="text-[10.5px] font-normal text-dash-muted">LYD</span>
                    </span>
                  </template>
                  <template v-else>
                    <span class="text-dash-text">{{ Number(v.price).toFixed(2) }} <span class="text-[10.5px] font-normal text-dash-muted">LYD</span></span>
                  </template>
                </td>
                <td class="py-3 border-b border-dash-border-lt tabular-nums">
                  <template v-if="v.costPrice != null && Number(v.price) > 0">
                    <span class="font-semibold" :class="marginClass(((Number(v.price) - Number(v.costPrice)) / Number(v.price)) * 100)">
                      {{ (((Number(v.price) - Number(v.costPrice)) / Number(v.price)) * 100).toFixed(1) }}%
                    </span>
                  </template>
                  <span v-else class="text-dash-faint">—</span>
                </td>
                <td class="py-3 border-b border-dash-border-lt">
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 rounded-full overflow-hidden bg-dash-border-lt" style="width: 60px;">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="{ 'bg-dash-success': v.stock === 'in_stock', 'bg-dash-fig': v.stock === 'low_stock', 'bg-dash-danger': v.stock === 'out_of_stock' }"
                        :style="{ width: `${Math.min(100, (v.quantity / Math.max(1, variants.reduce((a,x) => Math.max(a, x.quantity), 1))) * 100)}%` }"
                      />
                    </div>
                    <span class="tabular-nums text-[11px] text-dash-muted">{{ v.quantity }}</span>
                  </div>
                </td>
                <td class="py-3 border-b border-dash-border-lt">
                  <template v-if="bestDiscount(v.id, Number(v.price)).discount">
                    <span class="text-[10.5px] text-dash-success-dk font-medium">{{ bestDiscount(v.id, Number(v.price)).discount!.name }}</span>
                  </template>
                  <span v-else class="text-dash-faint text-[10.5px]">—</span>
                </td>
                <td class="py-3 border-b border-dash-border-lt">
                  <button
                    @click="openVariantEdit(v)"
                    class="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2.5 rounded-md text-[11px] font-medium border border-dash-border-lt text-dash-text-2 hover:bg-dash-bg"
                  >Edit</button>
                </td>
              </tr>

              <!-- edit row -->
              <tr v-else class="bg-dash-bg/40">
                <td colspan="7" class="py-3 px-1 border-b border-dash-border-lt">
                  <div class="flex items-end gap-4 flex-wrap">
                    <div class="shrink-0">
                      <p class="text-[10px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1">{{ t('productDetail.labelVariant') }}</p>
                      <p class="text-[13px] font-semibold text-dash-text">{{ variantLabel(v) }}</p>
                    </div>
                    <div>
                      <label class="block text-[10px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1">{{ t('productDetail.labelCost') }}</label>
                      <input v-model="variantDraft.costPrice" type="number" min="0" step="0.01" placeholder="—"
                        class="w-24 h-8 px-2.5 rounded-md border border-dash-border text-[12.5px] bg-dash-paper outline-none focus:border-dash-primary tabular-nums" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1">{{ t('productDetail.labelPrice') }}</label>
                      <input v-model="variantDraft.price" type="number" min="0" step="0.01"
                        class="w-24 h-8 px-2.5 rounded-md border border-dash-border text-[12.5px] bg-dash-paper outline-none focus:border-dash-primary tabular-nums" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1">{{ t('productDetail.labelOriginalPrice') }}</label>
                      <input v-model="variantDraft.originalPrice" type="number" min="0" step="0.01" placeholder="—"
                        class="w-24 h-8 px-2.5 rounded-md border border-dash-border text-[12.5px] bg-dash-paper outline-none focus:border-dash-primary tabular-nums" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1">{{ t('productDetail.labelQuantity') }}</label>
                      <input v-model="variantDraft.quantity" type="number" min="0"
                        class="w-20 h-8 px-2.5 rounded-md border border-dash-border text-[12.5px] bg-dash-paper outline-none focus:border-dash-primary tabular-nums" />
                    </div>
                    <div class="flex items-center gap-2 ms-auto">
                      <button @click="editingVariantId = null"
                        class="h-8 px-3 rounded-md text-[12px] border border-dash-border-lt text-dash-text-2 hover:bg-dash-bg transition-colors">{{ t('common.cancel') }}</button>
                      <button @click="saveVariant(v.id)" :disabled="savingVariant"
                        class="h-8 px-3.5 rounded-md text-[12px] font-semibold text-white bg-dash-text hover:opacity-90 disabled:opacity-50 transition-opacity">
                        {{ savingVariant ? t('productDetail.savingLabel') : t('productDetail.saveBtn') }}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <p v-if="!variants.length" class="text-xs text-dash-muted text-center py-6">{{ t('productDetail.noVariants') }}</p>
    </div>

    <!-- Active discounts panel (full width) -->
    <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint whitespace-nowrap">{{ t('productDetail.activeDiscountsTitle') }}</p>
            <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">
              {{ t('productDetail.discountCount', { n: activeDiscounts.length }, activeDiscounts.length) }}
            </h3>
          </div>
          <button
            @click="showDiscountForm = !showDiscountForm"
            class="h-8 px-3 rounded-btn text-[12px] font-medium border border-dash-border-lt inline-flex items-center gap-1.5 text-dash-text-2 transition-colors"
            :class="showDiscountForm ? 'bg-dash-bg' : 'bg-dash-paper hover:bg-dash-bg'"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14"/><path d="M5 12h14"/>
            </svg>
            {{ t('common.add') }}
          </button>
        </div>

        <!-- Discount composer -->
        <div
          v-if="showDiscountForm"
          class="mt-4 rounded-xl border border-dash-border-lt p-4 space-y-3 bg-dash-bg"
        >
          <input
            v-model="form.name"
            class="w-full h-9 px-3 rounded-btn border border-dash-border-lt text-[12.5px] outline-none bg-dash-paper text-dash-text placeholder:text-dash-faint focus:border-dash-primary transition-colors"
            :placeholder="t('productDetail.discountNamePlaceholder')"
          />

          <!-- Type toggle + value -->
          <div class="grid grid-cols-5 gap-2">
            <div class="col-span-2 flex items-center p-1 rounded-btn border border-dash-border-lt bg-dash-paper">
              <button
                v-for="t in ['%', 'LYD']"
                :key="t"
                @click="form.type = t as '%' | 'LYD'"
                class="flex-1 h-7 text-[11.5px] font-semibold rounded-md transition-colors"
                :class="form.type === t ? 'bg-dash-text text-white' : 'text-dash-muted hover:text-dash-text'"
              >{{ t }}</button>
            </div>
            <div class="col-span-3 flex items-center px-2.5 rounded-btn border border-dash-border-lt bg-dash-paper h-9">
              <input
                v-model="form.value"
                type="number"
                min="0"
                class="bg-transparent text-[12.5px] outline-none flex-1 tabular-nums text-dash-text placeholder:text-dash-faint"
                placeholder="0"
              />
              <span class="text-[10.5px] text-dash-faint">{{ form.type === '%' ? t('productDetail.percentOff') : t('productDetail.lydOff') }}</span>
            </div>
          </div>

          <!-- Scope -->
          <div>
            <p class="text-[10.5px] font-semibold uppercase tracking-[.14em] mb-1.5 text-dash-faint">{{ t('productDetail.appliesTo') }}</p>
            <div class="flex items-center p-1 rounded-btn border border-dash-border-lt bg-dash-paper">
              <button
                v-for="[k, lbl] in [['all', t('productDetail.allVariants')], ['specific', t('productDetail.specificVariants')]]"
                :key="k"
                @click="form.scope = k as 'all' | 'specific'"
                class="flex-1 h-7 text-[11.5px] font-semibold rounded-md transition-colors"
                :class="form.scope === k ? 'bg-dash-text text-white' : 'text-dash-muted hover:text-dash-text'"
              >{{ lbl }}</button>
            </div>
            <div v-if="form.scope === 'specific'" class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="v in variants"
                :key="v.id"
                @click="toggleVariantId(v.id)"
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer"
                :class="form.variantIds.includes(v.id)
                  ? 'bg-dash-text text-white border-dash-text'
                  : 'bg-dash-paper text-dash-text-2 border-dash-border hover:border-dash-text'"
              >
                <span v-if="form.variantIds.includes(v.id)" class="text-[10px]">✓</span>
                {{ variantLabel(v) }}
              </button>
            </div>
          </div>

          <!-- Dates -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <p class="text-[10.5px] font-semibold uppercase tracking-[.14em] mb-1 text-dash-faint">{{ t('productDetail.startsLabel') }}</p>
              <input
                v-model="form.startsAt"
                type="date"
                class="w-full h-9 px-3 rounded-btn border border-dash-border-lt text-[12.5px] outline-none bg-dash-paper text-dash-text tabular-nums focus:border-dash-primary transition-colors"
              />
            </div>
            <div>
              <p class="text-[10.5px] font-semibold uppercase tracking-[.14em] mb-1 text-dash-faint">{{ t('productDetail.endsLabel') }}</p>
              <input
                v-model="form.endsAt"
                type="date"
                class="w-full h-9 px-3 rounded-btn border border-dash-border-lt text-[12.5px] outline-none bg-dash-paper text-dash-text tabular-nums focus:border-dash-primary transition-colors"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              @click="showDiscountForm = false; resetForm()"
              class="h-8 px-3 rounded-btn text-[12px] font-medium border border-dash-border-lt bg-dash-paper text-dash-text-2 hover:bg-dash-bg transition-colors"
            >{{ t('common.cancel') }}</button>
            <button
              @click="addDiscount"
              class="h-8 px-3 rounded-btn text-[12px] font-semibold text-white bg-dash-text hover:opacity-90 transition-opacity"
            >{{ t('productDetail.activateBtn') }}</button>
          </div>
        </div>

        <!-- Active discount cards -->
        <div class="mt-4 space-y-2">
          <div v-if="activeDiscounts.length === 0" class="text-center py-8 rounded-xl border border-dashed border-dash-border text-dash-muted">
            <p class="text-[12.5px]">{{ t('productDetail.noDiscountsRunning') }}</p>
          </div>
          <div
            v-for="d in activeDiscounts"
            :key="d.id"
            class="rounded-xl border border-dash-success/30 p-3 flex items-center gap-3 bg-dash-success-lt"
          >
            <div class="h-9 min-w-[3.25rem] px-2.5 rounded-lg bg-dash-paper inline-flex items-center justify-center font-display text-[15px] tabular-nums shrink-0 border border-dash-border text-dash-success-dk">
              <span>{{ Number(d.value) }}<span v-if="d.type === 'percentage'" class="text-[11px]">%</span><span v-else class="text-[10px] ms-0.5">LYD</span></span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[13px] font-semibold text-dash-text truncate">{{ d.name }}</p>
              <p class="text-[11px] mt-0.5 text-dash-text-2 truncate">
                {{ d.scope === 'all' ? t('productDetail.allVariants') : t('productDetail.specificVariants') }}
                <template v-if="d.starts_at || d.ends_at">
                  · <span class="tabular-nums">{{ d.starts_at ? new Date(d.starts_at).toLocaleDateString() : t('productDetail.nowLabel') }}</span>
                  → <span class="tabular-nums">{{ d.ends_at ? new Date(d.ends_at).toLocaleDateString() : t('productDetail.openLabel') }}</span>
                </template>
              </p>
            </div>
            <button
              @click="toggleDiscount(d)"
              class="shrink-0 text-[11.5px] font-medium px-2.5 py-1 rounded-md text-dash-danger hover:bg-dash-danger-lt transition-colors"
            >{{ t('productDetail.endBtn') }}</button>
          </div>

          <!-- Paused discounts -->
          <template v-if="expiredDiscounts.length">
            <p class="text-[10px] uppercase tracking-[.14em] font-semibold text-dash-faint pt-2">{{ t('productDetail.pausedExpired') }}</p>
            <div
              v-for="d in expiredDiscounts"
              :key="d.id"
              class="rounded-xl border border-dash-border p-3 flex items-center gap-3 bg-dash-bg opacity-70"
            >
              <div class="h-8 min-w-[3rem] px-2 rounded-lg bg-dash-paper inline-flex items-center justify-center font-display text-[13px] tabular-nums shrink-0 border border-dash-border text-dash-muted">
                {{ Number(d.value) }}<span v-if="d.type === 'percentage'" class="text-[10px]">%</span><span v-else class="text-[9px] ms-0.5">LYD</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[12.5px] font-medium text-dash-text truncate">{{ d.name }}</p>
              </div>
              <button @click="toggleDiscount(d)" class="shrink-0 text-[11.5px] font-medium px-2 py-1 rounded-md text-dash-primary hover:underline">{{ t('productDetail.reactivateBtn') }}</button>
              <button @click="deleteDiscount(d)" class="shrink-0 text-[11.5px] text-dash-danger hover:underline">{{ t('common.delete') }}</button>
            </div>
          </template>
        </div>
    </div>

    <!-- Past discounts table -->
    <div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('productDetail.historyTitle') }}</p>
          <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">{{ t('productDetail.pastDiscountsTitle') }}</h3>
        </div>
        <span class="text-[11.5px] text-dash-muted">{{ t('productDetail.previousCount', { n: pastDiscounts.length }, pastDiscounts.length) }}</span>
      </div>
      <table class="w-full text-[12.5px] mt-4">
        <thead>
          <tr class="text-[10.5px] uppercase tracking-wider text-dash-faint">
            <th class="text-left font-semibold py-2 border-b border-dash-border-lt">{{ t('productDetail.colDiscount') }}</th>
            <th class="text-left font-semibold py-2 border-b border-dash-border-lt">{{ t('coupons.columns.value') }}</th>
            <th class="text-left font-semibold py-2 border-b border-dash-border-lt">{{ t('productDetail.colAppliesTo') }}</th>
            <th class="text-left font-semibold py-2 border-b border-dash-border-lt">{{ t('productDetail.colPeriod') }}</th>
            <th class="text-left font-semibold py-2 border-b border-dash-border-lt">{{ t('orders.columns.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in pastDiscounts" :key="d.id">
            <td class="py-3 border-b border-dash-border-lt font-medium text-dash-text">{{ d.name }}</td>
            <td class="py-3 border-b border-dash-border-lt tabular-nums font-semibold whitespace-nowrap">
              {{ Number(d.value) }}<template v-if="d.type === 'percentage'">%</template><span v-else class="text-[10.5px] font-normal text-dash-muted"> LYD</span>
            </td>
            <td class="py-3 border-b border-dash-border-lt text-dash-muted">
              {{ d.scope === 'all' ? t('productDetail.allVariants') : t('productDetail.specificVariants') }}
            </td>
            <td class="py-3 border-b border-dash-border-lt tabular-nums text-dash-muted">
              <template v-if="d.starts_at || d.ends_at">
                {{ d.starts_at ? new Date(d.starts_at).toLocaleDateString() : '—' }}
                — {{ d.ends_at ? new Date(d.ends_at).toLocaleDateString() : t('productDetail.openLabel') }}
              </template>
              <span v-else class="text-dash-faint">—</span>
            </td>
            <td class="py-3 border-b border-dash-border-lt">
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-dash-bg text-dash-muted">
                <span class="h-1.5 w-1.5 rounded-full bg-dash-faint" />
                {{ t('productDetail.endedBadge') }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!pastDiscounts.length" class="text-xs text-dash-muted text-center py-6">{{ t('productDetail.noPastDiscounts') }}</p>
    </div>

  </div>

  <!-- Product edit modal -->
  <AModal :open="editingProduct" :title="t('productDetail.editModalTitle')" :wide="true" @close="editingProduct = false">
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.nameArLabel') }}</label>
          <input v-model="productForm.name" class="w-full h-9 px-3 rounded-btn border border-dash-border-lt text-[13px] outline-none bg-dash-bg text-dash-text focus:border-dash-primary transition-colors" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.nameEnLabel') }}</label>
          <input v-model="productForm.name_en" class="w-full h-9 px-3 rounded-btn border border-dash-border-lt text-[13px] outline-none bg-dash-bg text-dash-text focus:border-dash-primary transition-colors" />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.typeLabel') }}</label>
          <select v-model="productForm.type" class="w-full h-9 px-3 rounded-btn border border-dash-border-lt text-[13px] outline-none bg-dash-bg text-dash-text focus:border-dash-primary transition-colors">
            <option value="EDP">EDP</option>
            <option value="EDT">EDT</option>
            <option value="Parfum">Parfum</option>
            <option value="EDC">EDC</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.brandLabel') }}</label>
          <select v-model="productForm.brand_id" class="w-full h-9 px-3 rounded-btn border border-dash-border-lt text-[13px] outline-none bg-dash-bg text-dash-text focus:border-dash-primary transition-colors">
            <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.categoryLabel') }}</label>
          <select v-model="productForm.category_id" class="w-full h-9 px-3 rounded-btn border border-dash-border-lt text-[13px] outline-none bg-dash-bg text-dash-text focus:border-dash-primary transition-colors">
            <option v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.label }}</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.descriptionLabel') }}</label>
        <textarea v-model="productForm.description" rows="3" class="w-full px-3 py-2 rounded-btn border border-dash-border-lt text-[13px] outline-none bg-dash-bg text-dash-text focus:border-dash-primary transition-colors resize-none leading-relaxed" />
      </div>
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.cardColourLabel') }}</label>
        <div class="flex items-center gap-2">
          <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border-lt shrink-0">
            <input type="color" v-model="productForm.placeholder_bg"
                   class="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
            <div class="w-full h-full" :style="{ backgroundColor: productForm.placeholder_bg }" />
          </div>
          <input type="text" v-model="productForm.placeholder_bg" maxlength="7"
                 class="w-28 rounded-btn border border-dash-border-lt bg-dash-bg px-2.5 py-1.5
                        text-[12.5px] font-mono text-dash-text focus:outline-none focus:border-dash-primary" />
        </div>
      </div>
      <div class="flex items-center gap-5 pt-1">
        <label v-for="[key, lbl] in [['is_new', t('productDetail.flagNew')], ['is_bestseller', t('productDetail.flagBestseller')], ['is_offer', t('productDetail.flagOffer')]]" :key="key" class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="(productForm as any)[key]" class="h-3.5 w-3.5 rounded accent-dash-text" />
          <span class="text-[12.5px] text-dash-text-2">{{ lbl }}</span>
        </label>
      </div>
    </div>
    <template #footer>
      <button @click="editingProduct = false" class="h-8 px-3 rounded-btn text-[12px] border border-dash-border-lt bg-dash-paper text-dash-text-2 hover:bg-dash-bg transition-colors">{{ t('common.cancel') }}</button>
      <button @click="saveProduct" :disabled="savingProduct" class="h-8 px-4 rounded-btn text-[12px] font-semibold text-white bg-dash-text hover:opacity-90 disabled:opacity-50 transition-opacity">
        {{ savingProduct ? t('productDetail.savingLabel') : t('productDetail.saveChangesBtn') }}
      </button>
    </template>
  </AModal>

</template>

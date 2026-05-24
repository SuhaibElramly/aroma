<!-- aroma-admin/src/views/ProductsView.vue -->
<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1280px]">

    <!-- Stat strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-dash-paper border border-dash-border rounded-card p-5">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('products.kpiAll') }}</p>
        <p class="font-display text-[28px] leading-none mt-2 text-dash-text tabular-nums">{{ meta?.total ?? '—' }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('products.kpiTotalProducts') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('products.kpiInStock') }}</p>
        <p class="font-display text-[28px] leading-none mt-2 text-dash-success tabular-nums">{{ inStockCount }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('products.kpiAvailableNow') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('products.kpiLowStock') }}</p>
        <p class="font-display text-[28px] leading-none mt-2 text-dash-fig tabular-nums">{{ lowStockCount }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('products.kpiReorderSoon') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('products.kpiOutOfStock') }}</p>
        <p class="font-display text-[28px] leading-none mt-2 text-dash-danger tabular-nums">{{ outOfStockCount }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('products.kpiActionNeeded') }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-dash-paper border border-dash-border rounded-card p-4 flex items-center gap-3 flex-wrap">
      <!-- Search input -->
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dash-border-lt bg-dash-paper-2 flex-1 min-w-[200px]">
        <Search :size="13" class="text-dash-faint shrink-0" />
        <input
          v-model="search"
          :placeholder="t('products.searchPlaceholder')"
          class="bg-transparent text-[12.5px] outline-none flex-1 text-dash-text-2 placeholder:text-dash-faint"
          @input="debouncedFetch"
        />
      </div>

      <!-- More filters toggle -->
      <button
        @click="showFilters = !showFilters"
        :class="[
          'h-9 px-3 rounded-lg border text-[12px] flex items-center gap-1.5 whitespace-nowrap transition-colors',
          showFilters
            ? 'bg-dash-text text-white border-dash-text'
            : 'bg-dash-paper border-dash-border text-dash-text-2 hover:border-dash-text',
        ]"
      >
        <SlidersHorizontal :size="13" />
        {{ t('products.filtersBtn') }}
      </button>

      <!-- View toggle -->
      <div class="flex items-center p-1 rounded-lg border border-dash-border-lt bg-dash-paper-2 gap-0.5">
        <button
          @click="view = 'grid'"
          :class="[
            'h-7 w-8 grid place-items-center rounded-md transition-all',
            view === 'grid' ? 'bg-white shadow-sm text-dash-text' : 'text-dash-muted hover:text-dash-text',
          ]"
        >
          <LayoutGrid :size="14" />
        </button>
        <button
          @click="view = 'list'"
          :class="[
            'h-7 w-8 grid place-items-center rounded-md transition-all',
            view === 'list' ? 'bg-white shadow-sm text-dash-text' : 'text-dash-muted hover:text-dash-text',
          ]"
        >
          <List :size="14" />
        </button>
      </div>

      <!-- Add product -->
      <AButton size="sm" class="shrink-0" @click="openNewProductDrawer">
        <Plus :size="14" /> {{ t('products.addProduct') }}
      </AButton>
    </div>

    <!-- Expanded filters -->
    <div v-if="showFilters" class="bg-dash-paper border border-dash-border rounded-card p-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <ASelect v-model="brandId"    :label="t('products.columns.brand')"    :options="[{ value: '', label: t('products.allBrands') },    ...brandOptions]"    @update:modelValue="fetch(1)" />
        <ASelect v-model="categoryId" :label="t('products.columns.category')" :options="[{ value: '', label: t('products.allCategories') }, ...categoryOptions]" @update:modelValue="fetch(1)" />
        <ASelect v-model="filterType" :label="t('products.columns.type')"     :options="typeFilterOptions"                                                       @update:modelValue="fetch(1)" />
        <AInput  v-model="priceMin"   :label="t('products.filterPriceMin')" type="number" placeholder="0"   @input="debouncedFetch" />
        <AInput  v-model="priceMax"   :label="t('products.filterPriceMax')" type="number" placeholder="Any" @input="debouncedFetch" />
      </div>
    </div>

    <!-- Grid view -->
    <div v-if="view === 'grid'" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-if="loading"
        v-for="i in 8"
        :key="i"
        class="bg-dash-paper border border-dash-border rounded-card h-72 animate-pulse"
      />
      <template v-else-if="items.length">
        <div
          v-for="p in items"
          :key="p.id"
          class="bg-dash-paper border border-dash-border rounded-card transition-card hover-lift cursor-pointer"
          @click="router.push(`/products/${p.id}`)"
        >
          <!-- Bottle image area -->
          <div
            class="relative h-44 rounded-t-card overflow-hidden"
            :style="{ background: bottleGradient(p.name) }"
          >
            <!-- Subtle diagonal texture -->
            <div
              class="absolute inset-0 opacity-[0.07]"
              style="background-image: repeating-linear-gradient(45deg, transparent 0 8px, rgba(0,0,0,.6) 8px 9px)"
            />
            <!-- Thumbnail if available -->
            <img
              v-if="p.thumbnailUrl"
              :src="p.thumbnailUrl"
              :alt="p.name"
              class="absolute inset-0 w-full h-full object-cover"
            />
            <!-- Bottle SVG placeholder -->
            <svg
              v-else
              viewBox="0 0 80 80"
              class="absolute inset-0 m-auto"
              width="56%"
              height="56%"
            >
              <g
                fill="none"
                :stroke="`oklch(28% 0.06 ${productHue(p.name)})`"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                opacity="0.85"
              >
                <path d="M32 10h16v8l3 5v6"/>
                <rect x="24" y="29" width="32" height="38" rx="5"/>
                <path d="M32 14h16"/>
                <path d="M30 42h20" opacity="0.4"/>
                <path d="M30 50h20" opacity="0.3"/>
              </g>
            </svg>
            <!-- Stock status chip -->
            <span
              class="absolute top-2 start-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium"
              :class="stockChipClass(p)"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="stockDotClass(p)" />
              {{ stockLabel(p) }}
            </span>
          </div>

          <!-- Card body -->
          <div class="p-4">
            <p class="text-[11px] font-medium text-dash-faint uppercase tracking-wider">{{ p.category }}</p>
            <p class="font-display text-[15px] font-medium text-dash-text leading-snug mt-0.5 truncate">{{ p.name }}</p>

            <!-- Stock bar -->
            <div class="mt-3 h-1.5 rounded-full bg-dash-bg overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :style="{ width: stockPct(p) + '%', background: stockBarColor(p) }"
              />
            </div>

            <!-- Price + variant count -->
            <div class="flex items-center justify-between mt-3">
              <span class="font-display text-[15px] text-dash-text">
                <span v-if="p.price">{{ Number(p.price).toFixed(0) }} <span class="text-[11px] text-dash-muted font-sans">LYD</span></span>
                <span v-else class="text-[13px] text-dash-faint">{{ t('products.noVariants') }}</span>
              </span>
              <span class="text-[11px] text-dash-faint">{{ t('products.variantCount', { n: p.variantCount }, p.variantCount) }}</span>
            </div>

            <!-- Action row -->
            <div class="flex gap-1.5 mt-3 pt-3 border-t border-dash-border-lt">
              <RouterLink :to="`/products/${p.id}/edit`" class="flex-1">
                <AButton size="sm" variant="ghost" class="w-full text-[11px]">{{ t('products.editBtn') }}</AButton>
              </RouterLink>
              <AButton size="sm" variant="danger" class="text-[11px]" @click.stop="confirmDelete(p)">{{ t('common.delete') }}</AButton>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="col-span-full py-16">
        <AEmptyState :icon="Package" :heading="t('products.noProducts')" :sub="t('products.noProductsSub')">
          <template #action>
            <AButton size="sm" @click="openNewProductDrawer"><Plus :size="14" /> {{ t('products.addProduct') }}</AButton>
          </template>
        </AEmptyState>
      </div>
    </div>

    <!-- List view -->
    <template v-else>
      <ATable :columns="cols" :rows="items" :loading="loading">
        <template #cell-name="{ row }">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                 :style="{ background: bottleGradient((row as AdminProduct).name) }">
              <img
                v-if="(row as AdminProduct).thumbnailUrl"
                :src="(row as AdminProduct).thumbnailUrl!"
                :alt="(row as AdminProduct).name"
                class="h-full w-full object-cover"
              />
              <svg v-else viewBox="0 0 80 80" width="60%" height="60%">
                <g fill="none" :stroke="`oklch(28% 0.06 ${productHue((row as AdminProduct).name)})`" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
                  <path d="M32 10h16v8l3 5v6"/>
                  <rect x="24" y="29" width="32" height="38" rx="5"/>
                  <path d="M32 14h16"/>
                </g>
              </svg>
            </div>
            <div>
              <RouterLink :to="`/products/${(row as AdminProduct).id}`" class="font-medium text-dash-text hover:text-dash-primary transition-colors text-xs">
                {{ (row as AdminProduct).name }}
              </RouterLink>
              <p v-if="(row as AdminProduct).nameEn" class="text-2xs text-dash-faint">{{ (row as AdminProduct).nameEn }}</p>
            </div>
          </div>
        </template>
        <template #cell-type="{ value }">
          <span class="text-[11px] rounded-full px-2 py-0.5 bg-dash-primary-lt text-dash-primary font-medium">{{ value }}</span>
        </template>
        <template #cell-price="{ value }">
          <span v-if="value">{{ Number(value).toFixed(2) }} LYD</span>
          <span v-else class="text-dash-faint">{{ t('products.noVariants') }}</span>
        </template>
        <template #cell-isNew="{ value }">
          <span v-if="value" class="text-[10px] text-dash-secondary bg-dash-secondary-lt rounded-full px-2 py-0.5">{{ t('products.newArrival') }}</span>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-1.5 justify-end rtl:justify-start">
            <RouterLink :to="`/products/${(row as AdminProduct).id}/edit`">
              <AButton size="sm" variant="ghost">{{ t('products.editBtn') }}</AButton>
            </RouterLink>
            <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminProduct)">{{ t('common.delete') }}</AButton>
          </div>
        </template>
        <template #empty>
          <AEmptyState :icon="Package" :heading="t('products.noProducts')" :sub="t('products.noProductsSub')">
            <template #action>
              <AButton size="sm" @click="openNewProductDrawer"><Plus :size="14" /> {{ t('products.addProduct') }}</AButton>
            </template>
          </AEmptyState>
        </template>
      </ATable>
    </template>

    <APagination :meta="meta" @change="changePage" />

    <!-- Delete confirmation -->
    <AConfirmDialog
      :open="!!deletingProduct"
      :title="t('products.deleteConfirmTitle')"
      :message="t('products.deleteConfirmMessage', { name: deletingProduct?.name ?? '' })"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingProduct = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { useNewProductDrawer } from '../composables/useNewProductDrawer'
import { Plus, Package, Search, LayoutGrid, List, SlidersHorizontal } from 'lucide-vue-next'
import { usePagination } from '../composables/usePagination'
import {
  apiGetProducts, apiDeleteProduct,
  apiGetBrands, apiGetCategories,
} from '../api/admin'
import type { AdminProduct, AdminBrand, AdminCategory, ProductType } from '../types'
import ATable          from '../components/ui/ATable.vue'
import AButton         from '../components/ui/AButton.vue'
import AInput          from '../components/ui/AInput.vue'
import ASelect         from '../components/ui/ASelect.vue'
import APagination     from '../components/ui/APagination.vue'
import AEmptyState     from '../components/ui/AEmptyState.vue'
import AConfirmDialog  from '../components/ui/AConfirmDialog.vue'

const { t } = useI18n()
const router = useRouter()
const { open: openNewProductDrawer } = useNewProductDrawer()

// View state
const view        = ref<'grid' | 'list'>('grid')
const showFilters = ref(false)

// Filters
const search     = ref('')
const brandId    = ref('')
const categoryId = ref('')
const filterType = ref('')
const priceMin   = ref('')
const priceMax   = ref('')
const brands     = ref<AdminBrand[]>([])
const cats       = ref<AdminCategory[]>([])

// Delete state
const deletingProduct = ref<AdminProduct | null>(null)
const deleting        = ref(false)

const typeOptions      = ['EDP','EDT','Parfum','EDC'].map(v => ({ value: v, label: v }))
const typeFilterOptions = computed(() => [{ value: '', label: t('products.allTypes') }, ...typeOptions])
const brandOptions     = computed(() => brands.value.map(b => ({ value: String(b.id), label: b.name })))
const categoryOptions  = computed(() => cats.value.map(c => ({ value: String(c.id), label: c.label })))

const cols = computed(() => [
  { key: 'name',        label: t('products.columns.name') },
  { key: 'brand',       label: t('products.columns.brand') },
  { key: 'category',    label: t('products.columns.category') },
  { key: 'type',        label: t('products.columns.type') },
  { key: 'price',       label: t('products.columns.price') },
  { key: 'isNew',       label: t('products.columns.flags') },
  { key: 'variantCount',label: t('products.columns.variants') },
])

const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetProducts({
    search:      search.value      || undefined,
    brand_id:    brandId.value     || undefined,
    category_id: categoryId.value  || undefined,
    type:        (filterType.value || undefined) as ProductType | undefined,
    price_min:   priceMin.value    ? Number(priceMin.value)  : undefined,
    price_max:   priceMax.value    ? Number(priceMax.value)  : undefined,
    page,
  }).then(r => r.data),
)

// Stat counts derived from current page items
const inStockCount    = computed(() => items.value.filter(p => !isLow(p) && !isOut(p)).length)
const lowStockCount   = computed(() => items.value.filter(p => isLow(p)).length)
const outOfStockCount = computed(() => items.value.filter(p => isOut(p)).length)

// ── Helpers ────────────────────────────────────────────────────────────────

function productHue(name: string | null | undefined): number {
  if (!name) return 32
  const code = name.charCodeAt(0)
  const hues = [32, 340, 200, 96, 48, 140, 280, 18, 54, 24]
  return hues[code % hues.length]
}

function bottleGradient(name: string | null | undefined): string {
  const hue = productHue(name)
  return `radial-gradient(120% 80% at 30% 20%, oklch(94% 0.04 ${hue}), oklch(88% 0.06 ${hue + 20}))`
}

function isOut(p: AdminProduct): boolean {
  // product has price = null means no variants; treat as out
  return p.price === null || p.price === '0'
}

function isLow(_p: AdminProduct): boolean {
  // heuristic: no direct stock count on list items — use placeholderBg hint or just never
  // since AdminProduct doesn't have stock count, we rely on product-level signals
  return false
}

function stockLabel(p: AdminProduct): string {
  if (isOut(p)) return t('products.outOfStock')
  return t('products.inStock')
}

function stockChipClass(p: AdminProduct): string {
  if (isOut(p)) return 'bg-dash-danger-lt text-dash-danger'
  return 'bg-dash-success-lt text-dash-success-dk'
}

function stockDotClass(p: AdminProduct): string {
  if (isOut(p)) return 'bg-dash-danger'
  return 'bg-dash-success'
}

function stockPct(p: AdminProduct): number {
  if (isOut(p)) return 100
  return 70 // default visual fill for in-stock items on list page
}

function stockBarColor(p: AdminProduct): string {
  if (isOut(p)) return 'var(--color-dash-danger, #e57373)'
  return 'var(--color-dash-success, #66bb6a)'
}

// ── Debounce / CRUD ────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 350)
}

function confirmDelete(p: AdminProduct) { deletingProduct.value = p }

async function handleDelete() {
  if (!deletingProduct.value) return
  deleting.value = true
  try {
    await apiDeleteProduct(deletingProduct.value.id)
    deletingProduct.value = null
    fetch(1)
  } catch {
    // error handled silently
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  fetch(1)
  try {
    const [b, c] = await Promise.all([apiGetBrands(), apiGetCategories()])
    brands.value = b.data
    cats.value   = c.data
  } catch {
    // dropdowns stay empty on error
  }
})

onUnmounted(() => clearTimeout(debounceTimer))
</script>

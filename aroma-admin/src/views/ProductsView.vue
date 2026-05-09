<!-- aroma-admin/src/views/ProductsView.vue -->
<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="space-y-3">
      <div class="flex items-end justify-between gap-3">
        <div class="grid grid-cols-3 gap-3 flex-1">
          <AInput v-model="search" :label="t('common.name')" :placeholder="t('products.searchPlaceholder')" @input="debouncedFetch" />
          <ASelect v-model="brandId" :label="t('products.columns.brand')" :options="[{ value: '', label: t('products.allBrands') }, ...brandOptions]" @update:modelValue="fetch(1)" />
          <ASelect v-model="categoryId" :label="t('products.columns.category')" :options="[{ value: '', label: t('products.allCategories') }, ...categoryOptions]" @update:modelValue="fetch(1)" />
        </div>
        <RouterLink to="/products/new">
          <AButton size="sm" class="shrink-0 self-end">
            <Plus :size="14" /> {{ t('products.addProduct') }}
          </AButton>
        </RouterLink>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <ASelect v-model="filterType" :label="t('products.columns.type')" :options="typeFilterOptions" @update:modelValue="fetch(1)" />
        <AInput v-model="priceMin" :label="t('products.filterPriceMin')" type="number" placeholder="0" @input="debouncedFetch" />
        <AInput v-model="priceMax" :label="t('products.filterPriceMax')" type="number" placeholder="Any" @input="debouncedFetch" />
      </div>
    </div>

    <ATable :columns="cols" :rows="items" :loading="loading">
      <template #cell-name="{ row }">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-dash-border flex items-center justify-center">
            <img
              v-if="(row as AdminProduct).thumbnailUrl"
              :src="(row as AdminProduct).thumbnailUrl!"
              :alt="(row as AdminProduct).name"
              class="h-full w-full object-cover"
            />
            <ImageOff v-else :size="14" class="text-dash-faint" />
          </div>
          <div>
            <p class="font-medium text-dash-text text-xs">{{ (row as AdminProduct).name }}</p>
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
      <template #cell-isNew="{ value }"><span v-if="value" class="text-[10px] text-dash-secondary bg-dash-secondary-lt rounded-full px-2 py-0.5">{{ t('products.newArrival') }}</span></template>
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
            <RouterLink to="/products/new">
              <AButton size="sm"><Plus :size="14" /> {{ t('products.addProduct') }}</AButton>
            </RouterLink>
          </template>
        </AEmptyState>
      </template>
    </ATable>

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
import { RouterLink } from 'vue-router'
import { Plus, Package, ImageOff } from 'lucide-vue-next'
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

const search     = ref('')
const brandId    = ref('')
const categoryId = ref('')
const filterType = ref('')
const priceMin   = ref('')
const priceMax   = ref('')
const brands  = ref<AdminBrand[]>([])
const cats    = ref<AdminCategory[]>([])
const deletingProduct = ref<AdminProduct | null>(null)
const deleting        = ref(false)

const typeOptions     = ['EDP','EDT','Parfum','EDC'].map(v => ({ value: v, label: v }))
const typeFilterOptions = computed(() => [{ value: '', label: t('products.allTypes') }, ...typeOptions])
const brandOptions    = computed(() => brands.value.map(b => ({ value: String(b.id), label: b.name })))
const categoryOptions = computed(() => cats.value.map(c => ({ value: String(c.id), label: c.label })))

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

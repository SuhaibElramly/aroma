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
        <AButton @click="openCreate" size="sm" class="shrink-0 self-end">
          <Plus :size="14" /> {{ t('products.addProduct') }}
        </AButton>
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
          <RouterLink :to="`/products/${(row as AdminProduct).id}/variants`">
            <AButton size="sm" variant="ghost">{{ t('products.variantsBtn', { count: (row as AdminProduct).variantCount }) }}</AButton>
          </RouterLink>
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminProduct)">{{ t('common.edit') }}</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminProduct)">{{ t('common.delete') }}</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Package" :heading="t('products.noProducts')" :sub="t('products.noProductsSub')">
          <template #action><AButton size="sm" @click="openCreate"><Plus :size="14" /> {{ t('products.addProduct') }}</AButton></template>
        </AEmptyState>
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />

    <!-- Create / Edit modal -->
    <AModal :open="modalOpen" :title="editing ? t('products.editProduct') : t('products.addProduct')" wide @close="modalOpen = false">
      <form class="space-y-4" @submit.prevent>

        <!-- Names -->
        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2.5">{{ t('products.nameArabic') }} / {{ t('products.nameEnglish') }}</p>
          <div class="grid grid-cols-2 gap-3">
            <AInput v-model="form.name"    :label="t('products.nameArabic')" :error="formErrors.name" dir="rtl" required />
            <AInput v-model="form.name_en" :label="t('products.nameEnglish')" />
          </div>
        </div>

        <!-- Slug (read-only in edit) -->
        <div
          class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dash-border px-3 py-2"
        >
          <Link2 :size="12" class="text-dash-faint shrink-0" />
          <span class="text-2xs text-dash-muted">aromashop.ly/products/</span>
          <span class="text-2xs font-medium text-dash-text font-mono">{{ form.slug }}</span>
          <span class="ml-auto text-2xs text-dash-faint">URL slug (fixed)</span>
        </div>

        <!-- Classification -->
        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2.5">{{ t('products.columns.brand') }} / {{ t('products.columns.category') }}</p>
          <div class="grid grid-cols-3 gap-3">
            <ASelect v-model="form.brand_id"    :label="t('products.columns.brand')"    :options="brandOptions"    :placeholder="t('productCreate.chooseBrand')"    :error="formErrors.brand_id" />
            <ASelect v-model="form.category_id" :label="t('products.columns.category')" :options="categoryOptions" :placeholder="t('productCreate.chooseCategory')" :error="formErrors.category_id" />
            <ASelect v-model="form.type"         :label="t('products.typeLabel')"         :options="typeOptions"      :placeholder="t('productCreate.chooseType')"     :error="formErrors.type" />
          </div>
        </div>

        <!-- Description -->
        <ATextarea v-model="form.description" :label="t('products.descriptionLabel')" rows="3" />

        <!-- Status flags -->
        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2.5">{{ t('products.statusSection') }}</p>
          <div class="flex gap-1.5">
            <label
              v-for="flag in flags"
              :key="flag.key"
              class="flex items-center gap-2 px-3 py-2 rounded-btn border cursor-pointer transition-all duration-150 text-xs font-medium"
              :class="form[flag.key]
                ? 'bg-dash-secondary/10 border-dash-secondary/30 text-dash-secondary'
                : 'bg-dash-bg border-dash-border text-dash-muted hover:border-dash-muted/60 hover:text-dash-text'"
            >
              <input type="checkbox" v-model="form[flag.key]" class="sr-only" />
              <Check v-if="form[flag.key]" :size="11" stroke-width="2.5" />
              {{ flag.label }}
            </label>
          </div>
        </div>

        <!-- Card color -->
        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2.5">{{ t('products.cardColorSection') }}</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-2xs text-dash-muted mb-1.5">{{ t('products.bgLabel') }}</p>
              <div class="flex items-center gap-2">
                <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border shrink-0">
                  <input
                    type="color"
                    v-model="form.placeholder_bg"
                    class="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  />
                  <div class="w-full h-full" :style="{ backgroundColor: form.placeholder_bg }" />
                </div>
                <input
                  type="text"
                  v-model="form.placeholder_bg"
                  maxlength="7"
                  class="flex-1 min-w-0 rounded-btn border border-dash-border bg-dash-bg px-2.5 py-1.5
                         text-xs font-mono text-dash-text focus:outline-none focus:border-dash-primary"
                />
              </div>
            </div>
            <div>
              <p class="text-2xs text-dash-muted mb-1.5">{{ t('products.accentLabel') }}</p>
              <div class="flex items-center gap-2">
                <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border shrink-0">
                  <input
                    type="color"
                    v-model="form.placeholder_dot"
                    class="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  />
                  <div class="w-full h-full" :style="{ backgroundColor: form.placeholder_dot }" />
                </div>
                <input
                  type="text"
                  v-model="form.placeholder_dot"
                  maxlength="7"
                  class="flex-1 min-w-0 rounded-btn border border-dash-border bg-dash-bg px-2.5 py-1.5
                         text-xs font-mono text-dash-text focus:outline-none focus:border-dash-primary"
                />
              </div>
            </div>
          </div>
          <!-- Preview -->
          <div
            class="mt-3 rounded-btn h-10 flex items-center justify-center gap-2"
            :style="{ backgroundColor: form.placeholder_bg }"
          >
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: form.placeholder_dot }" />
            <span class="text-2xs font-medium" :style="{ color: form.placeholder_dot }">{{ t('products.preview') }}</span>
          </div>
        </div>

        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">{{ t('common.cancel') }}</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? t('products.saveChanges') : t('products.addProduct') }}</AButton>
      </template>
    </AModal>

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
import { Plus, Package, ImageOff, Link2, Check } from 'lucide-vue-next'
import { usePagination } from '../composables/usePagination'
import {
  apiGetProducts, apiUpdateProduct, apiDeleteProduct,
  apiGetBrands, apiGetCategories,
} from '../api/admin'
import type { AdminProduct, AdminBrand, AdminCategory, ProductType } from '../types'
import ATable          from '../components/ui/ATable.vue'
import AButton         from '../components/ui/AButton.vue'
import AInput          from '../components/ui/AInput.vue'
import ASelect         from '../components/ui/ASelect.vue'
import ATextarea       from '../components/ui/ATextarea.vue'
import AModal          from '../components/ui/AModal.vue'
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
const modalOpen       = ref(false)
const editing         = ref<AdminProduct | null>(null)
const saving          = ref(false)
const deletingProduct = ref<AdminProduct | null>(null)
const deleting        = ref(false)
const formErrors      = ref<Record<string, string>>({})

const emptyForm = () => ({
  slug: '', name: '', name_en: '', brand_id: '', category_id: '',
  type: '', description: '',
  is_new: false as boolean, is_bestseller: false as boolean, is_offer: false as boolean,
  placeholder_bg: '#F2E8E5', placeholder_dot: '#C9A0A0',
})
const form = ref(emptyForm())

const flags = [
  { key: 'is_new'        as const, label: t('products.newArrival') },
  { key: 'is_bestseller' as const, label: t('products.bestseller')  },
  { key: 'is_offer'      as const, label: t('products.onOffer')    },
]

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

function openCreate() {
  editing.value  = null
  form.value     = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(p: AdminProduct) {
  editing.value = p
  form.value = {
    slug:        p.slug,
    name:        p.name,
    name_en:     p.nameEn ?? '',
    brand_id:    p.brandId,
    category_id: p.categoryId,
    type:        p.type,
    description: '',
    is_new:        p.isNew,
    is_bestseller: p.isBestseller,
    is_offer:      p.isOffer,
    placeholder_bg:  p.placeholderBg  || '#F2E8E5',
    placeholder_dot: p.placeholderDot || '#C9A0A0',
  }
  formErrors.value = {}
  modalOpen.value  = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.name)        { formErrors.value.name        = t('common.nameRequired');     return }
  if (!form.value.brand_id)    { formErrors.value.brand_id    = t('common.selectBrand');       return }
  if (!form.value.category_id) { formErrors.value.category_id = t('common.selectCategory');    return }
  if (!form.value.type)        { formErrors.value.type        = t('common.selectType');         return }

  saving.value = true
  try {
    if (editing.value) {
      await apiUpdateProduct(editing.value.id, {
        name:        form.value.name,
        name_en:     form.value.name_en     || undefined,
        brand_id:    form.value.brand_id,
        category_id: form.value.category_id,
        type:        form.value.type,
        description:     form.value.description || undefined,
        placeholder_bg:  form.value.placeholder_bg,
        placeholder_dot: form.value.placeholder_dot,
        is_new:        form.value.is_new,
        is_bestseller: form.value.is_bestseller,
        is_offer:      form.value.is_offer,
      })
    }
    modalOpen.value = false
    fetch(1)
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : t('common.saveFailed')
  } finally {
    saving.value = false
  }
}

function confirmDelete(p: AdminProduct) { deletingProduct.value = p }

async function handleDelete() {
  if (!deletingProduct.value) return
  deleting.value = true
  try {
    await apiDeleteProduct(deletingProduct.value.id)
    deletingProduct.value = null
    fetch(1)
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : t('common.deleteFailed')
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

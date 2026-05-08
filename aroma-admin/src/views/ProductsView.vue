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
        <AInput v-model="priceMin" label="Price Min (LYD)" type="number" placeholder="0" @input="debouncedFetch" />
        <AInput v-model="priceMax" label="Price Max (LYD)" type="number" placeholder="Any" @input="debouncedFetch" />
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
        <div class="flex gap-1.5 justify-end">
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
    <AModal :open="modalOpen" :title="editing ? t('products.editProduct') : t('products.addProduct')" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.name"    :label="t('products.nameArabic')" :error="formErrors.name" required />
          <AInput v-model="form.name_en" :label="t('products.nameEnglish')" />
        </div>
        <AInput v-model="form.slug" :label="t('products.slugLabel')" :disabled="!!editing" :error="formErrors.slug" />
        <div class="grid grid-cols-2 gap-3">
          <ASelect v-model="form.brand_id"    :label="t('products.columns.brand')"    :options="brandOptions"    :placeholder="t('productCreate.chooseBrand')"    :error="formErrors.brand_id" />
          <ASelect v-model="form.category_id" :label="t('products.columns.category')" :options="categoryOptions" :placeholder="t('productCreate.chooseCategory')" :error="formErrors.category_id" />
        </div>
        <ASelect v-model="form.type" :label="t('products.typeLabel')" :options="typeOptions" :placeholder="t('productCreate.chooseType')" :error="formErrors.type" />
        <ATextarea v-model="form.description" :label="t('products.descriptionLabel')" />
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.placeholder_bg"  :label="t('products.placeholderBg')"  placeholder="#F2E8E5" />
          <AInput v-model="form.placeholder_dot" :label="t('products.placeholderDot')" placeholder="#C9A0A0" />
        </div>
        <div class="flex gap-4 text-xs text-dash-text pt-1">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_new" class="rounded" /> {{ t('products.newArrival') }}
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_bestseller" class="rounded" /> {{ t('products.bestseller') }}
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_offer" class="rounded" /> {{ t('products.onOffer') }}
          </label>
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
import { Plus, Package, ImageOff } from 'lucide-vue-next'
import { usePagination } from '../composables/usePagination'
import {
  apiGetProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct,
  apiGetBrands, apiGetCategories,
} from '../api/admin'
import type { AdminProduct, AdminBrand, AdminCategory } from '../types'
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
const formErrors      = ref<Record<string,string>>({})

const emptyForm = () => ({
  slug: '', name: '', name_en: '', brand_id: '', category_id: '',
  type: '', description: '', placeholder_bg: '', placeholder_dot: '',
  is_new: false, is_bestseller: false, is_offer: false,
})
const form = ref(emptyForm())

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
    type:        filterType.value  || undefined,
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
  editing.value = null
  form.value = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(p: AdminProduct) {
  editing.value = p
  form.value = {
    slug: p.slug, name: p.name, name_en: p.nameEn ?? '',
    brand_id: p.brandId, category_id: p.categoryId,
    type: p.type, description: '', placeholder_bg: '', placeholder_dot: '',
    is_new: p.isNew, is_bestseller: p.isBestseller, is_offer: p.isOffer,
  }
  formErrors.value = {}
  modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.name)        { formErrors.value.name = 'Name is required'; return }
  if (!form.value.slug && !editing.value)  { formErrors.value.slug = 'Slug is required'; return }
  if (!form.value.brand_id)    { formErrors.value.brand_id = 'Select a brand'; return }
  if (!form.value.category_id) { formErrors.value.category_id = 'Select a category'; return }
  if (!form.value.type)        { formErrors.value.type = 'Select a type'; return }

  saving.value = true
  try {
    if (editing.value) {
      await apiUpdateProduct(editing.value.id, form.value)
    } else {
      await apiCreateProduct(form.value)
    }
    modalOpen.value = false
    fetch(1)
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
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
    formErrors.value.general = e instanceof Error ? e.message : 'Delete failed.'
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
    // dropdowns stay empty; user can retry by reopening modal
  }
})

onUnmounted(() => clearTimeout(debounceTimer))
</script>

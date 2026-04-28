<!-- aroma-admin/src/views/ProductsView.vue -->
<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex gap-2 flex-1">
        <AInput v-model="search" placeholder="Search products…" class="w-56" @input="debouncedFetch" />
      </div>
      <AButton @click="openCreate" size="sm">
        <Plus :size="14" /> Add Product
      </AButton>
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
        <span v-else class="text-dash-faint">No variants</span>
      </template>
      <template #cell-isNew="{ value }"><span v-if="value" class="text-[10px] text-dash-secondary bg-dash-secondary-lt rounded-full px-2 py-0.5">New</span></template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <RouterLink :to="`/products/${(row as AdminProduct).id}/variants`">
            <AButton size="sm" variant="ghost">Variants ({{ (row as AdminProduct).variantCount }})</AButton>
          </RouterLink>
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminProduct)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminProduct)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Package" heading="No products" sub="Add your first product to get started">
          <template #action><AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Product</AButton></template>
        </AEmptyState>
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />

    <!-- Create / Edit modal -->
    <AModal :open="modalOpen" :title="editing ? 'Edit Product' : 'Add Product'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.name"    label="Name (Arabic)" :error="formErrors.name" required />
          <AInput v-model="form.name_en" label="Name (English)" />
        </div>
        <AInput v-model="form.slug" label="Slug (URL-safe)" :disabled="!!editing" :error="formErrors.slug" />
        <div class="grid grid-cols-2 gap-3">
          <ASelect v-model="form.brand_id"    label="Brand"    :options="brandOptions"    placeholder="Choose brand…"    :error="formErrors.brand_id" />
          <ASelect v-model="form.category_id" label="Category" :options="categoryOptions" placeholder="Choose category…" :error="formErrors.category_id" />
        </div>
        <ASelect v-model="form.type" label="Type" :options="typeOptions" placeholder="Choose type…" :error="formErrors.type" />
        <ATextarea v-model="form.description" label="Description" />
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.placeholder_bg"  label="Placeholder BG color"  placeholder="#F2E8E5" />
          <AInput v-model="form.placeholder_dot" label="Placeholder dot color" placeholder="#C9A0A0" />
        </div>
        <div class="flex gap-4 text-xs text-dash-text pt-1">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_new" class="rounded" /> New arrival
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_bestseller" class="rounded" /> Bestseller
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_offer" class="rounded" /> On offer
          </label>
        </div>
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save Changes' : 'Add Product' }}</AButton>
      </template>
    </AModal>

    <!-- Delete confirmation -->
    <AConfirmDialog
      :open="!!deletingProduct"
      title="Delete product?"
      :message="`Delete &quot;${deletingProduct?.name}&quot;? This cannot be undone.`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingProduct = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
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

const search  = ref('')
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
const brandOptions    = computed(() => brands.value.map(b => ({ value: String(b.id), label: b.name })))
const categoryOptions = computed(() => cats.value.map(c => ({ value: String(c.id), label: c.label })))

const cols = [
  { key: 'name',        label: 'Name' },
  { key: 'brand',       label: 'Brand' },
  { key: 'category',    label: 'Category' },
  { key: 'type',        label: 'Type' },
  { key: 'price',       label: 'Price' },
  { key: 'isNew',       label: 'Flags' },
  { key: 'variantCount',label: 'Variants' },
]

const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetProducts({ search: search.value || undefined, page }).then(r => r.data),
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

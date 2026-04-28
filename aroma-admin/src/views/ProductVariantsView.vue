<template>
  <div class="space-y-6 max-w-4xl">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs">
      <RouterLink to="/products" class="text-dash-faint hover:text-dash-text transition-colors">Products</RouterLink>
      <span class="text-dash-border">/</span>
      <span class="text-dash-text font-medium">Variants &amp; Images</span>
    </div>

    <!-- Error -->
    <div v-if="loadError" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <!-- ── Images section ─────────────────────────────── -->
    <div class="bg-dash-surface rounded-card shadow-card p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">Images</h2>
          <p class="text-2xs text-dash-muted mt-0.5">Click any image to set it as the thumbnail</p>
        </div>
        <label class="cursor-pointer">
          <input type="file" accept="image/*" multiple class="sr-only" @change="handleUpload" :disabled="uploading" />
          <span
            :class="[
              'inline-flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium transition-all duration-200',
              uploading
                ? 'bg-dash-border text-dash-faint cursor-not-allowed'
                : 'bg-dash-secondary text-white hover:bg-dash-secondary-dk shadow-sm cursor-pointer',
            ]"
          >
            <span v-if="uploading" class="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
            <ImagePlus v-else :size="14" />
            Upload images
          </span>
        </label>
      </div>

      <!-- Image grid -->
      <div v-if="imagesLoading" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div v-for="i in 4" :key="i" class="aspect-square rounded-xl bg-dash-border animate-pulse" />
      </div>

      <div v-else-if="images.length" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div
          v-for="img in images"
          :key="img.id"
          class="group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer"
          :class="img.isThumbnail
            ? 'border-dash-primary shadow-card'
            : 'border-dash-border hover:border-dash-primary/40'"
          @click="setThumbnail(img)"
        >
          <img :src="img.url" :alt="img.originalName ?? 'Product image'" class="h-full w-full object-cover" />

          <!-- Thumbnail badge -->
          <div v-if="img.isThumbnail" class="absolute top-1.5 left-1.5 bg-dash-primary text-white text-2xs font-semibold rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <Star :size="9" />
            Thumbnail
          </div>

          <!-- Delete button (appears on hover) -->
          <button
            class="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-lg bg-dash-text/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dash-danger"
            @click.stop="deleteImage(img)"
          >
            <X :size="11" />
          </button>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-10 text-center">
        <div class="h-12 w-12 rounded-2xl bg-dash-border flex items-center justify-center text-dash-faint mb-3">
          <ImageOff :size="22" />
        </div>
        <p class="text-sm font-medium text-dash-text">No images yet</p>
        <p class="text-2xs text-dash-faint mt-1">Upload images using the button above</p>
      </div>
    </div>

    <!-- ── Variants section ───────────────────────────── -->
    <div class="bg-dash-surface rounded-card shadow-card p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">Variants</h2>
          <p class="text-2xs text-dash-muted mt-0.5">Size, price, and stock per variant</p>
        </div>
        <AButton size="sm" @click="openCreate">
          <Plus :size="14" /> Add Variant
        </AButton>
      </div>

      <ATable :columns="cols" :rows="variants" :loading="variantsLoading">
        <template #cell-stock="{ value }">
          <ABadge :status="typeof value === 'string' ? value : ''" />
        </template>
        <template #cell-price="{ value }">{{ Number(value).toFixed(2) }} LYD</template>
        <template #cell-originalPrice="{ value }">
          <span v-if="value">{{ Number(value).toFixed(2) }} LYD</span>
          <span v-else class="text-dash-faint">—</span>
        </template>
        <template #cell-quantity="{ value, row }">
          <span :class="getQtyClass(row as ProductVariant)">{{ value }}</span>
        </template>
        <template #cell-isDefault="{ value }">
          <span v-if="value" class="inline-flex items-center gap-1 text-2xs font-semibold text-dash-primary bg-dash-primary/10 rounded px-1.5 py-0.5">
            <Star :size="10" /> Default
          </span>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-1.5 justify-end">
            <AButton v-if="!(row as ProductVariant).isDefault" size="sm" variant="ghost" @click.stop="setDefault(row as ProductVariant)" :loading="settingDefault === (row as ProductVariant).id">Default</AButton>
            <AButton size="sm" variant="ghost" @click.stop="openEdit(row as ProductVariant)">Edit</AButton>
            <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as ProductVariant)">Delete</AButton>
          </div>
        </template>
        <template #empty>
          <AEmptyState :icon="Package" heading="No variants" sub="Add size and price options for this product" />
        </template>
      </ATable>
    </div>

    <!-- Variant create/edit modal -->
    <AModal :open="modalOpen" :title="editing ? 'Edit Variant' : 'Add Variant'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-model="form.size"           label="Size (ml)" type="number" min="1" :error="formErrors.size" />
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.price"          label="Price (LYD)" type="number" step="0.01" :error="formErrors.price" />
          <AInput v-model="form.original_price" label="Original price (LYD)" type="number" step="0.01" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.quantity"            label="Quantity in stock" type="number" min="0" :error="formErrors.quantity" />
          <AInput v-model="form.low_stock_threshold" label="Low stock threshold" type="number" min="0" :error="formErrors.low_stock_threshold" />
        </div>
        <!-- Live stock preview -->
        <div class="flex items-center gap-2 text-2xs text-dash-muted pt-0.5">
          <span>Stock status will be:</span>
          <ABadge :status="previewStock" />
        </div>
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Add' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingVariant"
      title="Delete variant?"
      message="This size/price option will be permanently removed."
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingVariant = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Package, ImagePlus, ImageOff, Star, X } from 'lucide-vue-next'
import {
  apiGetVariants, apiCreateVariant, apiUpdateVariant, apiDeleteVariant, apiSetDefaultVariant,
  apiGetImages, apiUploadImages, apiSetThumbnail, apiDeleteImage,
} from '../api/admin'
import type { ProductVariant, ProductImage } from '../types'
import ATable         from '../components/ui/ATable.vue'
import ABadge         from '../components/ui/ABadge.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const props     = defineProps<{ id: string }>()
const productId = Number(props.id)

// ── Images ────────────────────────────────────────────────
const images       = ref<ProductImage[]>([])
const imagesLoading = ref(true)
const uploading    = ref(false)

async function loadImages() {
  imagesLoading.value = true
  try {
    const res = await apiGetImages(productId)
    images.value = res.data
  } catch { /* show empty state */ }
  finally { imagesLoading.value = false }
}

async function handleUpload(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  uploading.value = true
  try {
    const res = await apiUploadImages(productId, files)
    images.value = [...images.value, ...res.data]
    // If this is the first batch, mark first as thumbnail in local state
    if (images.value.length === res.data.length) {
      images.value[0] = { ...images.value[0], isThumbnail: true }
    }
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Upload failed.'
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function setThumbnail(img: ProductImage) {
  if (img.isThumbnail) return
  try {
    await apiSetThumbnail(productId, img.id)
    images.value = images.value.map(i => ({ ...i, isThumbnail: i.id === img.id }))
  } catch { /* ignore */ }
}

async function deleteImage(img: ProductImage) {
  try {
    await apiDeleteImage(productId, img.id)
    images.value = images.value.filter(i => i.id !== img.id)
    // If deleted was thumbnail, promote first remaining
    if (img.isThumbnail && images.value.length) {
      images.value[0] = { ...images.value[0], isThumbnail: true }
    }
  } catch { /* ignore */ }
}

// ── Variants ──────────────────────────────────────────────
const variants        = ref<ProductVariant[]>([])
const variantsLoading = ref(true)
const loadError       = ref<string | null>(null)
const modalOpen       = ref(false)
const editing         = ref<ProductVariant | null>(null)
const saving          = ref(false)
const deletingVariant = ref<ProductVariant | null>(null)
const deleting        = ref(false)
const formErrors      = ref<Record<string, string>>({})

const emptyForm = () => ({
  size: '', price: '', original_price: '',
  quantity: '0', low_stock_threshold: '5',
})
const form = ref(emptyForm())

const cols = [
  { key: 'size',          label: 'Size (ml)' },
  { key: 'price',         label: 'Price' },
  { key: 'originalPrice', label: 'Original' },
  { key: 'quantity',      label: 'Qty' },
  { key: 'stock',         label: 'Status' },
  { key: 'isDefault',     label: '' },
]

const previewStock = computed(() => {
  const qty       = Number(form.value.quantity) || 0
  const threshold = Number(form.value.low_stock_threshold) || 5
  if (qty === 0)           return 'out_of_stock'
  if (qty <= threshold)    return 'low_stock'
  return 'in_stock'
})

function getQtyClass(v: ProductVariant) {
  if (v.stock === 'out_of_stock') return 'text-dash-danger font-medium'
  if (v.stock === 'low_stock')    return 'text-dash-orange font-medium'
  return 'text-dash-text'
}

async function loadVariants() {
  if (!productId || isNaN(productId)) return
  variantsLoading.value = true
  loadError.value = null
  try {
    const res = await apiGetVariants(productId)
    variants.value = res.data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load variants.'
  } finally {
    variantsLoading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(v: ProductVariant) {
  editing.value = v
  form.value = {
    size:                String(v.size),
    price:               String(v.price),
    original_price:      v.originalPrice != null ? String(v.originalPrice) : '',
    quantity:            String(v.quantity),
    low_stock_threshold: String(v.lowStockThreshold),
  }
  formErrors.value = {}
  modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.size)  { formErrors.value.size     = 'Size is required';     return }
  if (!form.value.price) { formErrors.value.price    = 'Price is required';    return }
  if (form.value.quantity === '') { formErrors.value.quantity = 'Quantity is required'; return }

  const payload = {
    size:                Number(form.value.size),
    price:               Number(form.value.price),
    original_price:      form.value.original_price ? Number(form.value.original_price) : null,
    quantity:            Number(form.value.quantity),
    low_stock_threshold: Number(form.value.low_stock_threshold),
  }

  saving.value = true
  try {
    if (editing.value) {
      await apiUpdateVariant(productId, editing.value.id, payload)
    } else {
      await apiCreateVariant(productId, payload)
    }
    modalOpen.value = false
    loadVariants()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

const settingDefault = ref<number | null>(null)

async function setDefault(v: ProductVariant) {
  settingDefault.value = v.id
  try {
    await apiSetDefaultVariant(productId, v.id)
    variants.value = variants.value.map(x => ({ ...x, isDefault: x.id === v.id }))
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to set default.'
  } finally {
    settingDefault.value = null
  }
}

function confirmDelete(v: ProductVariant) { deletingVariant.value = v }

async function handleDelete() {
  if (!deletingVariant.value) return
  deleting.value = true
  try {
    await apiDeleteVariant(productId, deletingVariant.value.id)
    deletingVariant.value = null
    loadVariants()
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Delete failed.'
  } finally {
    deleting.value = false
  }
}

onMounted(() => { loadImages(); loadVariants() })
watch(() => props.id, () => { loadImages(); loadVariants() })
</script>

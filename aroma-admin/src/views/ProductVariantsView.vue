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

    <!-- ── Images ──────────────────────────────────── -->
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

      <div v-if="imagesLoading" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div v-for="i in 4" :key="i" class="aspect-square rounded-xl bg-dash-border animate-pulse" />
      </div>

      <div v-else-if="images.length" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div
          v-for="img in images"
          :key="img.id"
          class="group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer"
          :class="img.isThumbnail ? 'border-dash-primary shadow-card' : 'border-dash-border hover:border-dash-primary/40'"
          @click="setThumbnail(img)"
        >
          <img :src="img.url" :alt="img.originalName ?? 'Product image'" class="h-full w-full object-cover" />
          <div v-if="img.isThumbnail" class="absolute top-1.5 left-1.5 bg-dash-primary text-white text-2xs font-semibold rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <Star :size="9" /> Thumbnail
          </div>
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

    <!-- ── Specs ───────────────────────────────────── -->
    <div class="bg-dash-surface rounded-card shadow-card p-5 space-y-5">
      <div>
        <h2 class="text-sm font-semibold text-dash-text">Specs</h2>
        <p class="text-2xs text-dash-muted mt-0.5">Define what varies between variants (e.g. Size, Color). Leave empty for a single-variant product.</p>
      </div>

      <!-- Step 1: Assign specs -->
      <div>
        <p class="text-xs font-medium text-dash-text mb-2">Assign Specs</p>
        <div class="flex gap-2">
          <select
            v-model="specToAdd"
            class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary"
          >
            <option value="">Add a spec type…</option>
            <option
              v-for="s in availableSpecTypes"
              :key="s.id"
              :value="s.id"
            >{{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}</option>
          </select>
          <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">Add</AButton>
        </div>

        <!-- Assigned spec chips -->
        <div v-if="assignedSpecs.length" class="mt-3 space-y-2">
          <div
            v-for="(spec, idx) in assignedSpecs"
            :key="spec.spec_type_id"
            class="flex items-center gap-2 px-3 py-2 rounded-btn border border-dash-border bg-dash-bg"
          >
            <span class="text-xs font-medium text-dash-text flex-1">
              {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
            </span>
            <button
              :disabled="idx === 0"
              class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30"
              @click="moveSpec(idx, -1)"
            ><ChevronUp :size="12" /></button>
            <button
              :disabled="idx === assignedSpecs.length - 1"
              class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30"
              @click="moveSpec(idx, 1)"
            ><ChevronDown :size="12" /></button>
            <button
              class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger"
              @click="removeSpec(idx)"
            ><X :size="12" /></button>
          </div>
        </div>
      </div>

      <!-- Step 2: Define values -->
      <div v-if="assignedSpecs.length">
        <p class="text-xs font-medium text-dash-text mb-3">Define Values</p>
        <div class="space-y-4">
          <div v-for="spec in assignedSpecs" :key="spec.spec_type_id">
            <p class="text-2xs font-semibold text-dash-muted mb-1.5 uppercase tracking-wide">
              {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
            </p>
            <!-- Tag chips -->
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="(val, vi) in spec.values"
                :key="vi"
                class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-bg px-2.5 py-1 text-xs font-medium text-dash-text"
              >
                {{ val }}{{ spec.unit ? spec.unit : '' }}
                <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5">
                  <X :size="10" />
                </button>
              </span>
            </div>
            <!-- Add value input -->
            <div class="flex gap-2">
              <input
                v-model="valueInputs[spec.spec_type_id]"
                type="text"
                :placeholder="`Add ${spec.name} value…`"
                class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary"
                @keydown.enter.prevent="addValue(spec)"
              />
              <AButton size="sm" variant="secondary" @click="addValue(spec)">Add</AButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Save + Generate row -->
      <div class="flex items-center gap-3 pt-1">
        <AButton size="sm" variant="secondary" :loading="savingSpecs" @click="saveSpecs">
          <Save :size="13" /> Save Specs &amp; Values
        </AButton>
        <AButton size="sm" :loading="generating" @click="clickGenerate">
          <Zap :size="13" /> Generate Variants
          <span v-if="assignedSpecs.length && combinationCount > 0" class="ml-1 text-2xs opacity-80">({{ combinationCount }})</span>
        </AButton>
      </div>
    </div>

    <!-- ── Variants ────────────────────────────────── -->
    <div class="bg-dash-surface rounded-card shadow-card p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">Variants</h2>
          <p class="text-2xs text-dash-muted mt-0.5">Price and stock per variant</p>
        </div>
      </div>

      <ATable :columns="cols" :rows="variants" :loading="variantsLoading">
        <template #cell-label="{ row }">
          <span class="text-xs font-medium text-dash-text">{{ variantLabel(row as ProductVariant) }}</span>
        </template>
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
            <AButton size="sm" variant="danger" @click.stop="confirmDeleteVariant(row as ProductVariant)">Delete</AButton>
          </div>
        </template>
        <template #empty>
          <AEmptyState :icon="Package" heading="No variants" sub="Save your specs and click Generate Variants" />
        </template>
      </ATable>
    </div>

    <!-- Edit variant modal -->
    <AModal :open="modalOpen" title="Edit Variant" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <!-- Spec label read-only -->
        <div v-if="editing && variantLabel(editing)" class="rounded-btn bg-dash-bg border border-dash-border px-3 py-2 text-xs font-medium text-dash-text">
          {{ variantLabel(editing) }}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.price"          label="Price (LYD)" type="number" step="0.01" :error="formErrors.price" />
          <AInput v-model="form.original_price" label="Original price (LYD)" type="number" step="0.01" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.quantity"            label="Quantity in stock" type="number" min="0" :error="formErrors.quantity" />
          <AInput v-model="form.low_stock_threshold" label="Low stock threshold" type="number" min="0" />
        </div>
        <div class="flex items-center gap-2 text-2xs text-dash-muted pt-0.5">
          <span>Stock status will be:</span>
          <ABadge :status="previewStock" />
        </div>
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">Save</AButton>
      </template>
    </AModal>

    <!-- Confirm generate when variants exist -->
    <AConfirmDialog
      :open="showGenerateConfirm"
      title="Regenerate variants?"
      :message="`This will permanently delete ${variants.length} existing variant${variants.length !== 1 ? 's' : ''} and regenerate from your current spec values. Continue?`"
      :loading="generating"
      @confirm="doGenerate(true)"
      @cancel="showGenerateConfirm = false"
    />

    <!-- Confirm delete variant -->
    <AConfirmDialog
      :open="!!deletingVariant"
      title="Delete variant?"
      message="This variant will be permanently removed."
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingVariant = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Package, ImagePlus, ImageOff, Star, X, ChevronUp, ChevronDown, Save, Zap } from 'lucide-vue-next'
import {
  apiGetVariants, apiUpdateVariant, apiDeleteVariant, apiSetDefaultVariant,
  apiGetImages, apiUploadImages, apiSetThumbnail, apiDeleteImage,
  apiGetSpecTypes, apiGetProductSpecs, apiSaveProductSpecs, apiGenerateVariants,
} from '../api/admin'
import type { ProductVariant, ProductImage, SpecType, ProductSpec } from '../types'
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
const images        = ref<ProductImage[]>([])
const imagesLoading = ref(true)
const uploading     = ref(false)
const loadError     = ref<string | null>(null)

async function loadImages() {
  imagesLoading.value = true
  try {
    const res = await apiGetImages(productId)
    images.value = res.data
  } catch { /* show empty state */ } finally {
    imagesLoading.value = false
  }
}

async function handleUpload(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  uploading.value = true
  try {
    const res = await apiUploadImages(productId, files)
    images.value = [...images.value, ...res.data]
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
    if (img.isThumbnail && images.value.length) {
      images.value[0] = { ...images.value[0], isThumbnail: true }
    }
  } catch { /* ignore */ }
}

// ── Specs ─────────────────────────────────────────────────
const allSpecTypes  = ref<SpecType[]>([])
const assignedSpecs = ref<Array<{ spec_type_id: number; name: string; unit: string | null; values: string[] }>>([])
const specToAdd     = ref<number | ''>('')
const valueInputs   = ref<Record<number, string>>({})
const savingSpecs   = ref(false)

const availableSpecTypes = computed(() =>
  allSpecTypes.value.filter(s => !assignedSpecs.value.some(a => a.spec_type_id === s.id))
)

const combinationCount = computed(() => {
  if (!assignedSpecs.value.length) return 1
  return assignedSpecs.value.reduce((acc, s) => acc * (s.values.length || 1), 1)
})

async function loadSpecs() {
  try {
    const [typesRes, specsRes] = await Promise.all([
      apiGetSpecTypes(),
      apiGetProductSpecs(productId),
    ])
    allSpecTypes.value = typesRes.data
    assignedSpecs.value = specsRes.data.specs.map((s: ProductSpec) => ({
      spec_type_id: s.spec_type_id,
      name:         s.name,
      unit:         s.unit,
      values:       s.values.map(v => v.value),
    }))
    assignedSpecs.value.forEach(s => { valueInputs.value[s.spec_type_id] = '' })
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load specs.'
  }
}

function addSpec() {
  if (!specToAdd.value) return
  const spec = allSpecTypes.value.find(s => s.id === specToAdd.value)
  if (!spec) return
  assignedSpecs.value.push({ spec_type_id: spec.id, name: spec.name, unit: spec.unit, values: [] })
  valueInputs.value[spec.id] = ''
  specToAdd.value = ''
}

function removeSpec(idx: number) {
  const removed = assignedSpecs.value[idx]
  delete valueInputs.value[removed.spec_type_id]
  assignedSpecs.value.splice(idx, 1)
}

function moveSpec(idx: number, dir: -1 | 1) {
  const arr = assignedSpecs.value
  const to  = idx + dir
  if (to < 0 || to >= arr.length) return
  ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
}

function addValue(spec: { spec_type_id: number; values: string[] }) {
  const val = (valueInputs.value[spec.spec_type_id] ?? '').trim()
  if (!val || spec.values.includes(val)) return
  spec.values.push(val)
  valueInputs.value[spec.spec_type_id] = ''
}

function removeValue(spec: { values: string[] }, idx: number) {
  spec.values.splice(idx, 1)
}

async function saveSpecs() {
  savingSpecs.value = true
  try {
    loadError.value = null
    await apiSaveProductSpecs(
      productId,
      assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
    )
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to save specs.'
  } finally {
    savingSpecs.value = false
  }
}

// ── Generate ──────────────────────────────────────────────
const showGenerateConfirm = ref(false)
const generating          = ref(false)

function clickGenerate() {
  if (variants.value.length > 0) {
    showGenerateConfirm.value = true
  } else {
    doGenerate(false)
  }
}

async function doGenerate(force: boolean) {
  generating.value = true
  showGenerateConfirm.value = false
  try {
    loadError.value = null
    await apiSaveProductSpecs(
      productId,
      assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
    )
    const res = await apiGenerateVariants(productId, force)
    variants.value = res.data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Generation failed.'
  } finally {
    generating.value = false
  }
}

// ── Variants ──────────────────────────────────────────────
const variants        = ref<ProductVariant[]>([])
const variantsLoading = ref(true)
const modalOpen       = ref(false)
const editing         = ref<ProductVariant | null>(null)
const saving          = ref(false)
const deletingVariant = ref<ProductVariant | null>(null)
const deleting        = ref(false)
const formErrors      = ref<Record<string, string>>({})
const settingDefault  = ref<number | null>(null)

const emptyForm = () => ({ price: '', original_price: '', quantity: '0', low_stock_threshold: '5' })
const form = ref(emptyForm())

const cols = [
  { key: 'label',         label: 'Variant' },
  { key: 'price',         label: 'Price' },
  { key: 'originalPrice', label: 'Original' },
  { key: 'quantity',      label: 'Qty' },
  { key: 'stock',         label: 'Status' },
  { key: 'isDefault',     label: '' },
]

const previewStock = computed(() => {
  const qty       = Number(form.value.quantity) || 0
  const threshold = Number(form.value.low_stock_threshold) || 5
  if (qty === 0)        return 'out_of_stock'
  if (qty <= threshold) return 'low_stock'
  return 'in_stock'
})

function variantLabel(v: ProductVariant): string {
  if (!v.specs || v.specs.length === 0) return 'Default'
  return v.specs.map(s => s.unit ? `${s.value}${s.unit}` : s.value).join(' / ')
}

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

function openEdit(v: ProductVariant) {
  editing.value = v
  form.value = {
    price:               String(v.price),
    original_price:      v.originalPrice != null ? String(v.originalPrice) : '',
    quantity:            String(v.quantity),
    low_stock_threshold: String(v.lowStockThreshold),
  }
  formErrors.value = {}
  modalOpen.value  = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.price)    { formErrors.value.price    = 'Price is required'; return }
  if (form.value.quantity === '') { formErrors.value.quantity = 'Quantity is required'; return }

  const payload = {
    price:               Number(form.value.price),
    original_price:      form.value.original_price ? Number(form.value.original_price) : null,
    quantity:            Number(form.value.quantity),
    low_stock_threshold: Number(form.value.low_stock_threshold),
  }

  saving.value = true
  try {
    if (editing.value) {
      const res = await apiUpdateVariant(productId, editing.value.id, payload)
      variants.value = variants.value.map(v => v.id === editing.value!.id ? res.data : v)
    }
    modalOpen.value = false
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

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

function confirmDeleteVariant(v: ProductVariant) { deletingVariant.value = v }

async function handleDelete() {
  if (!deletingVariant.value) return
  deleting.value = true
  try {
    await apiDeleteVariant(productId, deletingVariant.value.id)
    variants.value = variants.value.filter(v => v.id !== deletingVariant.value!.id)
    deletingVariant.value = null
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Delete failed.'
  } finally {
    deleting.value = false
  }
}

onMounted(() => { loadImages(); loadSpecs(); loadVariants() })
watch(() => props.id, () => { loadImages(); loadSpecs(); loadVariants() })
</script>

<template>
  <div class="min-h-full animate-fade-up">

    <!-- ── Sticky page header ─────────────────────────────────────── -->
    <div class="sticky top-0 z-10 bg-dash-bg border-b border-dash-border -mx-6 px-6 py-3 mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <RouterLink
          to="/products"
          class="flex items-center justify-center w-7 h-7 rounded-btn text-dash-muted hover:text-dash-text hover:bg-dash-surface border border-dash-border transition-all duration-150"
        >
          <ChevronLeft :size="14" />
        </RouterLink>
        <div>
          <p class="text-2xs text-dash-muted leading-none mb-0.5">Products</p>
          <h1 class="text-sm font-semibold text-dash-text leading-none">New Product</h1>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <RouterLink to="/products">
          <AButton variant="secondary" size="sm">Cancel</AButton>
        </RouterLink>
        <AButton size="sm" :loading="saving" @click="handleSave">
          <Save :size="13" />
          Save Product
        </AButton>
      </div>
    </div>

    <!-- ── Two-column form ────────────────────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_272px] gap-4 pb-8">

      <!-- Left: main content -->
      <div class="space-y-4">

        <!-- Names + slug -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <h2 class="text-xs font-semibold text-dash-text mb-4">Product Name</h2>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <AInput
                  v-model="form.name"
                  label="Arabic Name"
                  :error="formErrors.name"
                  dir="rtl"
                  placeholder="أدخل اسم المنتج"
                />
                <p class="mt-1.5 text-2xs text-dash-muted">Shown to customers in Arabic</p>
              </div>
              <div>
                <AInput
                  v-model="form.name_en"
                  label="English Name"
                  placeholder="e.g. Oud Royale"
                  @input="syncSlug"
                />
                <p class="mt-1.5 text-2xs text-dash-muted">Used to generate the URL slug</p>
              </div>
            </div>

            <!-- Slug preview -->
            <div
              v-if="form.slug"
              class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dash-border px-3 py-2"
            >
              <Link2 :size="12" class="text-dash-faint shrink-0" />
              <span class="text-2xs text-dash-muted">aromashop.ly/products/</span>
              <span class="text-2xs font-medium text-dash-text font-mono">{{ form.slug }}</span>
              <span class="ml-auto text-2xs text-dash-faint">Auto-generated</span>
            </div>
            <div
              v-else
              class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dashed border-dash-border px-3 py-2"
            >
              <Link2 :size="12" class="text-dash-faint shrink-0" />
              <span class="text-2xs text-dash-faint">Slug will appear once you type the English name</span>
            </div>
          </div>
        </section>

        <!-- Description -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <h2 class="text-xs font-semibold text-dash-text mb-4">Description</h2>
          <ATextarea
            v-model="form.description"
            placeholder="Optional — describe the scent, notes, occasion…"
            class="!rows-4"
            rows="4"
          />
        </section>

        <!-- Images -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h2 class="text-xs font-semibold text-dash-text">Images</h2>
              <p class="text-2xs text-dash-muted mt-0.5">First image becomes the thumbnail. Up to 10 images.</p>
            </div>
            <label
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-medium
                     bg-dash-surface border border-dash-border text-dash-muted
                     hover:bg-dash-bg hover:text-dash-text transition-all duration-150 cursor-pointer"
            >
              <ImagePlus :size="13" />
              Add images
              <input
                type="file"
                accept="image/*"
                multiple
                class="sr-only"
                @change="handleFileInput"
              />
            </label>
          </div>

          <!-- Drop zone (empty state) -->
          <div
            v-if="pendingImages.length === 0"
            class="relative rounded-card border-2 border-dashed border-dash-border bg-dash-bg
                   flex flex-col items-center justify-center gap-2 py-10 px-6 text-center
                   transition-all duration-150"
            :class="dragging ? 'border-dash-primary bg-dash-primary-lt/40' : ''"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="handleDrop"
          >
            <div class="w-10 h-10 rounded-full bg-dash-border flex items-center justify-center">
              <ImagePlus :size="18" class="text-dash-muted" />
            </div>
            <div>
              <p class="text-xs font-medium text-dash-text">Drop images here</p>
              <p class="text-2xs text-dash-muted mt-0.5">or use the button above &middot; JPG, PNG, WebP</p>
            </div>
          </div>

          <!-- Preview grid -->
          <div
            v-else
            class="rounded-card border-2 border-dashed border-dash-border bg-dash-bg p-3
                   transition-all duration-150"
            :class="dragging ? 'border-dash-primary bg-dash-primary-lt/40' : ''"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="handleDrop"
          >
            <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              <div
                v-for="(img, idx) in pendingImages"
                :key="idx"
                class="relative group aspect-square rounded-tag overflow-hidden bg-dash-border"
              >
                <img
                  :src="img.preview"
                  :alt="`Image ${idx + 1}`"
                  class="h-full w-full object-cover"
                />
                <!-- Thumbnail badge -->
                <div
                  v-if="idx === 0"
                  class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                         bg-dash-text/70 text-white backdrop-blur-sm leading-none"
                >
                  Cover
                </div>
                <!-- Remove button -->
                <button
                  type="button"
                  @click="removeImage(idx)"
                  class="absolute top-1 right-1 w-5 h-5 rounded-full bg-dash-text/60 text-white
                         flex items-center justify-center opacity-0 group-hover:opacity-100
                         transition-opacity duration-150 hover:bg-dash-danger"
                >
                  <X :size="10" />
                </button>
              </div>
            </div>
            <p class="text-2xs text-dash-faint mt-2 text-center">
              {{ pendingImages.length }} image{{ pendingImages.length !== 1 ? 's' : '' }} selected &middot; Drop more to add
            </p>
          </div>
        </section>

      </div>

      <!-- Right: sidebar -->
      <div class="space-y-4">

        <!-- Organize -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <h2 class="text-xs font-semibold text-dash-text mb-4">Organize</h2>
          <div class="space-y-3">
            <ASelect
              v-model="form.brand_id"
              label="Brand"
              :options="brandOptions"
              placeholder="Choose brand…"
              :error="formErrors.brand_id"
            />
            <ASelect
              v-model="form.category_id"
              label="Category"
              :options="categoryOptions"
              placeholder="Choose category…"
              :error="formErrors.category_id"
            />
            <ASelect
              v-model="form.type"
              label="Type"
              :options="typeOptions"
              placeholder="Choose type…"
              :error="formErrors.type"
            />
          </div>
        </section>

        <!-- Status flags -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <h2 class="text-xs font-semibold text-dash-text mb-3">Status</h2>
          <div class="space-y-1">
            <label
              v-for="flag in flags"
              :key="flag.key"
              class="flex items-center gap-3 px-3 py-2.5 rounded-btn cursor-pointer
                     hover:bg-dash-bg transition-colors duration-150 group"
            >
              <div
                class="w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-150"
                :class="form[flag.key]
                  ? 'bg-dash-secondary border-dash-secondary'
                  : 'border-dash-border group-hover:border-dash-muted'"
              >
                <Check v-if="form[flag.key]" :size="10" class="text-white" stroke-width="2.5" />
              </div>
              <input type="checkbox" v-model="form[flag.key]" class="sr-only" />
              <div>
                <p class="text-xs font-medium text-dash-text">{{ flag.label }}</p>
                <p class="text-2xs text-dash-muted">{{ flag.hint }}</p>
              </div>
            </label>
          </div>
        </section>

        <!-- Card color -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <h2 class="text-xs font-semibold text-dash-text mb-4">Card Color</h2>
          <div class="space-y-3">
            <div>
              <p class="text-2xs text-dash-muted mb-1.5">Background</p>
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
              <p class="text-2xs text-dash-muted mb-1.5">Accent</p>
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
            <!-- Preview -->
            <div
              class="rounded-btn h-10 flex items-center justify-center gap-2"
              :style="{ backgroundColor: form.placeholder_bg }"
            >
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: form.placeholder_dot }" />
              <span class="text-2xs font-medium" :style="{ color: form.placeholder_dot }">Preview</span>
            </div>
          </div>
        </section>

        <!-- Error summary -->
        <div
          v-if="formErrors.general"
          class="rounded-card border border-dash-danger/20 bg-dash-danger-lt px-4 py-3 flex items-start gap-2"
        >
          <AlertCircle :size="14" class="text-dash-danger shrink-0 mt-0.5" />
          <p class="text-xs text-dash-danger">{{ formErrors.general }}</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  ChevronLeft, Save, Link2, ImagePlus, X, Check, AlertCircle,
} from 'lucide-vue-next'
import {
  apiCreateProduct, apiUploadImages,
  apiGetBrands, apiGetCategories,
} from '../api/admin'
import type { AdminBrand, AdminCategory } from '../types'
import AInput    from '../components/ui/AInput.vue'
import ATextarea from '../components/ui/ATextarea.vue'
import ASelect   from '../components/ui/ASelect.vue'
import AButton   from '../components/ui/AButton.vue'

const router = useRouter()

// ── Dropdowns data ──────────────────────────────────────────────────────────
const brands = ref<AdminBrand[]>([])
const cats   = ref<AdminCategory[]>([])

const typeOptions     = ['EDP', 'EDT', 'Parfum', 'EDC'].map(v => ({ value: v, label: v }))
const brandOptions    = computed(() => brands.value.map(b => ({ value: String(b.id), label: b.name })))
const categoryOptions = computed(() => cats.value.map(c => ({ value: String(c.id), label: c.label })))

// ── Form state ───────────────────────────────────────────────────────────────
const form = ref({
  name:        '',
  name_en:     '',
  slug:        '',
  brand_id:    '',
  category_id: '',
  type:        '',
  description: '',
  is_new:        false as boolean,
  is_bestseller: false as boolean,
  is_offer:      false as boolean,
  placeholder_bg:  '#F2E8E5',
  placeholder_dot: '#C9A0A0',
})

const formErrors = ref<Record<string, string>>({})
const saving     = ref(false)

const flags = [
  { key: 'is_new'        as const, label: 'New arrival',  hint: 'Shows a "New" badge in the store' },
  { key: 'is_bestseller' as const, label: 'Bestseller',   hint: 'Highlights this product in lists' },
  { key: 'is_offer'      as const, label: 'On offer',     hint: 'Marks the product as discounted'  },
]

// ── Slug generation ──────────────────────────────────────────────────────────
function toSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function syncSlug() {
  form.value.slug = toSlug(form.value.name_en)
}

// ── Image handling ───────────────────────────────────────────────────────────
interface PendingImage { file: File; preview: string }
const pendingImages = ref<PendingImage[]>([])
const dragging      = ref(false)

function addFiles(files: File[]) {
  const images = files.filter(f => f.type.startsWith('image/'))
  const remaining = 10 - pendingImages.value.length
  images.slice(0, remaining).forEach(file => {
    pendingImages.value.push({ file, preview: URL.createObjectURL(file) })
  })
}

function handleFileInput(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  addFiles(files)
  ;(e.target as HTMLInputElement).value = ''
}

function handleDrop(e: DragEvent) {
  dragging.value = false
  addFiles(Array.from(e.dataTransfer?.files ?? []))
}

function removeImage(idx: number) {
  URL.revokeObjectURL(pendingImages.value[idx].preview)
  pendingImages.value.splice(idx, 1)
}

// ── Save ─────────────────────────────────────────────────────────────────────
async function handleSave() {
  formErrors.value = {}
  if (!form.value.name)        { formErrors.value.name     = 'Arabic name is required'; return }
  if (!form.value.slug)        { formErrors.value.name_en  = 'English name is required to generate a slug'; return }
  if (!form.value.brand_id)    { formErrors.value.brand_id    = 'Select a brand'; return }
  if (!form.value.category_id) { formErrors.value.category_id = 'Select a category'; return }
  if (!form.value.type)        { formErrors.value.type        = 'Select a type'; return }

  saving.value = true
  try {
    const { data } = await apiCreateProduct({
      name:        form.value.name,
      name_en:     form.value.name_en  || undefined,
      slug:        form.value.slug,
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

    if (pendingImages.value.length > 0) {
      await apiUploadImages(data.id, pendingImages.value.map(p => p.file))
    }

    router.push(`/products/${data.id}/variants`)
  } catch (e: unknown) {
    formErrors.value.general = (e as any)?.response?.data?.message ?? 'Save failed. Please try again.'
  } finally {
    saving.value = false
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [b, c] = await Promise.all([apiGetBrands(), apiGetCategories()])
    brands.value = b.data
    cats.value   = c.data
  } catch { /* dropdowns stay empty */ }
})

onBeforeUnmount(() => {
  pendingImages.value.forEach(img => URL.revokeObjectURL(img.preview))
})
</script>

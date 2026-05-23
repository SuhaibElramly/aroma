<!-- aroma-admin/src/views/HomepageView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  apiGetHomepage, apiUpdateHero, apiAddBlock,
  apiUpdateBlock, apiDeleteBlock, apiReorderBlocks,
  apiGetBrands,
} from '../api/admin'
import type { HomepageConfig, HomepageBlock, NewBlockPayload } from '../types'
import HeroEditor  from '../components/homepage/HeroEditor.vue'
import BlockList   from '../components/homepage/BlockList.vue'
import BlockEditor from '../components/homepage/BlockEditor.vue'

const config       = ref<HomepageConfig | null>(null)
const loading      = ref(true)
const loadError    = ref('')
const heroSaving   = ref(false)
const heroSuccess  = ref(false)
const blockSaving  = ref(false)
const blockError   = ref('')
const editorOpen   = ref(false)
const editingBlock = ref<HomepageBlock | null>(null)
const brands       = ref<{ id: string; name: string }[]>([])

const heroEditorRef = ref<InstanceType<typeof HeroEditor> | null>(null)

async function load() {
  loadError.value = ''
  try {
    const [homepageRes, brandsRes] = await Promise.all([
      apiGetHomepage(),
      apiGetBrands(),
    ])
    config.value = homepageRes.data
    brands.value = brandsRes.data.map((b: any) => ({ id: b.id, name: b.name }))
  } catch {
    loadError.value = 'Failed to load homepage config.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveHero() {
  if (!config.value) return
  heroSaving.value  = true
  heroSuccess.value = false
  try {
    const form = new FormData()
    const h = config.value.hero
    form.append('headline',            h.headline)
    form.append('subtext',             h.subtext)
    form.append('cta_primary_label',   h.cta_primary_label)
    form.append('cta_primary_url',     h.cta_primary_url)
    form.append('cta_secondary_label', h.cta_secondary_label)
    form.append('cta_secondary_url',   h.cta_secondary_url)

    const imageFile = heroEditorRef.value?.imageFile
    if (imageFile) form.append('bg_image', imageFile)

    await apiUpdateHero(form)
    heroSuccess.value = true
    setTimeout(() => { heroSuccess.value = false }, 3000)
  } catch {
    // error shown inline by HeroEditor
  } finally {
    heroSaving.value = false
  }
}

function openAddBlock() {
  editingBlock.value = null
  editorOpen.value   = true
}

function openEditBlock(block: HomepageBlock) {
  editingBlock.value = block
  editorOpen.value   = true
}

async function onToggleBlock(block: HomepageBlock) {
  if (!config.value) return
  try {
    await apiUpdateBlock(block.id, { enabled: !block.enabled })
    block.enabled = !block.enabled
  } catch { /* silently ignore */ }
}

async function onDeleteBlock(block: HomepageBlock) {
  if (!config.value) return
  if (!confirm('Delete this block?')) return
  try {
    await apiDeleteBlock(block.id)
    config.value.blocks = config.value.blocks.filter(b => b.id !== block.id)
  } catch { /* silently ignore */ }
}

async function onSaveBlock(payload: Partial<HomepageBlock> | NewBlockPayload) {
  if (!config.value) return
  blockSaving.value = true
  blockError.value  = ''
  try {
    if (editingBlock.value) {
      const res = await apiUpdateBlock(editingBlock.value.id, payload as Partial<HomepageBlock>)
      const idx = config.value.blocks.findIndex(b => b.id === editingBlock.value!.id)
      if (idx !== -1) config.value.blocks[idx] = res.data
    } else {
      const res = await apiAddBlock(payload as NewBlockPayload)
      config.value.blocks.push(res.data)
    }
    editorOpen.value = false
  } catch {
    blockError.value = 'Failed to save block.'
  } finally {
    blockSaving.value = false
  }
}

async function onReorder(blocks: HomepageBlock[]) {
  if (!config.value) return
  config.value.blocks = blocks
  try {
    await apiReorderBlocks(blocks.map((b, i) => ({ id: b.id, position: i + 1 })))
  } catch { /* silently ignore — UI already reflects new order */ }
}

function onRemoveHeroImage() {
  if (config.value) config.value.hero.bg_image_path = null
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto space-y-6">
    <h1 class="text-[18px] font-semibold text-dash-text">Homepage Editor</h1>

    <p v-if="loadError" class="text-xs text-dash-danger">{{ loadError }}</p>
    <div v-if="loading" class="text-dash-muted text-[13px]">Loading…</div>

    <template v-else-if="config">
      <!-- Hero editor -->
      <div class="space-y-2">
        <HeroEditor
          ref="heroEditorRef"
          v-model="config.hero"
          :saving="heroSaving"
          @save="saveHero"
          @remove-image="onRemoveHeroImage"
        />
        <p v-if="heroSuccess" class="text-xs text-green-600 text-right">Hero saved ✓</p>
      </div>

      <!-- Block list -->
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dash-faint mb-3">
          Page Blocks — drag to reorder
        </p>
        <BlockList
          :blocks="config.blocks"
          @update:blocks="onReorder"
          @edit="openEditBlock"
          @delete="onDeleteBlock"
          @toggle="onToggleBlock"
          @add-block="openAddBlock"
        />
      </div>
    </template>

    <!-- Block editor drawer -->
    <BlockEditor
      :open="editorOpen"
      :block="editingBlock"
      :brands="brands"
      :saving="blockSaving"
      :error="blockError"
      @close="editorOpen = false"
      @save="onSaveBlock"
    />
  </div>
</template>

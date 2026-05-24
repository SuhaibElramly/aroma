<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Search,
  LayoutDashboard, ShoppingBag, Users, Package,
  SlidersHorizontal, Tag, Grid3X3, Ticket, ShieldCheck, Home,
} from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'
import { useCommandPalette } from '../../composables/useCommandPalette'
import { apiGetProducts, apiGetUsers, apiGetBrands, apiGetOrders, apiGetCoupons } from '../../api/admin'
import type { AdminProduct, AdminUserRow, AdminBrand, AdminOrder, AdminCoupon } from '../../types'

type ResultKind = 'nav' | 'product' | 'user' | 'brand' | 'order' | 'coupon'

interface Result {
  kind:      ResultKind
  id:        string
  label:     string
  sub?:      string
  icon:      any
  to:        string
}

interface Section {
  key:   string
  label: string
  items: Result[]
}

const { t, locale } = useI18n()
const router = useRouter()
const auth   = useAuthStore()
const { open, closePalette } = useCommandPalette()

const query        = ref('')
const highlightIdx = ref(0)
const inputEl      = ref<HTMLInputElement | null>(null)
const listEl       = ref<HTMLDivElement | null>(null)

interface NavItem { key: string; label: string; icon: any; path: string; resource?: string }

const navItems = computed<NavItem[]>(() => {
  const all: NavItem[] = [
    { key: 'dashboard',  label: t('nav.dashboard'),  icon: LayoutDashboard,  path: 'dashboard' },
    { key: 'orders',     label: t('nav.orders'),     icon: ShoppingBag,      path: 'orders',     resource: 'orders' },
    { key: 'users',      label: t('nav.customers'),  icon: Users,            path: 'users',      resource: 'customers' },
    { key: 'products',   label: t('nav.products'),   icon: Package,          path: 'products',   resource: 'products' },
    { key: 'spec-types', label: t('nav.specTypes'),  icon: SlidersHorizontal,path: 'spec-types', resource: 'specs' },
    { key: 'brands',     label: t('nav.brands'),     icon: Tag,              path: 'brands',     resource: 'brands' },
    { key: 'categories', label: t('nav.categories'), icon: Grid3X3,          path: 'categories', resource: 'brands' },
    { key: 'coupons',    label: t('nav.coupons'),    icon: Ticket,           path: 'coupons',    resource: 'coupons' },
    { key: 'homepage',   label: t('nav.homepage'),   icon: Home,             path: 'homepage' },
    { key: 'admins',     label: t('nav.admins'),     icon: ShieldCheck,      path: 'admins',     resource: 'admins' },
  ]
  return all.filter(i => !i.resource || auth.can(i.resource, 'view'))
})

function matchesNav(item: NavItem, q: string): boolean {
  return item.label.toLowerCase().includes(q.toLowerCase())
}

const products = ref<AdminProduct[]>([])
const users    = ref<AdminUserRow[]>([])
const brands   = ref<AdminBrand[]>([])
const orders   = ref<AdminOrder[]>([])
const coupons  = ref<AdminCoupon[]>([])

let abortCtrl: AbortController | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function clearEntities() {
  products.value = []
  users.value    = []
  brands.value   = []
  orders.value   = []
  coupons.value  = []
}

async function fetchEntities(q: string) {
  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()
  const signal = abortCtrl.signal

  const tasks: Promise<unknown>[] = []
  const swallow = () => { /* surfacing inline errors in a search palette is noisier than it's worth */ }

  if (auth.can('products', 'view')) {
    tasks.push(
      apiGetProducts({ search: q, page: 1 })
        .then(r => { if (!signal.aborted) products.value = r.data.data.slice(0, 5) })
        .catch(swallow)
    )
  }

  if (auth.can('customers', 'view')) {
    const userParams: { search?: string; phone?: string; page: number } = { page: 1 }
    if (/^\d/.test(q)) userParams.phone  = q
    else               userParams.search = q
    tasks.push(
      apiGetUsers(userParams)
        .then(r => { if (!signal.aborted) users.value = r.data.data.slice(0, 5) })
        .catch(swallow)
    )
  }

  if (auth.can('brands', 'view')) {
    tasks.push(
      apiGetBrands({ name: q })
        .then(r => { if (!signal.aborted) brands.value = r.data.slice(0, 3) })
        .catch(swallow)
    )
  }

  if (auth.can('orders', 'view')) {
    const orderParams: { order_id?: string; phone?: string; page?: number } = { page: 1 }
    if (q.toUpperCase().startsWith('ORD')) orderParams.order_id = q
    else if (/^\d/.test(q))                orderParams.phone    = q
    if (orderParams.order_id || orderParams.phone) {
      tasks.push(
        apiGetOrders(orderParams)
          .then(r => { if (!signal.aborted) orders.value = r.data.data.slice(0, 3) })
          .catch(swallow)
      )
    } else {
      orders.value = []
    }
  }

  if (auth.can('coupons', 'view')) {
    tasks.push(
      apiGetCoupons({ search: q })
        .then(r => { if (!signal.aborted) coupons.value = r.data.slice(0, 3) })
        .catch(swallow)
    )
  }

  await Promise.all(tasks)
}

watch(query, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const trimmed = q.trim()
  if (trimmed.length < 2) {
    if (abortCtrl) abortCtrl.abort()
    clearEntities()
    return
  }
  debounceTimer = setTimeout(() => fetchEntities(trimmed), 250)
})

const sections = computed<Section[]>(() => {
  const q = query.value.trim()
  const navMatching = q
    ? navItems.value.filter(i => matchesNav(i, q))
    : navItems.value

  const navSection: Section = {
    key:   'nav',
    label: t('commandPalette.sectionNavigate'),
    items: navMatching.map<Result>(n => ({
      kind: 'nav', id: n.key, label: n.label, icon: n.icon, to: '/' + n.path,
    })),
  }

  const productSection: Section = {
    key:   'products',
    label: t('commandPalette.sectionProducts'),
    items: products.value.map<Result>(p => ({
      kind: 'product', id: String(p.id), label: p.name,
      sub: p.brand || undefined, icon: Package, to: `/products/${p.id}`,
    })),
  }

  const userSection: Section = {
    key:   'users',
    label: t('commandPalette.sectionUsers'),
    items: users.value.map<Result>(u => ({
      kind: 'user', id: String(u.id), label: u.name || u.phone || u.email || `#${u.id}`,
      sub: u.phone || u.email || undefined, icon: Users, to: `/users/${u.id}`,
    })),
  }

  const brandSection: Section = {
    key:   'brands',
    label: t('commandPalette.sectionBrands'),
    items: brands.value.map<Result>(b => ({
      kind: 'brand', id: String(b.id), label: b.name,
      sub: b.origin ?? undefined, icon: Tag, to: `/brands/${b.id}`,
    })),
  }

  const orderSection: Section = {
    key:   'orders',
    label: t('commandPalette.sectionOrders'),
    items: orders.value.map<Result>(o => ({
      kind: 'order', id: String(o.id), label: `#${o.id}`,
      sub: o.status ?? undefined, icon: ShoppingBag, to: `/orders/${o.id}`,
    })),
  }

  const couponSection: Section = {
    key:   'coupons',
    label: t('commandPalette.sectionCoupons'),
    items: coupons.value.map<Result>(c => ({
      kind: 'coupon', id: String(c.id), label: c.code,
      sub: c.type, icon: Ticket, to: `/coupons`,
    })),
  }

  return [navSection, productSection, userSection, orderSection, brandSection, couponSection]
    .filter(s => s.items.length > 0)
})

const flatItems = computed<Result[]>(() => sections.value.flatMap(s => s.items))

const showNoResults = computed(() =>
  query.value.trim().length >= 2 && flatItems.value.length === 0,
)

function clamp(i: number, len: number): number {
  if (len === 0) return 0
  if (i < 0)     return len - 1
  if (i >= len)  return 0
  return i
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape')      { e.preventDefault(); closePalette(); return }
  if (e.key === 'ArrowDown')   { e.preventDefault(); highlightIdx.value = clamp(highlightIdx.value + 1, flatItems.value.length); scrollHighlightIntoView(); return }
  if (e.key === 'ArrowUp')     { e.preventDefault(); highlightIdx.value = clamp(highlightIdx.value - 1, flatItems.value.length); scrollHighlightIntoView(); return }
  if (e.key === 'Home')        { e.preventDefault(); highlightIdx.value = 0; scrollHighlightIntoView(); return }
  if (e.key === 'End')         { e.preventDefault(); highlightIdx.value = Math.max(0, flatItems.value.length - 1); scrollHighlightIntoView(); return }
  if (e.key === 'Enter')       { e.preventDefault(); activate(highlightIdx.value); return }
}

function activate(idx: number) {
  const item = flatItems.value[idx]
  if (!item) return
  closePalette()
  router.push(item.to)
}

function scrollHighlightIntoView() {
  nextTick(() => {
    const el = listEl.value?.querySelector(`[data-cp-idx="${highlightIdx.value}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

watch(flatItems, (items) => {
  if (highlightIdx.value >= items.length) highlightIdx.value = 0
})

watch(open, async (v) => {
  if (v) {
    query.value = ''
    highlightIdx.value = 0
    await nextTick()
    inputEl.value?.focus()
  }
})

function onBackdrop() { closePalette() }

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (abortCtrl)     abortCtrl.abort()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      :dir="locale === 'ar' ? 'rtl' : 'ltr'"
      @keydown="onKeydown"
    >
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        @click="onBackdrop"
      />

      <div
        class="relative w-full max-w-[560px] bg-dash-paper border border-dash-border rounded-card shadow-xl overflow-hidden"
        @click.stop
      >
        <div class="flex items-center gap-2 px-4 py-3 border-b border-dash-border-lt">
          <Search :size="16" class="text-dash-muted shrink-0" />
          <input
            ref="inputEl"
            v-model="query"
            :placeholder="t('commandPalette.placeholder')"
            class="flex-1 bg-transparent text-[14px] outline-none text-dash-text placeholder:text-dash-faint"
          />
          <button
            type="button"
            class="text-[10px] px-1.5 py-0.5 rounded border border-dash-border-lt text-dash-faint hover:text-dash-text"
            @click="closePalette"
          >
            {{ t('commandPalette.escHint') }}
          </button>
        </div>

        <div ref="listEl" class="max-h-[60vh] overflow-y-auto py-2">
          <div v-if="sections.length === 0 && !showNoResults" class="px-4 py-8 text-center text-[12px] text-dash-faint">
            {{ t('commandPalette.emptyHint') }}
          </div>
          <div v-else-if="showNoResults" class="px-4 py-8 text-center text-[12px] text-dash-faint">
            {{ t('commandPalette.noResults') }}
          </div>
          <template v-else>
            <div v-for="section in sections" :key="section.key" class="mb-1">
              <p class="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-[.18em] uppercase text-dash-faint">
                {{ section.label }}
              </p>
              <button
                v-for="item in section.items"
                :key="`${section.key}-${item.id}`"
                type="button"
                :data-cp-idx="flatItems.indexOf(item)"
                class="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-start transition-colors"
                :class="flatItems.indexOf(item) === highlightIdx
                  ? 'bg-dash-bg text-dash-text'
                  : 'text-dash-text-2 hover:bg-dash-paper-2'"
                @mouseenter="highlightIdx = flatItems.indexOf(item)"
                @click="activate(flatItems.indexOf(item))"
              >
                <component :is="item.icon" :size="16" class="text-dash-muted shrink-0" />
                <span class="flex-1 truncate">{{ item.label }}</span>
                <span v-if="item.sub" class="text-[11px] text-dash-faint truncate max-w-[40%]">
                  {{ item.sub }}
                </span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

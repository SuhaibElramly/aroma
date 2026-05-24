<!-- aroma-admin/src/views/UsersView.vue -->
<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1280px]">

    <!-- KPI strip -->
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('users.kpiAllCustomers') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ meta?.total ?? '—' }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('users.kpiRegistered') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('users.kpiNewThisMonth') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">—</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('users.kpiJoinedRecently') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('users.kpiReturning') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">—</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('users.kpi2PlusOrders') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ t('users.kpiVip') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">—</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ t('users.kpiHighValue') }}</p>
      </div>
    </div>

    <!-- Toolbar: search + filters -->
    <div class="bg-dash-paper border border-dash-border rounded-card p-4 flex items-center gap-3 flex-wrap shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
      <!-- Search -->
      <div class="relative flex-1 min-w-[220px]">
        <svg class="absolute start-3 top-1/2 -translate-y-1/2 text-dash-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input
          v-model="search"
          :placeholder="t('users.searchPlaceholder')"
          class="w-full rounded-lg border border-dash-border bg-dash-paper-2 ps-9 pe-3 py-2 text-[13px] outline-none text-dash-text focus:border-dash-primary transition-colors"
          @input="debouncedFetch"
        />
      </div>
      <!-- Segment filter pills -->
      <div class="flex items-center gap-1 p-1 rounded-lg border border-dash-border-lt bg-dash-paper-2">
        <button
          v-for="seg in segments"
          :key="seg"
          class="px-2.5 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-all"
          :style="{
            background: activeSegment === seg ? 'white' : 'transparent',
            color: activeSegment === seg ? 'var(--dash-text)' : 'var(--dash-muted)',
            boxShadow: activeSegment === seg ? '0 1px 2px rgba(0,0,0,.05)' : 'none'
          }"
          @click="activeSegment = seg"
        >{{ t(segmentLabelKey[seg]) }}</button>
      </div>
    </div>

    <!-- Customer table -->
    <div class="bg-dash-paper border border-dash-border rounded-card overflow-hidden shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
      <div v-if="loading" class="py-12 text-center text-sm text-dash-muted">{{ t('common.loading') }}</div>
      <table v-else class="w-full text-[12.5px]">
        <thead>
          <tr class="text-[10.5px] uppercase tracking-wider text-dash-faint">
            <th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ t('users.columns.name') }}</th>
            <th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ t('users.columns.orders') }}</th>
            <th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ t('users.columns.joined') }}</th>
            <th class="py-3 px-6 border-b border-dash-border-lt"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in items"
            :key="user.id"
            class="hover:bg-dash-paper-2 cursor-pointer transition-colors"
            @click="router.push(`/users/${user.id}`)"
          >
            <!-- Name cell with avatar initials -->
            <td class="py-3.5 px-6 border-b border-dash-border-lt">
              <div class="flex items-center gap-3">
                <div
                  class="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0"
                  :style="{ background: `oklch(52% 0.06 ${userHue(user.name)})` }"
                >
                  {{ initials(user.name) }}
                </div>
                <div>
                  <p class="text-[13px] font-medium text-dash-text">{{ user.name }}</p>
                  <p class="text-[11px] text-dash-faint">{{ user.phone || user.email }}</p>
                </div>
              </div>
            </td>
            <!-- Orders count -->
            <td class="py-3.5 px-6 border-b border-dash-border-lt">
              <span class="font-medium text-dash-text">{{ user.orderCount }}</span>
              <span class="text-dash-faint text-[10px] ms-1">{{ t('users.columns.orders').toLowerCase() }}</span>
            </td>
            <!-- Joined -->
            <td class="py-3.5 px-6 border-b border-dash-border-lt text-dash-muted">
              {{ user.joinedAt ? user.joinedAt.slice(0, 10) : '—' }}
            </td>
            <!-- Actions -->
            <td class="py-3.5 px-4 border-b border-dash-border-lt text-end">
              <RouterLink
                :to="`/users/${user.id}`"
                class="text-xs text-dash-primary hover:underline"
                @click.stop
              >
                {{ t('common.view') }}
              </RouterLink>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="4" class="py-12 text-center text-sm text-dash-muted">
              {{ t('users.noUsers') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <APagination :meta="meta" @change="changePage" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { RouterLink } from 'vue-router'
import { apiGetUsers } from '../api/admin'
import { usePagination } from '../composables/usePagination'
import APagination from '../components/ui/APagination.vue'

const { t } = useI18n()
const router     = useRouter()
const search     = ref('')
const phone      = ref('')
const joinedFrom = ref('')
const joinedTo   = ref('')
const minOrders  = ref('')
const maxOrders  = ref('')

// ── Segment filter ────────────────────────────────────────────────────
const segments = ['All', 'VIP', 'Loyal', 'New', 'Lapsed'] as const
const activeSegment = ref<string>('All')
const segmentLabelKey: Record<string, string> = {
  All:    'userSegments.all',
  VIP:    'userSegments.vip',
  Loyal:  'userSegments.loyal',
  New:    'userSegments.new',
  Lapsed: 'userSegments.lapsed',
}

// ── Design helpers ────────────────────────────────────────────────────
function initials(name: string): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase()
}

function userHue(name: string): number {
  if (!name) return 200
  const code = name.charCodeAt(0)
  const palette = [32, 340, 200, 96, 48, 140, 280, 18, 54, 24, 8, 160]
  return palette[code % palette.length]
}

// ── Pagination ────────────────────────────────────────────────────────
const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetUsers({
    search:      search.value.trim()  || undefined,
    phone:       phone.value.trim()   || undefined,
    joined_from: joinedFrom.value     || undefined,
    joined_to:   joinedTo.value       || undefined,
    min_orders:  minOrders.value !== '' ? Number(minOrders.value) : undefined,
    max_orders:  maxOrders.value !== '' ? Number(maxOrders.value) : undefined,
    page,
  }).then(r => r.data),
)

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 380)
}

watch([search, phone, joinedFrom, joinedTo, minOrders, maxOrders], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 380)
})

onUnmounted(() => clearTimeout(debounceTimer))
onMounted(() => fetch(1))
</script>

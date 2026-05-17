<template>
  <div class="space-y-6 max-w-[1400px]">
    <!-- Welcome -->
    <div>
      <h2 class="text-lg font-semibold text-dash-text">{{ t('dashboard.greeting', { timeOfDay: t(`dashboard.timeOfDay.${greeting}`), name: auth.user?.name ?? 'Admin' }) }} 👋</h2>
      <p class="text-sm text-dash-muted mt-0.5">{{ t('dashboard.subtitle') }}</p>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger"
    >
      {{ error }}
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <AStatCard
        :label="t('dashboard.totalRevenue')"
        :value="stats ? `${Number(stats.totalRevenue).toFixed(0)} LYD` : '—'"
        :change="stats?.revenueChange ?? null"
        :sub="t('dashboard.vsLastMonth')"
        :icon="TrendingUp"
        icon-bg="oklch(67% 0.063 195)"
        :featured="true"
      />
      <AStatCard
        :label="t('dashboard.grossProfit')"
        :value="stats ? `${stats.grossProfit.toFixed(0)} LYD` : '—'"
        :icon="TrendingUp"
        icon-bg="oklch(68% 0.045 140)"
      />
      <AStatCard
        :label="t('dashboard.avgMargin')"
        :value="stats ? `${stats.avgMargin}%` : '—'"
        :icon="Package"
        icon-bg="oklch(75% 0.085 100)"
      />
      <AStatCard
        :label="t('dashboard.totalOrders')"
        :value="stats?.totalOrders ?? '—'"
        :change="stats?.ordersChange ?? null"
        :icon="ShoppingBag"
        icon-bg="oklch(72% 0.16 55)"
      />
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AreaChart
        :data="stats?.monthlyRevenueAmounts ?? zeros12"
        :labels="stats?.monthlyRevenueLabels ?? monthLabels"
      />
      <BarChart
        :data="stats?.monthlyOrderCounts ?? zeros12"
        :labels="stats?.monthlyOrderLabels ?? monthLabels"
      />
    </div>

    <!-- Profit panels row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Profit Breakdown by Category -->
      <div class="bg-dash-paper rounded-card border border-dash-border p-5">
        <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest mb-4">Profit Breakdown</p>
        <ul v-if="stats?.categoryBreakdown?.length" class="space-y-3">
          <li v-for="cat in stats.categoryBreakdown" :key="cat.category">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-dash-text">{{ cat.category }}</span>
              <span class="text-xs text-dash-muted">{{ cat.margin }}% margin</span>
            </div>
            <div class="h-2 rounded-full bg-dash-bg overflow-hidden flex">
              <div
                class="h-full bg-dash-danger/40"
                :style="{ width: cat.revenue > 0 ? (cat.cogs / cat.revenue * 100) + '%' : '0%' }"
              ></div>
              <div
                class="h-full bg-dash-success"
                :style="{ width: cat.revenue > 0 ? (cat.profit / cat.revenue * 100) + '%' : '0%' }"
              ></div>
            </div>
          </li>
        </ul>
        <p v-else class="text-xs text-dash-muted text-center py-6">No delivered orders yet.</p>
      </div>

      <!-- P&L Snapshot -->
      <div class="bg-dash-paper rounded-card border border-dash-border p-5">
        <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest mb-4">P&amp;L Snapshot</p>
        <ul class="space-y-2.5">
          <li class="flex items-center justify-between">
            <span class="text-xs text-dash-text">Revenue</span>
            <span class="text-xs font-medium text-dash-text">{{ stats ? Number(stats.totalRevenue).toFixed(2) : '—' }} LYD</span>
          </li>
          <li class="flex items-center justify-between">
            <span class="text-xs text-dash-muted">Cost of Goods</span>
            <span class="text-xs text-dash-danger">-{{ stats ? stats.cogs.toFixed(2) : '—' }} LYD</span>
          </li>
          <li class="flex items-center justify-between border-t border-dash-border pt-2 mt-1">
            <span class="text-xs font-medium text-dash-text">Gross Profit</span>
            <span class="text-xs font-medium text-dash-success">{{ stats ? stats.grossProfit.toFixed(2) : '—' }} LYD</span>
          </li>
          <li class="flex items-center justify-between">
            <span class="text-xs text-dash-muted">Avg Margin</span>
            <span class="text-xs font-medium text-dash-primary">{{ stats ? stats.avgMargin : '—' }}%</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Recent orders + comparison chart -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <!-- Recent orders table -->
      <div class="xl:col-span-2 bg-dash-surface rounded-card shadow-card p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-dash-text">{{ t('dashboard.recentOrders') }}</h3>
            <p class="text-2xs text-dash-muted mt-0.5">{{ t('dashboard.latestActivity') }}</p>
          </div>
          <RouterLink
            to="/orders"
            class="text-xs font-medium text-dash-primary hover:text-dash-primary-dk transition-colors"
          >
            {{ t('dashboard.viewAll') }}
          </RouterLink>
        </div>

        <div v-if="loading" class="space-y-3 py-2">
          <div v-for="i in 5" :key="i" class="flex items-center gap-4">
            <div class="h-3 rounded-full bg-dash-border animate-pulse w-16" />
            <div class="h-3 rounded-full bg-dash-border animate-pulse flex-1" />
            <div class="h-3 rounded-full bg-dash-border animate-pulse w-20" />
            <div class="h-3 rounded-full bg-dash-border animate-pulse w-16" />
          </div>
        </div>

        <table v-else class="w-full text-xs">
          <thead>
            <tr class="border-b border-dash-border">
              <th class="pb-3 text-left text-2xs font-semibold text-dash-faint uppercase tracking-wider">{{ t('dashboard.columns.order') }}</th>
              <th class="pb-3 text-left text-2xs font-semibold text-dash-faint uppercase tracking-wider">{{ t('dashboard.columns.customer') }}</th>
              <th class="pb-3 text-left text-2xs font-semibold text-dash-faint uppercase tracking-wider">{{ t('dashboard.columns.total') }}</th>
              <th class="pb-3 text-left text-2xs font-semibold text-dash-faint uppercase tracking-wider">{{ t('dashboard.columns.status') }}</th>
              <th class="pb-3 text-left text-2xs font-semibold text-dash-faint uppercase tracking-wider">{{ t('dashboard.columns.date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in stats?.recentOrders"
              :key="(order as RecentOrderRow).id"
              class="border-b border-dash-border-lt last:border-0 hover:bg-dash-bg transition-colors cursor-pointer"
              @click="router.push({ name: 'order-detail', params: { id: (order as RecentOrderRow).id } })"
            >
              <td class="py-3 font-medium text-dash-text">#{{ (order as RecentOrderRow).id }}</td>
              <td class="py-3 text-dash-muted">{{ (order as RecentOrderRow).user }}</td>
              <td class="py-3 font-medium text-dash-text">{{ Number((order as RecentOrderRow).total).toFixed(0) }} LYD</td>
              <td class="py-3"><ABadge :status="(order as RecentOrderRow).status" /></td>
              <td class="py-3 text-dash-faint">{{ (order as RecentOrderRow).date }}</td>
            </tr>
            <tr v-if="!stats?.recentOrders?.length && !loading">
              <td colspan="5" class="py-14 text-center">
                <AEmptyState :icon="ShoppingBag" :heading="t('dashboard.noOrdersYet')" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Channel comparison -->
      <ComparisonChart
        :online="stats?.weeklyOnline ?? zeros7"
        :labels="stats?.weeklyLabels ?? weekLabels"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLocale } from '../composables/useLocale'
import { TrendingUp, ShoppingBag, Package } from 'lucide-vue-next'
import { apiGetStats } from '../api/admin'
import type { DashboardStats, RecentOrderRow } from '../types'
import { useAuthStore } from '../stores/auth'
import AStatCard       from '../components/ui/AStatCard.vue'
import ABadge          from '../components/ui/ABadge.vue'
import AEmptyState     from '../components/ui/AEmptyState.vue'
import AreaChart       from '../components/charts/AreaChart.vue'
import BarChart        from '../components/charts/BarChart.vue'
import ComparisonChart from '../components/charts/ComparisonChart.vue'

const { t }      = useI18n()
const { locale } = useLocale()
const router     = useRouter()
const auth       = useAuthStore()
const stats      = ref<DashboardStats | null>(null)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
})
const loading = ref(true)
const error   = ref<string | null>(null)

// Zero fallbacks shown while loading or when API has no data yet
const zeros12 = Array(12).fill(0)
const zeros7  = Array(7).fill(0)

const monthLabels = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-LY' : 'en', { month: 'short' })
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)))
})
const weekLabels = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-LY' : 'en', { weekday: 'short' })
  // Mon=0 offset: Jan 1 2024 is Monday
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, i + 1)))
})

onMounted(async () => {
  try {
    const res = await apiGetStats()
    stats.value = res.data
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : t('dashboard.loadError')
  } finally {
    loading.value = false
  }
})
</script>

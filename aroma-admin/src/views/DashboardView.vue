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
        :label="t('dashboard.totalOrders')"
        :value="stats?.totalOrders ?? '—'"
        :change="stats?.ordersChange ?? null"
        :icon="ShoppingBag"
        icon-bg="oklch(72% 0.16 55)"
      />
      <AStatCard
        :label="t('dashboard.products')"
        :value="stats?.totalProducts ?? '—'"
        :icon="Package"
        icon-bg="oklch(52% 0.14 300)"
      />
      <AStatCard
        :label="t('dashboard.customers')"
        :value="stats?.totalUsers ?? '—'"
        :change="stats?.usersChange ?? null"
        :icon="Users"
        icon-bg="oklch(42% 0.072 235)"
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
import { TrendingUp, ShoppingBag, Package, Users } from 'lucide-vue-next'
import { apiGetStats } from '../api/admin'
import type { DashboardStats, RecentOrderRow } from '../types'
import { useAuthStore } from '../stores/auth'
import AStatCard       from '../components/ui/AStatCard.vue'
import ABadge          from '../components/ui/ABadge.vue'
import AEmptyState     from '../components/ui/AEmptyState.vue'
import AreaChart       from '../components/charts/AreaChart.vue'
import BarChart        from '../components/charts/BarChart.vue'
import ComparisonChart from '../components/charts/ComparisonChart.vue'

const { t }   = useI18n()
const router  = useRouter()
const auth    = useAuthStore()
const stats   = ref<DashboardStats | null>(null)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
})
const loading = ref(true)
const error   = ref<string | null>(null)

// Zero fallbacks shown while loading or when API has no data yet
const zeros12   = Array(12).fill(0)
const zeros7    = Array(7).fill(0)
const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const weekLabels  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

onMounted(async () => {
  try {
    const res = await apiGetStats()
    stats.value = res.data
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load dashboard data.'
  } finally {
    loading.value = false
  }
})
</script>

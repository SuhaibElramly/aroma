<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1280px]">

    <!-- Error -->
    <div
      v-if="error"
      class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger"
    >
      {{ error }}
    </div>

    <!-- KPI row -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <AStatCard
        :label="t('dashboard.totalRevenue')"
        :value="stats ? Number(stats.totalRevenue).toLocaleString('en', { maximumFractionDigits: 0 }) : '—'"
        suffix="LYD"
        :change="stats?.revenueChange ?? undefined"
        hint="vs last month"
      />
      <AStatCard
        :label="t('dashboard.grossProfit')"
        :value="stats ? stats.grossProfit.toLocaleString('en', { maximumFractionDigits: 0 }) : '—'"
        suffix="LYD"
        :hint="stats ? `${stats.avgMargin}% margin` : undefined"
      />
      <AStatCard
        :label="t('dashboard.avgMargin')"
        :value="stats ? stats.avgMargin : '—'"
        suffix="%"
      />
      <AStatCard
        :label="t('dashboard.totalOrders')"
        :value="stats?.totalOrders ?? '—'"
        suffix="orders"
        :change="stats?.ordersChange ?? undefined"
        hint="this month"
      />
    </div>

    <!-- Charts row: AreaChart col-span-2 + BarChart col-span-1 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2">
        <AreaChart
          :data="stats?.monthlyRevenueAmounts ?? zeros12"
          :labels="stats?.monthlyRevenueLabels ?? monthLabels"
        />
      </div>
      <BarChart
        :data="stats?.monthlyOrderCounts ?? zeros12"
        :labels="stats?.monthlyOrderLabels ?? monthLabels"
      />
    </div>

    <!-- P&L row: ProfitBreakdown col-span-2 + P&L snapshot col-span-1 -->
    <div class="grid grid-cols-3 gap-4">

      <!-- Profit Breakdown -->
      <div class="col-span-2 bg-dash-paper border border-dash-border rounded-card shadow-card p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint whitespace-nowrap">{{ t('dashboard.profitBreakdown') }}</p>
            <div class="mt-2 flex items-baseline gap-3 flex-wrap">
              <span class="font-display text-[28px] leading-none tabular-nums text-dash-text">
                {{ stats ? (stats.grossProfit / 1000).toFixed(1) + 'k' : '—' }}
              </span>
              <span class="text-[12.5px] font-medium text-dash-muted">LYD gross profit · 30 days</span>
              <span
                v-if="stats"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-dash-success-lt text-dash-success-dk"
              >
                {{ stats.avgMargin }}% margin
              </span>
            </div>
          </div>
          <div class="flex items-center gap-4 text-[11px] shrink-0">
            <span class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-dash-primary" />
              <span class="text-dash-muted">Revenue</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-dash-success" />
              <span class="text-dash-muted">Profit</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-dash-border border border-dash-border" />
              <span class="text-dash-muted">Cost</span>
            </span>
          </div>
        </div>

        <ul v-if="stats?.categoryBreakdown?.length" class="mt-5 space-y-3" dir="ltr">
          <li v-for="cat in stats.categoryBreakdown" :key="cat.category">
            <div class="flex items-center justify-between text-[12px] mb-1.5">
              <span class="font-medium text-dash-text">{{ cat.category }}</span>
              <span class="text-dash-muted tabular-nums whitespace-nowrap">
                <span class="font-semibold text-dash-text">{{ (cat.profit / 1000).toFixed(1) }}k</span>
                {{ t('dashboard.profitLabel') }} · {{ cat.margin }}%
              </span>
            </div>
            <div
              class="h-3 rounded-full overflow-hidden relative bg-dash-bg"
              :style="{ width: cat.revenue > 0 ? Math.min((cat.revenue / maxCategoryRevenue) * 100, 100) + '%' : '0%' }"
            >
              <div
                class="absolute inset-y-0 start-0 border-e border-dashed border-dash-border"
                :style="{ width: cat.revenue > 0 ? (cat.cogs / cat.revenue * 100) + '%' : '0%', background: 'oklch(93% 0.01 25)' }"
              />
              <div
                class="absolute inset-y-0 bg-dash-success"
                :style="{
                  left: cat.revenue > 0 ? (cat.cogs / cat.revenue * 100) + '%' : '0%',
                  right: '0'
                }"
              />
            </div>
          </li>
        </ul>
        <p v-else class="text-xs text-dash-muted text-center py-6">{{ t('dashboard.noDeliveredOrders') }}</p>
      </div>

      <!-- P&L Snapshot -->
      <div class="bg-dash-paper border border-dash-border rounded-card shadow-card p-6">
        <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('dashboard.plSnapshot') }}</p>
        <h3 class="font-display text-[18px] mt-0.5 leading-tight text-dash-text">{{ t('dashboard.thisMonth') }}</h3>
        <div class="mt-4 space-y-3">
          <div class="flex items-baseline justify-between">
            <span class="text-[12.5px] text-dash-muted">{{ t('dashboard.revenue') }}</span>
            <span class="text-end whitespace-nowrap">
              <span class="tabular-nums font-display text-[15px] text-dash-text">
                {{ stats ? Number(stats.totalRevenue).toLocaleString('en', { maximumFractionDigits: 0 }) : '—' }}
                <span class="text-[10.5px] font-normal text-dash-muted">LYD</span>
              </span>
            </span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-[12.5px] text-dash-muted">{{ t('dashboard.costOfGoods') }}</span>
            <span class="text-end whitespace-nowrap">
              <span class="tabular-nums font-display text-[15px] text-dash-danger">
                −{{ stats ? stats.cogs.toLocaleString('en', { maximumFractionDigits: 0 }) : '—' }}
                <span class="text-[10.5px] font-normal text-dash-muted">LYD</span>
              </span>
            </span>
          </div>
          <div class="flex items-baseline justify-between border-t border-dash-border pt-2 mt-1">
            <span class="text-[12.5px] text-dash-muted">{{ t('dashboard.grossProfit') }}</span>
            <span class="text-end whitespace-nowrap">
              <span class="tabular-nums font-display text-[15px] text-dash-success-dk">
                {{ stats ? stats.grossProfit.toLocaleString('en', { maximumFractionDigits: 0 }) : '—' }}
                <span class="text-[10.5px] font-normal text-dash-muted">LYD</span>
              </span>
            </span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-[12.5px] text-dash-muted">{{ t('dashboard.avgMarginLabel') }}</span>
            <span class="text-end whitespace-nowrap">
              <span class="tabular-nums font-display text-[15px] text-dash-primary">
                {{ stats ? stats.avgMargin : '—' }}
                <span class="text-[10.5px] font-normal text-dash-muted">%</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom row: RecentOrders col-span-2 + TopProducts col-span-1 -->
    <div class="grid grid-cols-3 gap-4">

      <!-- Recent Orders -->
      <div class="col-span-2 bg-dash-paper border border-dash-border rounded-card shadow-card overflow-hidden">
        <div class="px-6 py-5 flex items-center justify-between border-b border-dash-border-lt">
          <div>
            <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint whitespace-nowrap">{{ t('dashboard.recentOrders') }}</p>
            <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">{{ t('dashboard.latestActivity') }}</h3>
          </div>
          <RouterLink
            to="/orders"
            class="text-[12px] font-medium text-dash-primary hover:underline whitespace-nowrap"
          >
            {{ t('dashboard.viewAll') }} →
          </RouterLink>
        </div>

        <!-- Skeleton -->
        <div v-if="loading" class="p-6 space-y-3">
          <div v-for="i in 5" :key="i" class="flex items-center gap-4">
            <div class="h-3 rounded-full bg-dash-border animate-pulse w-16" />
            <div class="h-3 rounded-full bg-dash-border animate-pulse flex-1" />
            <div class="h-3 rounded-full bg-dash-border animate-pulse w-20" />
            <div class="h-3 rounded-full bg-dash-border animate-pulse w-16" />
          </div>
        </div>

        <table v-else class="w-full text-[12.5px]">
          <thead>
            <tr class="text-[10.5px] uppercase tracking-wider text-dash-faint">
              <th class="text-start font-semibold py-2.5 px-6 border-b border-dash-border-lt">{{ t('dashboard.columns.order') }}</th>
              <th class="text-start font-semibold py-2.5 px-6 border-b border-dash-border-lt">{{ t('dashboard.columns.customer') }}</th>
              <th class="text-start font-semibold py-2.5 px-6 border-b border-dash-border-lt">{{ t('dashboard.columns.total') }}</th>
              <th class="text-start font-semibold py-2.5 px-6 border-b border-dash-border-lt">{{ t('dashboard.columns.status') }}</th>
              <th class="text-start font-semibold py-2.5 px-6 border-b border-dash-border-lt">{{ t('dashboard.columns.date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in stats?.recentOrders"
              :key="(order as RecentOrderRow).id"
              class="hover:bg-dash-bg cursor-pointer transition-colors"
              @click="router.push({ name: 'order-detail', params: { id: (order as RecentOrderRow).id } })"
            >
              <td class="py-3.5 px-6 border-b border-dash-border-lt font-semibold text-dash-text tabular-nums">
                #{{ (order as RecentOrderRow).id }}
              </td>
              <td class="py-3.5 px-6 border-b border-dash-border-lt">
                <div class="flex items-center gap-2.5">
                  <div class="h-7 w-7 rounded-full grid place-items-center text-[10.5px] font-semibold text-white bg-dash-text shrink-0">
                    {{ initials((order as RecentOrderRow).user) }}
                  </div>
                  <span class="font-medium text-dash-text">{{ (order as RecentOrderRow).user }}</span>
                </div>
              </td>
              <td class="py-3.5 px-6 border-b border-dash-border-lt font-semibold tabular-nums whitespace-nowrap text-dash-text">
                {{ Number((order as RecentOrderRow).total).toLocaleString('en', { maximumFractionDigits: 0 }) }}
                <span class="font-normal text-dash-muted">LYD</span>
              </td>
              <td class="py-3.5 px-6 border-b border-dash-border-lt">
                <ABadge :status="(order as RecentOrderRow).status" />
              </td>
              <td class="py-3.5 px-6 border-b border-dash-border-lt text-dash-muted">
                {{ (order as RecentOrderRow).date }}
              </td>
            </tr>
            <tr v-if="!stats?.recentOrders?.length && !loading">
              <td colspan="5" class="py-14 text-center">
                <AEmptyState :icon="ShoppingBag" :heading="t('dashboard.noOrdersYet')" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Top Products -->
      <div class="bg-dash-paper border border-dash-border rounded-card shadow-card p-6">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint whitespace-nowrap">{{ t('dashboard.topProducts') }}</p>
            <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">{{ t('dashboard.byCategory') }}</h3>
          </div>
          <span class="text-[11px] text-dash-muted shrink-0">last 30 days</span>
        </div>

        <div v-if="stats?.categoryBreakdown?.length" class="mt-4 -mx-1">
          <div
            v-for="(cat, i) in stats.categoryBreakdown.slice(0, 5)"
            :key="cat.category"
            class="flex items-center gap-3 px-1 py-3 border-b last:border-0 border-dash-border-lt"
          >
            <div class="h-8 w-8 rounded-xl shrink-0 grid place-items-center text-[11px] font-bold text-dash-muted bg-dash-bg border border-dash-border">
              {{ i + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[12.5px] font-semibold text-dash-text truncate">{{ cat.category }}</p>
              <p class="text-[10.5px] text-dash-muted tabular-nums">
                {{ cat.revenue.toLocaleString('en', { maximumFractionDigits: 0 }) }} LYD revenue
              </p>
            </div>
            <div class="text-end whitespace-nowrap">
              <p class="text-[12px] font-semibold tabular-nums text-dash-text">
                {{ cat.profit.toLocaleString('en', { maximumFractionDigits: 0 }) }}
                <span class="font-normal text-dash-muted">LYD</span>
              </p>
              <p
                class="text-[10.5px] tabular-nums font-medium"
                :class="cat.margin >= 0 ? 'text-dash-success-dk' : 'text-dash-danger'"
              >
                {{ cat.margin }}% margin
              </p>
            </div>
          </div>
        </div>
        <div v-else class="mt-6 text-center">
          <AEmptyState :icon="Package" heading="No data yet" />
        </div>
      </div>
    </div>

    <!-- Footer strip -->
    <div class="pt-2 flex items-center justify-between text-[11px] text-dash-faint">
      <span>Aroma Admin</span>
      <span>Benghazi · Libya</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLocale } from '../composables/useLocale'
import { ShoppingBag, Package } from 'lucide-vue-next'
import { apiGetStats } from '../api/admin'
import type { DashboardStats, RecentOrderRow } from '../types'
import AStatCard       from '../components/ui/AStatCard.vue'
import ABadge          from '../components/ui/ABadge.vue'
import AEmptyState     from '../components/ui/AEmptyState.vue'
import AreaChart       from '../components/charts/AreaChart.vue'
import BarChart        from '../components/charts/BarChart.vue'

const { t }      = useI18n()
const { locale } = useLocale()
const router     = useRouter()
const stats      = ref<DashboardStats | null>(null)
const loading    = ref(true)
const error      = ref<string | null>(null)

// Zero fallbacks shown while loading or when API has no data yet
const zeros12 = Array(12).fill(0)

const monthLabels = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-LY' : 'en', { month: 'short' })
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)))
})

const maxCategoryRevenue = computed(() => {
  if (!stats.value?.categoryBreakdown?.length) return 1
  return Math.max(...stats.value.categoryBreakdown.map(c => c.revenue))
})

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

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

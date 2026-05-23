<template>
  <div class="bg-dash-surface rounded-card p-5 shadow-card transition-card hover-lift">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-dash-text">{{ t('dashboard.revenueChartTitle') }}</h3>
        <p class="text-2xs text-dash-muted mt-0.5">{{ t('dashboard.revenueChartSub') }}</p>
      </div>
      <div class="flex items-center gap-1.5 text-2xs font-medium text-dash-primary bg-dash-primary-lt rounded-full px-2.5 py-1">
        <span class="h-1.5 w-1.5 rounded-full bg-dash-primary inline-block" />
        {{ t('dashboard.revenueLabel') }}
      </div>
    </div>
    <div class="h-52">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Filler, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)

const { t } = useI18n()

const props = defineProps<{
  data:   number[]
  labels: string[]
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    label: t('dashboard.revenueLabel'),
    data: props.data,
    fill: true,
    borderColor: 'oklch(67% 0.063 195)',
    backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } }) => {
      const { ctx: c, chartArea } = ctx.chart
      if (!chartArea) return 'transparent'
      const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
      gradient.addColorStop(0, 'oklch(67% 0.063 195 / 0.18)')
      gradient.addColorStop(1, 'oklch(67% 0.063 195 / 0.01)')
      return gradient
    },
    borderWidth: 2,
    tension: 0.4,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: 'oklch(67% 0.063 195)',
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'oklch(18% 0.008 240)',
      titleColor: 'oklch(74% 0.025 250)',
      bodyColor: '#fff',
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        label: (ctx: { parsed: { y: number | null } }) => ` ${(ctx.parsed.y ?? 0).toLocaleString()} LYD`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: 'oklch(74% 0.025 250)', font: { size: 11, family: 'Inter' } },
    },
    y: {
      grid: { color: 'oklch(92% 0.012 250)' },
      border: { display: false },
      ticks: {
        color: 'oklch(74% 0.025 250)',
        font: { size: 11, family: 'Inter' },
        maxTicksLimit: 5,
        callback: (v: unknown) => {
          const n = Number(v)
          return n >= 1000 ? `${n / 1000}k` : String(n)
        },
      },
    },
  },
}
</script>

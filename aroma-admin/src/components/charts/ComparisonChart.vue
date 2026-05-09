<template>
  <div class="bg-dash-surface rounded-card p-5 shadow-card transition-card hover-lift">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-dash-text">{{ t('dashboard.dayChartTitle') }}</h3>
        <p class="text-2xs text-dash-muted mt-0.5">{{ t('dashboard.dayChartSub') }}</p>
      </div>
      <div class="flex items-center gap-1.5 text-2xs font-medium text-dash-primary bg-dash-primary-lt rounded-full px-2.5 py-1">
        <span class="h-1.5 w-1.5 rounded-full bg-dash-primary inline-block" />
        {{ t('dashboard.onlineLabel') }}
      </div>
    </div>
    <div class="h-48">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { t } = useI18n()

const props = defineProps<{
  online: number[]
  labels: string[]
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: t('dashboard.ordersLabel'),
      data: props.online,
      backgroundColor: 'oklch(67% 0.063 195)',
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 28,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
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
        label: (ctx: { parsed: { y: number } }) => ` ${ctx.parsed.y} orders`,
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
        precision: 0,
      },
    },
  },
}
</script>

<template>
  <div class="bg-dash-surface rounded-card p-5 shadow-card transition-card hover-lift">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-dash-text">Monthly Orders</h3>
        <p class="text-2xs text-dash-muted mt-0.5">Orders per month, rolling 12 months</p>
      </div>
      <div class="text-2xs font-medium text-dash-orange bg-dash-orange-lt rounded-full px-2.5 py-1">
        {{ currentYear }}
      </div>
    </div>
    <div class="h-52">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  data:   number[]
  labels: string[]
}>()

const currentYear = new Date().getFullYear()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    label: 'Orders',
    data: props.data,
    backgroundColor: 'oklch(72% 0.16 55)',
    borderRadius: 8,
    borderSkipped: false,
    maxBarThickness: 28,
  }],
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
      grid: { color: 'oklch(92% 0.012 250)', lineWidth: 1 },
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

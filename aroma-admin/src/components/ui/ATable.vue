<template>
  <div class="bg-dash-surface rounded-card border-0 overflow-hidden shadow-card">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-dash-border bg-dash-bg">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 text-left rtl:text-right text-2xs font-semibold text-dash-faint uppercase tracking-wider whitespace-nowrap"
            >{{ col.label }}</th>
            <th v-if="$slots.actions" class="px-4 py-3 text-right rtl:text-left text-2xs font-semibold text-dash-faint uppercase tracking-wider" />
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-dash-border-lt">
              <td v-for="col in columns" :key="col.key" class="px-4 py-3.5">
                <div class="h-3 rounded-full bg-dash-border animate-pulse" :style="`width: ${45 + (i * 11) % 40}%`" />
              </td>
              <td v-if="$slots.actions" class="px-4 py-3.5" />
            </tr>
          </template>
          <!-- Empty state -->
          <tr v-else-if="!rows?.length">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-14 text-center text-xs text-dash-faint">
              <slot name="empty">No records found.</slot>
            </td>
          </tr>
          <!-- Data rows -->
          <template v-else>
            <tr
              v-for="(row, i) in rows"
              :key="i"
              class="border-b border-dash-border-lt last:border-0 transition-colors duration-150"
              :class="onRowClick ? 'cursor-pointer hover:bg-dash-primary-lt/40' : 'hover:bg-dash-bg'"
              @click="onRowClick?.(row)"
            >
              <td v-for="col in columns" :key="col.key" class="px-4 py-3.5 text-dash-text">
                <slot :name="`cell-${col.key}`" :row="row" :value="(row as Record<string, unknown>)[col.key]">
                  {{ (row as Record<string, unknown>)[col.key] }}
                </slot>
              </td>
              <td v-if="$slots.actions" class="px-4 py-3.5 text-right rtl:text-left">
                <slot name="actions" :row="row" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  columns: { key: string; label: string }[]
  rows?: unknown[]
  loading?: boolean
  onRowClick?: (row: unknown) => void
}>()
</script>

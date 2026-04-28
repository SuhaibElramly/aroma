<!-- aroma-admin/src/views/UsersView.vue -->
<template>
  <div class="space-y-4">
    <AInput v-model="search" placeholder="Search by name or email…" class="w-64" @input="debouncedFetch" />

    <ATable :columns="cols" :rows="items" :loading="loading">
      <template #cell-orderCount="{ value }">
        <span class="font-medium">{{ value }}</span>
        <span class="text-dash-faint text-[10px] ml-1">orders</span>
      </template>
      <template #actions="{ row }">
        <RouterLink
          :to="`/users/${(row as AdminUserRow).id}`"
          class="text-xs text-dash-primary hover:underline"
        >
          View
        </RouterLink>
      </template>
      <template #empty>
        <AEmptyState :icon="Users" heading="No customers found" sub="Try a different search term" />
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Users } from 'lucide-vue-next'
import { apiGetUsers } from '../api/admin'
import type { AdminUserRow } from '../types'
import { usePagination } from '../composables/usePagination'
import ATable      from '../components/ui/ATable.vue'
import AInput      from '../components/ui/AInput.vue'
import APagination from '../components/ui/APagination.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const search = ref('')

const cols = [
  { key: 'name',       label: 'Name' },
  { key: 'email',      label: 'Email' },
  { key: 'phone',      label: 'Phone' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'joinedAt',   label: 'Joined' },
]

const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetUsers({ search: search.value || undefined, page }).then(r => r.data),
)

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 350)
}

onUnmounted(() => clearTimeout(debounceTimer))
onMounted(() => fetch(1))
</script>

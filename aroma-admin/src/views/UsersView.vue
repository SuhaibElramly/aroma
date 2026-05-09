<!-- aroma-admin/src/views/UsersView.vue -->
<template>
  <div class="space-y-4">

    <!-- Filters -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <AInput v-model="search"     :label="t('users.columns.name')"  :placeholder="t('users.searchPlaceholder')" @input="debouncedFetch" />
      <AInput v-model="phone"      :label="t('users.filterPhone')"      placeholder="e.g. 0912345678" />
      <div class="grid grid-cols-2 gap-2">
        <AInput v-model="minOrders" :label="t('users.filterMinOrders')" placeholder="0"  type="number" min="0" />
        <AInput v-model="maxOrders" :label="t('users.filterMaxOrders')" placeholder="—"  type="number" min="0" />
      </div>
      <AInput v-model="joinedFrom" :label="t('users.filterJoinedFrom')" type="date" />
      <AInput v-model="joinedTo"   :label="t('users.filterJoinedTo')"   type="date" />
    </div>

    <ATable :columns="cols" :rows="items" :loading="loading" :on-row-click="(row) => router.push(`/users/${(row as AdminUserRow).id}`)">
      <template #cell-orderCount="{ value }">
        <span class="font-medium">{{ value }}</span>
        <span class="text-dash-faint text-[10px] ml-1">{{ t('users.columns.orders').toLowerCase() }}</span>
      </template>
      <template #actions="{ row }">
        <RouterLink
          :to="`/users/${(row as AdminUserRow).id}`"
          class="text-xs text-dash-primary hover:underline"
        >
          {{ t('common.view') }}
        </RouterLink>
      </template>
      <template #empty>
        <AEmptyState :icon="Users" :heading="t('users.noUsers')" :sub="t('users.noUsersSub')" />
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { RouterLink } from 'vue-router'
import { Users } from 'lucide-vue-next'
import { apiGetUsers } from '../api/admin'
import type { AdminUserRow } from '../types'
import { usePagination } from '../composables/usePagination'
import ATable      from '../components/ui/ATable.vue'
import AInput      from '../components/ui/AInput.vue'
import APagination from '../components/ui/APagination.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const { t } = useI18n()
const router     = useRouter()
const search     = ref('')
const phone      = ref('')
const joinedFrom = ref('')
const joinedTo   = ref('')
const minOrders  = ref('')
const maxOrders  = ref('')

const cols = computed(() => [
  { key: 'name',       label: t('users.columns.name') },
  { key: 'email',      label: t('users.columns.email') },
  { key: 'phone',      label: t('users.columns.phone') },
  { key: 'orderCount', label: t('users.columns.orders') },
  { key: 'joinedAt',   label: t('users.columns.joined') },
])

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

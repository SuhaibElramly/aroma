<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface AdminUser {
  id: number
  name: string
  phone: string
  role: string
  adminStatus: 'active' | 'suspended'
  createdAt: string
}

const admins   = ref<AdminUser[]>([])
const loading  = ref(true)
const showForm = ref(false)
const error    = ref<string | null>(null)
const form     = ref({ name: '', phone: '', role: 'admin', password: '' })

const BASE    = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const token   = () => localStorage.getItem('auth_token') ?? ''
const headers = () => ({
  'Authorization': `Bearer ${token()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
})

async function load() {
  error.value = null
  try {
    loading.value = true
    const res = await fetch(`${BASE}/admin/admins`, { headers: headers() })
    if (!res.ok) throw new Error(`Failed to load admins: ${res.status}`)
    admins.value = await res.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load admins'
  } finally {
    loading.value = false
  }
}

async function createAdmin() {
  error.value = null
  const res = await fetch(`${BASE}/admin/admins`, {
    method: 'POST', headers: headers(), body: JSON.stringify(form.value),
  })
  if (res.ok) {
    admins.value.push(await res.json())
    showForm.value = false
    form.value = { name: '', phone: '', role: 'admin', password: '' }
  } else {
    const body = await res.json().catch(() => ({}))
    error.value = body.message ?? `Failed to create admin: ${res.status}`
    return
  }
}

async function toggleStatus(a: AdminUser) {
  const res = await fetch(`${BASE}/admin/admins/${a.id}/toggle-status`, {
    method: 'PATCH', headers: headers(),
  })
  if (res.ok) {
    const updated = await res.json()
    const idx = admins.value.findIndex(x => x.id === a.id)
    if (idx !== -1) admins.value[idx] = { ...admins.value[idx], ...updated }
  }
}

async function resetPassword(a: AdminUser) {
  const pw = prompt('New temporary password (min 8 chars):')
  if (!pw || pw.length < 8) return
  const res = await fetch(`${BASE}/admin/admins/${a.id}/reset-password`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ password: pw }),
  })
  if (res.ok) alert('Password reset successfully.')
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  form.value.password = Array.from(bytes, b => chars[b % chars.length]).join('')
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', catalog_manager: 'Catalog Manager',
  sales: 'Sales', support: 'Support', read_only: 'Read-only',
}
const ROLE_COLORS: Record<string, string> = {
  owner:           'bg-dash-fig-lt text-dash-fig',
  admin:           'bg-dash-primary-lt text-dash-primary-dk',
  catalog_manager: 'bg-dash-success-lt text-dash-success-dk',
  sales:           'bg-dash-paper-2 text-dash-text-2',
  support:         'bg-dash-paper-2 text-dash-text-2',
  read_only:       'bg-dash-bg text-dash-muted',
}

const stats = computed(() => ({
  total:     admins.value.length,
  active:    admins.value.filter(a => a.adminStatus === 'active').length,
  suspended: admins.value.filter(a => a.adminStatus === 'suspended').length,
}))

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Stats strip -->
    <div class="grid grid-cols-3 gap-4">
      <div
        v-for="(val, label) in { 'Total Admins': stats.total, 'Active': stats.active, 'Suspended': stats.suspended }"
        :key="label"
        class="bg-dash-paper rounded-card border border-dash-border px-5 py-4"
      >
        <p class="text-2xs text-dash-muted uppercase tracking-widest mb-1">{{ label }}</p>
        <p class="font-display text-2xl font-semibold text-dash-text">{{ val }}</p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-dash-text">{{ $t('admins.members') }}</p>
      <button
        @click="showForm = !showForm"
        class="h-8 px-4 bg-dash-text text-white text-xs font-medium rounded-btn hover:opacity-90 transition-opacity"
      >
        + {{ $t('admins.newAdmin') }}
      </button>
    </div>

    <!-- Create form -->
    <form v-if="showForm" @submit.prevent="createAdmin"
      class="bg-dash-paper rounded-card border border-dash-border p-5 space-y-4">
      <p class="text-sm font-medium text-dash-text mb-3">{{ $t('admins.createAdmin') }}</p>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-2xs text-dash-muted mb-1 block">{{ $t('admins.name') }}</label>
          <input v-model="form.name" required
            class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
        </div>
        <div>
          <label class="text-2xs text-dash-muted mb-1 block">{{ $t('admins.phone') }}</label>
          <input v-model="form.phone" required dir="ltr" placeholder="+218..."
            class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
        </div>
        <div>
          <label class="text-2xs text-dash-muted mb-1 block">{{ $t('admins.role') }}</label>
          <select v-model="form.role"
            class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary">
            <option value="admin">Admin</option>
            <option value="catalog_manager">Catalog Manager</option>
            <option value="sales">Sales</option>
            <option value="support">Support</option>
            <option value="read_only">Read-only</option>
          </select>
        </div>
        <div>
          <label class="text-2xs text-dash-muted mb-1 block">{{ $t('admins.tempPassword') }}</label>
          <div class="flex gap-2">
            <input v-model="form.password" required type="text" dir="ltr"
              class="flex-1 rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary font-mono" />
            <button type="button" @click="generatePassword"
              class="h-8 px-3 border border-dash-border rounded-btn text-xs text-dash-text hover:bg-dash-bg transition-colors whitespace-nowrap">
              {{ $t('admins.generate') }}
            </button>
          </div>
        </div>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" @click="showForm = false"
          class="h-8 px-4 border border-dash-border rounded-btn text-xs text-dash-text hover:bg-dash-bg transition-colors">
          Cancel
        </button>
        <button type="submit"
          class="h-8 px-4 bg-dash-text text-white rounded-btn text-xs hover:opacity-90 transition-opacity">
          Create
        </button>
      </div>
    </form>

    <!-- Error banner -->
    <div v-if="error" class="rounded-card border border-dash-danger/30 bg-dash-danger-lt px-4 py-3 text-xs text-dash-danger">
      {{ error }}
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-xs text-dash-muted py-8 text-center">Loading…</div>
    <div v-else class="bg-dash-paper rounded-card border border-dash-border overflow-hidden">
      <table class="w-full text-xs">
        <thead class="bg-dash-bg">
          <tr>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.name') }}</th>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.phone') }}</th>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.role') }}</th>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.status') }}</th>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-dash-border">
          <tr v-for="a in admins" :key="a.id" class="hover:bg-dash-bg/40 transition-colors">
            <td class="py-3 px-4">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-full bg-dash-primary/15 flex items-center justify-center text-dash-primary font-semibold text-xs shrink-0">
                  {{ a.name[0]?.toUpperCase() }}
                </div>
                <span class="font-medium text-dash-text">{{ a.name }}</span>
              </div>
            </td>
            <td class="py-3 px-4 text-dash-muted" dir="ltr">{{ a.phone }}</td>
            <td class="py-3 px-4">
              <span
                class="px-2 py-0.5 rounded-tag text-2xs font-medium"
                :class="ROLE_COLORS[a.role] ?? 'bg-dash-bg text-dash-muted'"
              >
                {{ ROLE_LABELS[a.role] ?? a.role }}
              </span>
            </td>
            <td class="py-3 px-4">
              <span
                class="px-2 py-0.5 rounded-tag text-2xs font-medium"
                :class="a.adminStatus === 'active' ? 'bg-dash-success-lt text-dash-success-dk' : 'bg-dash-danger-lt text-dash-danger'"
              >
                {{ a.adminStatus === 'active' ? $t('admins.active') : $t('admins.suspended') }}
              </span>
            </td>
            <td class="py-3 px-4">
              <div class="flex gap-2" v-if="a.role !== 'owner'">
                <button @click="resetPassword(a)"
                  class="text-2xs text-dash-muted hover:text-dash-text border border-dash-border rounded px-2 py-1 transition-colors">
                  {{ $t('admins.resetPassword') }}
                </button>
                <button
                  @click="toggleStatus(a)"
                  class="text-2xs border rounded px-2 py-1 transition-colors"
                  :class="a.adminStatus === 'active'
                    ? 'text-dash-danger border-dash-danger/30 hover:bg-dash-danger-lt'
                    : 'text-dash-success border-dash-success/30 hover:bg-dash-success-lt'"
                >
                  {{ a.adminStatus === 'active' ? $t('admins.suspend') : $t('admins.activate') }}
                </button>
              </div>
              <span v-else class="text-2xs text-dash-faint">Owner</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!admins.length" class="text-xs text-dash-muted text-center py-8">No admins found.</p>
    </div>
  </div>
</template>

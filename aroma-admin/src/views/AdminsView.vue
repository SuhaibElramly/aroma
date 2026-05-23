<!-- aroma-admin/src/views/AdminsView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import type { AdminMember, AdminRole } from '../types'
import {
  apiGetAdmins,
  apiCreateAdmin,
  apiToggleAdminStatus,
  apiResetAdminPassword,
  apiCreateRole,
  apiUpdateRole,
  apiDeleteRole,
} from '../api/admin'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const { isOwner } = storeToRefs(auth)

// ── API state ─────────────────────────────────────────────────────────
const admins   = ref<AdminMember[]>([])
const loading  = ref(true)
const showForm = ref(false)
const error    = ref<string | null>(null)
const form     = ref({ name: '', phone: '+218 ', role: 'admin', password: '', showPw: false })

const { t } = useI18n()

async function load() {
  error.value = null
  try {
    loading.value = true
    const res = await apiGetAdmins()
    admins.value = res.data
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to load admins'
  } finally {
    loading.value = false
  }
}

async function createAdmin() {
  error.value = null
  try {
    const res = await apiCreateAdmin({
      name:     form.value.name,
      phone:    form.value.phone,
      role:     form.value.role,
      password: form.value.password,
    })
    admins.value.push(res.data)
    showForm.value = false
    form.value = { name: '', phone: '+218 ', role: 'admin', password: '', showPw: false }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to create admin'
  }
}

async function toggleStatus(a: AdminMember) {
  error.value = null
  try {
    const res = await apiToggleAdminStatus(a.id)
    const idx = admins.value.findIndex(x => x.id === a.id)
    if (idx !== -1) admins.value[idx] = { ...admins.value[idx], ...res.data }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to update status'
  }
}

async function resetPassword(a: AdminMember) {
  error.value = null
  const pw = prompt('New temporary password (min 8 chars):')
  if (!pw || pw.length < 8) return
  try {
    await apiResetAdminPassword(a.id, pw)
    alert('Password reset successfully.')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to reset password'
  }
}

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  form.value.password = Array.from(bytes, b => chars[b % chars.length]).join('')
  form.value.showPw = true
}

function copyPassword() {
  if (navigator.clipboard && form.value.password) {
    navigator.clipboard.writeText(form.value.password)
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────
const activeTab = ref<'members' | 'roles'>('members')

// ── Roles & permissions ───────────────────────────────────────────────
const rolesWithCounts = computed(() =>
  auth.roles.map(r => ({
    ...r,
    members: admins.value.filter(a => a.role === r.slug).length,
  }))
)

const selectedRoleSlug = ref('admin')
const selectedRole = computed(() =>
  rolesWithCounts.value.find(r => r.slug === selectedRoleSlug.value) ?? rolesWithCounts.value[0]
)

interface PermGroup {
  id: string
  label: string
  rows: { id: string; name: string }[]
}

const permGroups = computed<PermGroup[]>(() => [
  { id: 'catalog', label: t('admins.permGroups.catalog'), rows: [
    { id: 'products', name: t('admins.permGroups.products') },
    { id: 'brands',   name: t('admins.permGroups.brands') },
    { id: 'specs',    name: t('admins.permGroups.specs') },
  ]},
  { id: 'sales', label: t('admins.permGroups.sales'), rows: [
    { id: 'orders',  name: t('admins.permGroups.orders') },
    { id: 'coupons', name: t('admins.permGroups.coupons') },
  ]},
  { id: 'people', label: t('admins.permGroups.people'), rows: [
    { id: 'customers', name: t('admins.permGroups.customers') },
  ]},
  { id: 'system', label: t('admins.permGroups.system'), rows: [
    { id: 'admins', name: t('admins.permGroups.adminTeam') },
  ]},
])

// ── Edit / create / delete state ──────────────────────────────────────
const editingRoleSlug = ref<string | null>(null)
const isCreating      = ref(false)
const editDraft       = ref<{ name: string; color: string; permissions: Record<string, number[]> }>({
  name: '', color: '', permissions: {},
})
const deleteConfirm = ref<string | null>(null)
const editError     = ref<string | null>(null)
const saving        = ref(false)

const isEditing = computed(() => editingRoleSlug.value !== null || isCreating.value)

const COLOR_PALETTE = [
  'oklch(26% 0.04 250)',
  'oklch(46% 0.075 210)',
  'oklch(56% 0.10 340)',
  'oklch(58% 0.10 32)',
  'oklch(52% 0.045 145)',
  'oklch(56% 0.035 240)',
  'oklch(52% 0.08 280)',
  'oklch(54% 0.09 60)',
]

const EMPTY_PERMISSIONS: Record<string, number[]> = {
  products:  [0,0,0],
  orders:    [0,0,0],
  coupons:   [0,0,0],
  customers: [0,0,0],
  brands:    [0,0,0],
  specs:     [0,0,0],
  admins:    [0,0,0],
}

function startEdit(slug: string) {
  const role = auth.roles.find(r => r.slug === slug)
  if (!role) return
  editDraft.value = {
    name:        role.name,
    color:       role.color,
    permissions: JSON.parse(JSON.stringify(role.permissions)),
  }
  editingRoleSlug.value = slug
  isCreating.value      = false
  editError.value       = null
}

function startCreate() {
  editDraft.value = {
    name:        '',
    color:       COLOR_PALETTE[1],
    permissions: JSON.parse(JSON.stringify(EMPTY_PERMISSIONS)),
  }
  editingRoleSlug.value = null
  isCreating.value      = true
  editError.value       = null
  auth.roles.push({ id: -1, name: '', slug: '__new__', color: COLOR_PALETTE[1], permissions: { ...EMPTY_PERMISSIONS } })
  selectedRoleSlug.value = '__new__'
}

function cancelEdit() {
  if (isCreating.value) {
    const idx = auth.roles.findIndex(r => r.slug === '__new__')
    if (idx !== -1) auth.roles.splice(idx, 1)
    selectedRoleSlug.value = auth.roles[0]?.slug ?? 'admin'
  }
  editingRoleSlug.value = null
  isCreating.value      = false
  editDraft.value       = { name: '', color: '', permissions: {} }
  editError.value       = null
}

function togglePerm(resource: string, idx: number) {
  const current = [...(editDraft.value.permissions[resource] ?? [0, 0, 0])]
  current[idx] = current[idx] ? 0 : 1
  editDraft.value = {
    ...editDraft.value,
    permissions: {
      ...editDraft.value.permissions,
      [resource]: current,
    },
  }
}

async function saveEdit() {
  editError.value = null
  saving.value    = true
  try {
    if (isCreating.value) {
      const res     = await apiCreateRole(editDraft.value)
      const tempIdx = auth.roles.findIndex(r => r.slug === '__new__')
      if (tempIdx !== -1) auth.roles.splice(tempIdx, 1, res.data)
      selectedRoleSlug.value = res.data.slug
    } else {
      const res = await apiUpdateRole(editingRoleSlug.value!, editDraft.value)
      const idx = auth.roles.findIndex(r => r.slug === editingRoleSlug.value)
      if (idx !== -1) auth.roles.splice(idx, 1, res.data)
      selectedRoleSlug.value = res.data.slug
    }
    editingRoleSlug.value = null
    isCreating.value      = false
    editDraft.value       = { name: '', color: '', permissions: {} }
  } catch (e: any) {
    editError.value = e?.response?.data?.message ?? 'Failed to save'
  } finally {
    saving.value = false
  }
}

async function deleteRole(slug: string) {
  editError.value = null
  try {
    await apiDeleteRole(slug)
    const idx = auth.roles.findIndex(r => r.slug === slug)
    if (idx !== -1) auth.roles.splice(idx, 1)
    selectedRoleSlug.value = auth.roles[0]?.slug ?? ''
    deleteConfirm.value    = null
  } catch (e: any) {
    editError.value     = e?.response?.data?.message ?? 'Failed to delete'
    deleteConfirm.value = null
  }
}

function getPerm(resource: string, idx: number): boolean {
  if (!isEditing.value && selectedRole.value?.slug === 'owner') return true
  const source = isEditing.value ? editDraft.value.permissions : selectedRole.value?.permissions
  if (!source) return false
  return (source[resource]?.[idx] ?? 0) === 1
}

// ── KPI helpers ───────────────────────────────────────────────────────
const stats = computed(() => ({
  total:     admins.value.length,
  active:    admins.value.filter(a => a.adminStatus === 'active').length,
  roles:     auth.roles.length,
  suspended: admins.value.filter(a => a.adminStatus === 'suspended').length,
}))

// ── Visual helpers ────────────────────────────────────────────────────
function roleLabel(role: string): string {
  return auth.roles.find(r => r.slug === role)?.name ?? role
}

function roleColor(role: string): string {
  return auth.roles.find(r => r.slug === role)?.color ?? 'oklch(52% 0.07 200)'
}

function initials(name: string): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase()
}

function adminHue(name: string): number {
  const palette = [32, 340, 200, 96, 48, 140, 280, 18, 54, 24, 8, 160]
  return palette[(name?.charCodeAt(0) ?? 65) % palette.length]
}

onMounted(load)
</script>

<template>
  <div class="px-9 pb-12 pt-4 space-y-5 max-w-[1280px]">

    <!-- KPI strip -->
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ $t('admins.kpiAllAdmins') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ stats.total }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ $t('admins.kpiOnTeam') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ $t('admins.kpiActive') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ stats.active }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ $t('admins.kpiSignedInWeek') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ $t('admins.kpiRoles') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ stats.roles }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ $t('admins.kpiWithPermissions') }}</p>
      </div>
      <div class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <p class="text-[12px] font-medium text-dash-muted">{{ $t('admins.kpiSuspended') }}</p>
        <p class="font-display text-[28px] mt-2 leading-none text-dash-text">{{ stats.suspended }}</p>
        <p class="text-[11.5px] mt-2 text-dash-muted">{{ $t('admins.kpiNoAccess') }}</p>
      </div>
    </div>

    <!-- Tabs + action bar -->
    <div class="bg-dash-paper border border-dash-border rounded-card p-4 flex items-center gap-3 flex-wrap shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
      <!-- Tab pills -->
      <div class="flex items-center gap-1 p-1 rounded-lg border border-dash-border-lt bg-dash-paper-2">
        <button
          v-for="[key, label] in [['members', $t('admins.tabTeam')], ['roles', $t('admins.tabRoles')]]"
          :key="key"
          class="px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-all"
          :style="{
            background: activeTab === key ? 'white' : 'transparent',
            color: activeTab === key ? 'var(--dash-text)' : 'var(--dash-muted)',
            boxShadow: activeTab === key ? '0 1px 2px rgba(0,0,0,.05)' : 'none'
          }"
          @click="activeTab = (key as 'members' | 'roles')"
        >{{ label }}</button>
      </div>
      <div class="flex-1" />
      <!-- New admin button (members tab) -->
      <button
        v-if="activeTab === 'members'"
        class="h-9 px-3 rounded-lg text-[12px] font-medium text-white inline-flex items-center gap-1.5 whitespace-nowrap bg-dash-text hover:opacity-90 transition-opacity"
        @click="showForm = !showForm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {{ $t('admins.newAdmin') }}
      </button>
    </div>

    <!-- ── Members tab ── -->
    <template v-if="activeTab === 'members'">

      <!-- Create form -->
      <div v-if="showForm" class="bg-dash-paper border border-dash-border rounded-card p-5 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ $t('admins.createAdmin') }}</p>
            <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">{{ $t('admins.newAdmin') }}</h3>
          </div>
          <button
            class="h-8 w-8 grid place-items-center rounded-lg border border-dash-border bg-white text-dash-text-2 hover:bg-dash-paper-2 transition-colors"
            @click="showForm = false"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <form @submit.prevent="createAdmin" class="space-y-3">
          <div class="grid grid-cols-12 gap-3">
            <div class="col-span-5">
              <label class="text-[10.5px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1 block">{{ $t('admins.name') }}</label>
              <input
                v-model="form.name"
                required
                placeholder="Mohamed Said"
                class="w-full h-9 px-3 rounded-lg border border-dash-border bg-dash-paper-2 text-[12.5px] outline-none text-dash-text-2 focus:border-dash-primary transition-colors"
              />
            </div>
            <div class="col-span-4">
              <label class="text-[10.5px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1 block">{{ $t('admins.phone') }}</label>
              <input
                v-model="form.phone"
                required
                dir="ltr"
                placeholder="+218..."
                class="w-full h-9 px-3 rounded-lg border border-dash-border bg-dash-paper-2 text-[12.5px] outline-none text-dash-text-2 font-mono focus:border-dash-primary transition-colors"
              />
              <p class="text-[10px] mt-1 text-dash-faint">{{ $t('admins.phoneHint') }}</p>
            </div>
            <div class="col-span-3">
              <label class="text-[10.5px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1 block">{{ $t('admins.role') }}</label>
              <select
                v-model="form.role"
                class="w-full h-9 px-3 rounded-lg border border-dash-border bg-dash-paper-2 text-[12.5px] outline-none text-dash-text-2 focus:border-dash-primary transition-colors"
              >
                <option
                  v-for="r in auth.roles"
                  :key="r.slug"
                  :value="r.slug"
                  :style="{ display: r.slug === 'owner' && !isOwner ? 'none' : '' }"
                >{{ r.name }}</option>
              </select>
            </div>
            <div class="col-span-12">
              <div class="flex items-center justify-between mb-1">
                <label class="text-[10.5px] font-semibold uppercase tracking-[.14em] text-dash-faint">{{ $t('admins.tempPassword') }}</label>
                <button type="button" class="text-[10.5px] font-medium text-dash-primary hover:opacity-80" @click="generatePassword">{{ $t('admins.generate') }}</button>
              </div>
              <div class="flex items-center gap-2 px-3 rounded-lg border border-dash-border bg-dash-paper-2 h-9">
                <input
                  :type="form.showPw ? 'text' : 'password'"
                  v-model="form.password"
                  required
                  :placeholder="$t('admins.passwordPlaceholder')"
                  class="bg-transparent text-[12.5px] outline-none flex-1 font-mono text-dash-text-2"
                  :style="{ letterSpacing: form.showPw ? '0' : '0.18em' }"
                />
                <button type="button" class="text-[10.5px] font-medium text-dash-muted" @click="form.showPw = !form.showPw">
                  {{ form.showPw ? $t('admins.hidePassword') : $t('admins.showPassword') }}
                </button>
                <button v-if="form.password" type="button" class="text-[10.5px] font-medium text-dash-primary" @click="copyPassword">{{ $t('admins.copyPassword') }}</button>
              </div>
              <p class="text-[10px] mt-1.5 text-dash-muted">
                <span class="text-dash-text-2">→</span> {{ $t('admins.passwordShareHint') }}
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-dash-border-lt">
            <button type="button" @click="showForm = false" class="h-9 px-3.5 rounded-lg text-[12.5px] font-medium border border-dash-border bg-white text-dash-text-2 hover:bg-dash-paper-2 transition-colors">{{ $t('common.cancel') }}</button>
            <button type="submit" class="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white bg-dash-text hover:opacity-90 transition-opacity">{{ $t('admins.createAdmin') }}</button>
          </div>
        </form>
      </div>

      <!-- Error banner -->
      <div v-if="error" class="rounded-card border border-dash-danger/30 bg-dash-danger-lt px-4 py-3 text-xs text-dash-danger">
        {{ error }}
      </div>

      <!-- Admins table -->
      <div class="bg-dash-paper border border-dash-border rounded-card overflow-hidden shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">
        <div v-if="loading" class="py-10 text-center text-xs text-dash-muted">{{ $t('common.loading') }}</div>
        <table v-else class="w-full text-[12.5px]">
          <thead>
            <tr class="text-[10.5px] uppercase tracking-wider text-dash-faint">
              <th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ $t('admins.name') }}</th>
              <th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ $t('admins.role') }}</th>
              <th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ $t('admins.status') }}</th>
              <th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ $t('admins.joined') }}</th>
              <th class="py-3 px-6 border-b border-dash-border-lt"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in admins" :key="a.id" class="hover:bg-dash-paper-2 transition-colors">
              <!-- Name with avatar -->
              <td class="py-3.5 px-6 border-b border-dash-border-lt">
                <div class="flex items-center gap-3">
                  <div
                    class="h-9 w-9 rounded-full grid place-items-center text-[11px] font-semibold text-white shrink-0"
                    :style="{ background: `oklch(52% 0.06 ${adminHue(a.name)})` }"
                  >
                    {{ initials(a.name) }}
                  </div>
                  <div class="leading-tight">
                    <p class="font-medium text-dash-text">{{ a.name }}</p>
                    <p class="text-[10.5px] text-dash-faint font-mono" dir="ltr">{{ a.phone }}</p>
                  </div>
                </div>
              </td>
              <!-- Role chip -->
              <td class="py-3.5 px-6 border-b border-dash-border-lt">
                <span class="inline-flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full" :style="{ background: roleColor(a.role) }" />
                  <span class="font-medium text-dash-text-2">{{ roleLabel(a.role) }}</span>
                </span>
              </td>
              <!-- Status chip -->
              <td class="py-3.5 px-6 border-b border-dash-border-lt">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                  :class="a.adminStatus === 'active'
                    ? 'bg-dash-success-lt text-dash-success-dk'
                    : 'bg-dash-danger-lt text-dash-danger'"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="a.adminStatus === 'active' ? 'bg-dash-success' : 'bg-dash-danger'"
                  />
                  {{ a.adminStatus === 'active' ? $t('admins.active') : $t('admins.suspended') }}
                </span>
              </td>
              <!-- Joined -->
              <td class="py-3.5 px-6 border-b border-dash-border-lt text-dash-muted">{{ a.createdAt ? a.createdAt.slice(0, 10) : '—' }}</td>
              <!-- Actions -->
              <td class="py-3.5 px-4 border-b border-dash-border-lt text-end">
                <div v-if="a.role !== 'owner'" class="inline-flex items-center gap-1">
                  <button
                    v-if="a.adminStatus === 'active'"
                    class="text-[11px] font-medium px-2 py-1 text-dash-muted hover:text-dash-text transition-colors"
                    @click="resetPassword(a)"
                  >{{ $t('admins.resetPassword') }}</button>
                  <button
                    class="text-[11px] font-medium px-2 py-1 transition-colors"
                    :class="a.adminStatus === 'active' ? 'text-dash-danger hover:opacity-80' : 'text-dash-success-dk hover:opacity-80'"
                    @click="toggleStatus(a)"
                  >
                    {{ a.adminStatus === 'active' ? $t('admins.suspend') : $t('admins.activate') }}
                  </button>
                </div>
                <span v-else class="text-[11px] text-dash-faint">{{ $t('admins.ownerLabel') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !admins.length" class="text-xs text-dash-muted text-center py-8">{{ $t('admins.noAdmins') }}</p>
      </div>
    </template>

    <!-- ── Roles tab ── -->
    <template v-else>
      <div class="grid grid-cols-12 gap-4">

        <!-- Left: role list -->
        <div class="col-span-4 bg-dash-paper border border-dash-border rounded-card overflow-hidden shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] flex flex-col">
          <div class="divide-y divide-dash-border-lt flex-1">
            <button
              v-for="role in rolesWithCounts"
              :key="role.slug"
              class="w-full flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-dash-paper-2"
              :class="{ 'bg-dash-primary-lt': selectedRoleSlug === role.slug }"
              @click="selectedRoleSlug = role.slug"
            >
              <div
                class="h-9 w-9 rounded-lg grid place-items-center shrink-0 border border-dash-border-lt"
                :style="{
                  background: selectedRoleSlug === role.slug ? 'white' : 'var(--dash-paper-2)',
                  color: role.color
                }"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-[13px] font-semibold text-dash-text">
                    {{ role.slug === '__new__' ? (editDraft.name || 'New Role') : role.name }}
                  </p>
                  <span v-if="role.slug !== '__new__'" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-dash-paper-2 border border-dash-border-lt text-dash-muted">{{ role.members }}</span>
                </div>
              </div>
              <svg v-if="selectedRoleSlug === role.slug" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-dash-primary shrink-0 mt-0.5"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
            </button>
          </div>
          <!-- New role button (owner only, not while editing) -->
          <div v-if="isOwner && !isEditing" class="p-3 border-t border-dash-border-lt">
            <button
              class="w-full h-8 border-2 border-dashed border-dash-border rounded-lg flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-dash-muted hover:text-dash-text hover:border-dash-border-dk transition-colors"
              @click="startCreate"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              New role
            </button>
          </div>
        </div>

        <!-- Right: permission matrix -->
        <div class="col-span-8 bg-dash-paper border border-dash-border rounded-card p-6 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">

          <!-- Header row -->
          <div class="flex items-start justify-between gap-3 mb-5">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="h-12 w-12 rounded-xl grid place-items-center border border-dash-border-lt shrink-0"
                :style="{ background: 'var(--dash-primary-lt)', color: isEditing ? editDraft.color : (selectedRole?.color ?? '') }"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/></svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ isEditing ? (isCreating ? 'New Role' : 'Editing') : $t('admins.roleHeading') }}</p>
                <!-- Name input (edit mode) or heading (view mode) -->
                <input
                  v-if="isEditing"
                  v-model="editDraft.name"
                  placeholder="Role name"
                  maxlength="60"
                  class="font-display text-[22px] leading-tight text-dash-text bg-transparent border-b border-dash-border focus:border-dash-primary outline-none w-full mt-0.5"
                />
                <h2 v-else class="font-display text-[22px] leading-tight mt-0.5 text-dash-text">{{ selectedRole?.name }}</h2>
              </div>
            </div>
            <!-- Action buttons -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- Edit mode: Save + Cancel -->
              <template v-if="isEditing">
                <button
                  class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white text-dash-text-2 hover:bg-dash-paper-2 transition-colors"
                  @click="cancelEdit"
                >{{ $t('common.cancel') }}</button>
                <button
                  class="h-8 px-4 rounded-lg text-[12px] font-semibold text-white bg-dash-text hover:opacity-90 transition-opacity disabled:opacity-50"
                  :disabled="saving || !editDraft.name.trim()"
                  @click="saveEdit"
                >{{ saving ? 'Saving…' : $t('common.save') }}</button>
              </template>
              <!-- View mode: Delete + Edit (owner only, not for owner role) -->
              <template v-else-if="isOwner && selectedRole?.slug !== 'owner'">
                <!-- Delete confirm flow -->
                <template v-if="deleteConfirm === selectedRole?.slug">
                  <span class="text-[11.5px] text-dash-text-2 mr-1">Delete this role?</span>
                  <button
                    class="h-8 px-3 rounded-lg text-[12px] font-semibold bg-dash-danger text-white hover:opacity-80 transition-opacity"
                    @click="deleteRole(selectedRole!.slug)"
                  >Confirm</button>
                  <button
                    class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white text-dash-text-2 hover:bg-dash-paper-2 transition-colors"
                    @click="deleteConfirm = null"
                  >{{ $t('common.cancel') }}</button>
                </template>
                <template v-else>
                  <button
                    class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white transition-colors"
                    :class="(selectedRole?.members ?? 0) > 0 ? 'text-dash-faint cursor-not-allowed' : 'text-dash-danger hover:bg-dash-danger-lt'"
                    :disabled="(selectedRole?.members ?? 0) > 0"
                    :title="(selectedRole?.members ?? 0) > 0 ? 'Remove all members first' : ''"
                    @click="deleteConfirm = selectedRole?.slug ?? null"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline -mt-px mr-0.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                    Delete
                  </button>
                  <button
                    class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white text-dash-text-2 hover:bg-dash-paper-2 whitespace-nowrap transition-colors"
                    @click="startEdit(selectedRole!.slug)"
                  >{{ $t('common.edit') }}</button>
                </template>
              </template>
            </div>
          </div>

          <!-- Color palette (edit mode only) -->
          <div v-if="isEditing" class="flex items-center gap-2 mb-5">
            <span class="text-[11px] font-semibold text-dash-faint uppercase tracking-[.12em] mr-1">Color</span>
            <button
              v-for="color in COLOR_PALETTE"
              :key="color"
              type="button"
              class="h-6 w-6 rounded-full transition-transform hover:scale-110"
              :style="{
                background: color,
                boxShadow: editDraft.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none'
              }"
              @click="editDraft.color = color"
            />
          </div>

          <!-- Error banner -->
          <div v-if="editError" class="mb-4 rounded-lg border border-dash-danger/30 bg-dash-danger-lt px-4 py-2.5 text-[11.5px] text-dash-danger">
            {{ editError }}
          </div>

          <!-- Permission matrix -->
          <table class="w-full text-[12.5px]">
            <thead>
              <tr class="text-[10.5px] uppercase tracking-wider text-dash-faint">
                <th class="text-start font-semibold py-2 border-b border-dash-border-lt">{{ $t('admins.colResource') }}</th>
                <th class="font-semibold py-2 border-b border-dash-border-lt text-center w-20">{{ $t('admins.colView') }}</th>
                <th class="font-semibold py-2 border-b border-dash-border-lt text-center w-20">{{ $t('admins.colEdit') }}</th>
                <th class="font-semibold py-2 border-b border-dash-border-lt text-center w-20">{{ $t('admins.colDelete') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in permGroups" :key="group.id">
                <tr>
                  <td colspan="4" class="pt-4 pb-1 text-[10px] uppercase tracking-[.16em] font-semibold text-dash-faint">{{ group.label }}</td>
                </tr>
                <tr v-for="row in group.rows" :key="row.id">
                  <td class="py-2.5 border-b border-dash-border-lt">
                    <span class="font-medium text-dash-text-2">{{ row.name }}</span>
                  </td>
                  <td v-for="idx in [0, 1, 2]" :key="idx" class="py-2.5 border-b border-dash-border-lt text-center">
                    <button
                      v-if="isEditing"
                      type="button"
                      class="inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                      :style="{
                        background: getPerm(row.id, idx) ? 'var(--dash-success)' : 'var(--dash-paper-2)',
                        border: getPerm(row.id, idx) ? '1px solid var(--dash-success-dk)' : '2px solid var(--dash-border)'
                      }"
                      @click="togglePerm(row.id, idx)"
                    >
                      <svg v-if="getPerm(row.id, idx)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M5 12l5 5 9-11"/></svg>
                    </button>
                    <span
                      v-else
                      class="inline-flex items-center justify-center h-6 w-6 rounded-md"
                      :style="{
                        background: getPerm(row.id, idx) ? 'var(--dash-success)' : 'var(--dash-paper-2)',
                        border: getPerm(row.id, idx) ? '1px solid var(--dash-success-dk)' : '1px solid var(--dash-border)'
                      }"
                    >
                      <svg v-if="getPerm(row.id, idx)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M5 12l5 5 9-11"/></svg>
                    </span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>

  </div>
</template>

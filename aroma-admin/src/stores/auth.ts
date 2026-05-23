import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiLogin, apiGetMe, apiGetRoles } from '../api/admin'
import type { AdminUser, AdminRole } from '../types'

export type PermAction = 'view' | 'edit' | 'delete'
const ACTION_IDX: Record<PermAction, number> = { view: 0, edit: 1, delete: 2 }

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user  = ref<AdminUser | null>(null)
  const roles = ref<AdminRole[]>([])

  const isAuthenticated = computed(() => !!token.value)
  const isOwner         = computed(() => user.value?.role === 'owner')

  const rolePermsMap = computed<Record<string, 'all' | Record<string, number[]>>>(() =>
    Object.fromEntries(
      roles.value.map(r => [r.slug, r.slug === 'owner' ? 'all' : r.permissions])
    )
  )

  function can(resource: string, action: PermAction = 'view'): boolean {
    const role = user.value?.role
    if (!role) return false
    const perms = rolePermsMap.value[role]
    if (!perms) return false
    if (perms === 'all') return true
    return (perms[resource]?.[ACTION_IDX[action]] ?? 0) === 1
  }

  async function login(phone: string, password: string) {
    const res = await apiLogin(phone, password)
    if (!res.data.user.is_admin) {
      throw new Error('This account does not have admin access.')
    }
    token.value = res.data.token
    user.value  = res.data.user
    localStorage.setItem('admin_token', res.data.token)
  }

  async function init() {
    if (!token.value) return
    const needsUser  = !user.value
    const needsRoles = roles.value.length === 0
    if (!needsUser && !needsRoles) return

    if (needsUser) {
      try {
        const res = await apiGetMe()
        user.value = res.data
      } catch {
        token.value = null
        user.value  = null
        roles.value = []
        localStorage.removeItem('admin_token')
        return
      }
    }

    if (needsRoles) {
      try {
        const res = await apiGetRoles()
        roles.value = res.data
      } catch {
        // roles remain empty; can() will return false for all resources
      }
    }
  }

  function logout() {
    token.value = null
    user.value  = null
    roles.value = []
    localStorage.removeItem('admin_token')
  }

  return { token, user, roles, isAuthenticated, isOwner, can, login, logout, init }
})

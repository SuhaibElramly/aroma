import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiLogin, apiGetMe } from '../api/admin'
import type { AdminUser } from '../types'

// resource → [view, edit, delete]
const ROLE_PERMS: Record<string, 'all' | Record<string, number[]>> = {
  owner:           'all',
  admin:           { products:[1,1,1], orders:[1,1,1], coupons:[1,1,1], customers:[1,1,0], brands:[1,1,1], specs:[1,1,1], admins:[1,0,0] },
  catalog_manager: { products:[1,1,1], orders:[1,0,0], coupons:[1,1,0], customers:[1,0,0], brands:[1,1,1], specs:[1,1,1], admins:[0,0,0] },
  sales:           { products:[1,0,0], orders:[1,1,0], coupons:[1,0,0], customers:[1,1,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] },
  support:         { products:[1,0,0], orders:[1,1,0], coupons:[1,0,0], customers:[1,1,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] },
  read_only:       { products:[1,0,0], orders:[1,0,0], coupons:[1,0,0], customers:[1,0,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] },
}

// idx: 0 = view, 1 = edit/create, 2 = delete
export type PermAction = 'view' | 'edit' | 'delete'
const ACTION_IDX: Record<PermAction, number> = { view: 0, edit: 1, delete: 2 }

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user  = ref<AdminUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isOwner         = computed(() => user.value?.role === 'owner')

  function can(resource: string, action: PermAction = 'view'): boolean {
    const role = user.value?.role
    if (!role) return false
    const perms = ROLE_PERMS[role]
    if (!perms) return false
    if (perms === 'all') return true
    return (perms[resource]?.[ACTION_IDX[action]] ?? 0) === 1
  }

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password)
    if (!res.data.user.is_admin) {
      throw new Error('This account does not have admin access.')
    }
    token.value = res.data.token
    user.value  = res.data.user
    localStorage.setItem('admin_token', res.data.token)
  }

  async function init() {
    if (!token.value) return
    try {
      const res = await apiGetMe()
      user.value = res.data
    } catch {
      token.value = null
      localStorage.removeItem('admin_token')
    }
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('admin_token')
  }

  return { token, user, isAuthenticated, isOwner, can, login, logout, init }
})

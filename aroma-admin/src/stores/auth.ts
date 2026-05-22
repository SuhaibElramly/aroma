import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiLogin, apiGetMe } from '../api/admin'
import type { AdminUser } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user  = ref<AdminUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)

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

  return { token, user, isAuthenticated, login, logout, init }
})

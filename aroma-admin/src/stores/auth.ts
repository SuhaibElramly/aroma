import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiLogin } from '../api/admin'
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

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('admin_token')
  }

  return { token, user, isAuthenticated, login, logout }
})

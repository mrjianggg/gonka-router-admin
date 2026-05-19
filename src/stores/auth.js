import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminApi } from '@/api/admin'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const username = ref(localStorage.getItem('admin_username') || '')
  const expiresAt = ref(Number(localStorage.getItem('admin_expires_at') || 0))

  const isAuthenticated = computed(() => {
    if (!token.value) return false
    if (expiresAt.value && Date.now() / 1000 > expiresAt.value) return false
    return true
  })

  async function login(user, password) {
    const data = await adminApi.login(user, password)
    token.value = data.token
    username.value = data.username
    expiresAt.value = data.expires_at
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_username', data.username)
    localStorage.setItem('admin_expires_at', String(data.expires_at))
    return data
  }

  function logout() {
    token.value = ''
    username.value = ''
    expiresAt.value = 0
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
    localStorage.removeItem('admin_expires_at')
  }

  return { token, username, expiresAt, isAuthenticated, login, logout }
})

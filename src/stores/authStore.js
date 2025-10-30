/**
 * Authentication Store
 * Manages authentication state using localStorage for persistence
 * Implements the state storage requirement from the assignment
 */

import { reactive, computed } from 'vue'
import { authService } from '../services/authService.js'

// Reactive state
const state = reactive({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
})

// Storage keys
const STORAGE_KEYS = {
  USER: 'menumanager_user',
  SESSION_TOKEN: 'menumanager_session_token',
  AUTH_STATE: 'menumanager_auth_state'
}

class AuthStore {
  constructor() {
    this.initializeFromStorage()
  }

  /**
   * Initialize state from localStorage
   */
  initializeFromStorage() {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER)
      const storedToken = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN)
      const storedAuthState = localStorage.getItem(STORAGE_KEYS.AUTH_STATE)

      if (storedUser && storedToken && storedAuthState === 'true') {
        state.user = JSON.parse(storedUser)
        state.isAuthenticated = true
        console.log('Restored user session from storage:', state.user)
      }
    } catch (error) {
      console.error('Error restoring session from storage:', error)
      this.clearStorage()
    }
  }

  /**
   * Save authentication state to localStorage
   */
  saveToStorage() {
    try {
      if (state.user && state.isAuthenticated) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user))
        localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, state.user.id || '')
        localStorage.setItem(STORAGE_KEYS.AUTH_STATE, 'true')
        console.log('Saved user session to storage')
      } else {
        this.clearStorage()
      }
    } catch (error) {
      console.error('Error saving session to storage:', error)
    }
  }

  /**
   * Clear authentication state from localStorage
   */
  clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER)
      localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.AUTH_STATE)
      console.log('Cleared user session from storage')
    } catch (error) {
      console.error('Error clearing session from storage:', error)
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    state.isLoading = loading
  }

  /**
   * Set error state
   */
  setError(error) {
    state.error = error
  }

  /**
   * Clear error state
   */
  clearError() {
    state.error = null
  }

  /**
   * Set authenticated user
   */
  setUser(user) {
    state.user = user
    state.isAuthenticated = true
    state.error = null
    this.saveToStorage()
  }

  /**
   * Clear authenticated user
   */
  clearUser() {
    state.user = null
    state.isAuthenticated = false
    state.error = null
    this.clearStorage()
  }

  /**
   * Login user
   */
  async login(username, password) {
    this.setLoading(true)
    this.clearError()

    try {
      const response = await authService.authenticate(username, password)
      
      if (response.user) {
        const userData = {
          id: response.user,
          username: username,
          loginTime: new Date().toISOString()
        }
        
        this.setUser(userData)
        return { success: true, user: userData }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      this.setError(error.message || 'Login failed')
      return { success: false, error: error.message }
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Register new user
   */
  async register(username, password) {
    this.setLoading(true)
    this.clearError()

    try {
      const response = await authService.register(username, password)
      
      if (response.user) {
        const userData = {
          id: response.user,
          username: username,
          loginTime: new Date().toISOString()
        }
        
        this.setUser(userData)
        return { success: true, user: userData }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      this.setError(error.message || 'Registration failed')
      return { success: false, error: error.message }
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Logout user
   */
  logout() {
    this.clearUser()
    console.log('User logged out')
  }

  /**
   * Check if user is admin
   */
  async checkAdminStatus() {
    if (!state.user) return false

    try {
      const response = await authService.getIsUserAdmin(state.user.id)
      return response[0]?.isAdmin || false
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  }

  /**
   * Update user password
   */
  async updatePassword(oldPassword, newPassword) {
    if (!state.user) {
      throw new Error('No user logged in')
    }

    this.setLoading(true)
    this.clearError()

    try {
      const response = await authService.updatePassword(
        state.user.id,
        oldPassword,
        newPassword
      )
      
      if (response.success) {
        return { success: true }
      } else {
        throw new Error('Password update failed')
      }
    } catch (error) {
      this.setError(error.message || 'Password update failed')
      return { success: false, error: error.message }
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Test backend connection
   */
  async testConnection() {
    try {
      const response = await authService.testConnection()
      return response
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  // Getters
  get user() {
    return state.user
  }

  get isAuthenticated() {
    return state.isAuthenticated
  }

  get isLoading() {
    return state.isLoading
  }

  get error() {
    return state.error
  }

  get username() {
    return state.user?.username || null
  }

  get userId() {
    return state.user?.id || null
  }
}

// Create and export singleton instance
export const authStore = new AuthStore()

// Export reactive state for Vue components
export const authState = state

// Computed properties for easy access
export const isAuthenticated = computed(() => state.isAuthenticated)
export const currentUser = computed(() => state.user)
export const isLoading = computed(() => state.isLoading)
export const authError = computed(() => state.error)

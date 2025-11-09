/**
 * Authentication Service
 * Handles all authentication-related API calls to the MenuManager backend
 */

import { createApiClient } from '../utils/apiClient.js'

// Create axios instance with default configuration and auth interceptor
const apiClient = createApiClient()

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`)
    console.log('Request config:', config)
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('Response received:', response)
    return response
  },
  (error) => {
    console.error('Response error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      request: error.request,
      config: error.config
    })
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.error || `HTTP error! status: ${error.response.status}`
      return Promise.reject(new Error(errorMessage))
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received. Request details:', error.request)
      return Promise.reject(new Error('Network error: Unable to connect to server. Please check if the backend is running on http://localhost:8000'))
    } else {
      // Something else happened
      return Promise.reject(new Error(error.message || 'An unexpected error occurred'))
    }
  }
)

class AuthService {
  /**
   * Test connection to the backend server
   * @returns {Promise<boolean>} - True if connection is successful
   */
  async testConnection() {
    try {
      console.log('Testing connection to backend...')
      const response = await apiClient.post('/api/UserAuthentication/_getListOfUsers', {})
      console.log('Connection test successful:', response)
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  /**
   * Authenticate a user with username and password
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<Object>} - The response containing user data
   */
  async authenticate(username, password) {
    try {
      const response = await apiClient.post('/api/UserAuthentication/authenticate', {
        username,
        password
      })
      return response.data
    } catch (error) {
      console.error('Authentication error:', error)
      throw error
    }
  }

  /**
   * Register a new user
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<Object>} - The response containing user data
   */
  async register(username, password) {
    try {
      const response = await apiClient.post('/api/UserAuthentication/register', {
        username,
        password
      })
      return response.data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Update user password
   * @param {string} user - The user ID
   * @param {string} oldPassword - The current password
   * @param {string} newPassword - The new password
   * @returns {Promise<Object>} - The response
   */
  async updatePassword(user, oldPassword, newPassword) {
    try {
      const response = await apiClient.post('/api/UserAuthentication/updatePassword', {
        user,
        oldPassword,
        newPassword
      })
      return response.data
    } catch (error) {
      console.error('Password update error:', error)
      throw error
    }
  }

  /**
   * Check if a user is an admin
   * @param {string} user - The user ID
   * @returns {Promise<Object>} - The response containing admin status
   */
  async getIsUserAdmin(user) {
    try {
      const response = await apiClient.post('/api/UserAuthentication/_getIsUserAdmin', {
        user
      })
      return response.data
    } catch (error) {
      console.error('Get admin status error:', error)
      throw error
    }
  }

  /**
   * Get list of all users
   * @returns {Promise<Object>} - The response containing list of users
   */
  async getListOfUsers() {
    try {
      const response = await apiClient.post('/api/UserAuthentication/_getListOfUsers', {})
      return response.data
    } catch (error) {
      console.error('Get users list error:', error)
      throw error
    }
  }

  /**
   * Get number of admin users
   * @returns {Promise<Object>} - The response containing admin count
   */
  async getNumberOfAdmins() {
    try {
      const response = await apiClient.post('/api/UserAuthentication/_getNumberOfAdmins', {})
      return response.data
    } catch (error) {
      console.error('Get admin count error:', error)
      throw error
    }
  }

  /**
   * Grant admin privileges to a user
   * @param {string} targetUser - The user ID to grant admin to
   * @returns {Promise<Object>} - The response
   */
  async grantAdmin(targetUser) {
    try {
      const response = await apiClient.post('/api/UserAuthentication/grantAdmin', {
        targetUser
      })
      return response.data
    } catch (error) {
      console.error('Grant admin error:', error)
      throw error
    }
  }

  /**
   * Delete a user
   * @param {string} userToDelete - The user ID to delete
   * @returns {Promise<Object>} - The response
   */
  async deleteUser(userToDelete) {
    try {
      const response = await apiClient.post('/api/UserAuthentication/deleteUser', {
        userToDelete
      })
      return response.data
    } catch (error) {
      console.error('Delete user error:', error)
      throw error
    }
  }

  /**
   * Get current user from localStorage
   * @returns {Object|null} - The current user or null if not logged in
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user')
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  /**
   * Set current user in localStorage
   * @param {Object} user - The user object to store
   */
  setCurrentUser(user) {
    try {
      localStorage.setItem('user', JSON.stringify(user))
    } catch (error) {
      console.error('Error setting current user:', error)
    }
  }

  /**
   * Remove current user from localStorage (logout)
   */
  logout() {
    try {
      localStorage.removeItem('user')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  /**
   * Get username for a specific user ID
   * @param {string} userId - The user ID
   * @returns {Promise<string>} - The username
   */
  async getUsername(userId) {
    try {
      const response = await apiClient.post('/api/UserAuthentication/_getUsername', {
        user: userId
      })
      
      // Try different ways to extract the username
      let username = null
      if (Array.isArray(response.data) && response.data.length > 0) {
        username = response.data[0]?.username
      } else if (response.data?.username) {
        username = response.data.username
      }
      
      return username || userId
    } catch (error) {
      console.error('Get username error:', error)
      return userId // Fallback to user ID if username lookup fails
    }
  }

  /**
   * Check if user is currently logged in
   * @returns {boolean} - True if user is logged in
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null
  }
}

// Create and export a singleton instance
export const authService = new AuthService()

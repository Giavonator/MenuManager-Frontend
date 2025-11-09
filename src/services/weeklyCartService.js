/**
 * Weekly Cart Service
 * Handles all WeeklyCart-related API calls to the MenuManager backend
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

class WeeklyCartService {
  /**
   * Create a new weekly cart for the week containing the specified date
   * @param {string} dateInWeek - Date string in YYYY-MM-DD format
   * @returns {Promise<Object>} - The response containing cart ID
   */
  async createCart(dateInWeek) {
    try {
      const response = await apiClient.post('/api/WeeklyCart/createCart', {
        dateInWeek
      })
      return response.data
    } catch (error) {
      console.error('Create cart error:', error)
      throw error
    }
  }

  /**
   * Delete the weekly cart corresponding to the week containing the specified date
   * @param {string} dateInWeek - Date string in YYYY-MM-DD format
   * @returns {Promise<Object>} - The response containing cart ID
   */
  async deleteCart(dateInWeek) {
    try {
      const response = await apiClient.post('/api/WeeklyCart/deleteCart', {
        dateInWeek
      })
      return response.data
    } catch (error) {
      console.error('Delete cart error:', error)
      throw error
    }
  }

  /**
   * Add a menu to the weekly cart that encompasses the menu's date
   * @param {string} menu - Menu ID
   * @param {string} menuDate - Date string in YYYY-MM-DD format
   * @returns {Promise<Object>} - The response containing cart ID
   */
  async addMenuToCart(menu, menuDate) {
    try {
      const response = await apiClient.post('/api/WeeklyCart/addMenuToCart', {
        menu,
        menuDate
      })
      return response.data
    } catch (error) {
      console.error('Add menu to cart error:', error)
      throw error
    }
  }

  /**
   * Remove a specified menu from the cart it currently belongs to
   * @param {string} menu - Menu ID
   * @returns {Promise<Object>} - The response containing cart ID
   */
  async removeMenuFromCart(menu) {
    try {
      const response = await apiClient.post('/api/WeeklyCart/removeMenuFromCart', {
        menu
      })
      return response.data
    } catch (error) {
      console.error('Remove menu from cart error:', error)
      throw error
    }
  }

  /**
   * Get the start and end dates of a specified weekly cart
   * @param {string} cart - Cart ID
   * @returns {Promise<Object>} - The response containing cart dates
   */
  async getCartDates(cart) {
    try {
      const response = await apiClient.post('/api/WeeklyCart/_getCartDates', {
        cart
      })
      return response.data
    } catch (error) {
      console.error('Get cart dates error:', error)
      throw error
    }
  }

  /**
   * Get the set of all menu IDs associated with a given weekly cart
   * @param {string} cart - Cart ID
   * @returns {Promise<Object>} - The response containing menu IDs
   */
  async getMenusInCart(cart) {
    try {
      const response = await apiClient.post('/api/WeeklyCart/_getMenusInCart', {
        cart
      })
      return response.data
    } catch (error) {
      console.error('Get menus in cart error:', error)
      throw error
    }
  }

  /**
   * Get the weekly cart that contains the specified date within its range
   * @param {string} date - Date string in YYYY-MM-DD format
   * @returns {Promise<Object>} - The response containing cart ID
   */
  async getCartByDate(date) {
    try {
      const response = await apiClient.post('/api/WeeklyCart/_getCartByDate', {
        date
      })
      return response.data
    } catch (error) {
      console.error('Get cart by date error:', error)
      throw error
    }
  }

  /**
   * Utility function to get the Sunday of the week containing a given date
   * @param {Date} date - The date to find the week for
   * @returns {Date} - The Sunday of that week
   */
  getWeekStart(date) {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day // Adjust when day is Sunday
    d.setUTCDate(diff)
    return d
  }

  /**
   * Utility function to get the Saturday of the week containing a given date
   * @param {Date} date - The date to find the week for
   * @returns {Date} - The Saturday of that week
   */
  getWeekEnd(date) {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + 6 // Adjust when day is Sunday
    d.setUTCDate(diff)
    return d
  }

  /**
   * Utility function to format date as YYYY-MM-DD
   * @param {Date} date - The date to format
   * @returns {string} - Formatted date string
   */
  formatDate(date) {
    return date.toISOString().split('T')[0]
  }

  /**
   * Utility function to get all dates in a week
   * @param {Date} weekStart - The Sunday of the week
   * @returns {Array<Date>} - Array of 7 dates (Sunday to Saturday)
   */
  getWeekDates(weekStart) {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  /**
   * Utility function to get day names for the week
   * @returns {Array<string>} - Array of day names
   */
  getDayNames() {
    return ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'E']
  }
}

// Create and export a singleton instance
export const weeklyCartService = new WeeklyCartService()

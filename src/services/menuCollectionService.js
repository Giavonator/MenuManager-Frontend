/**
 * MenuCollection Service
 * Handles all MenuCollection-related API calls to the MenuManager backend
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

class MenuCollectionService {
  /**
   * Creates a new menu for a given date, owned by a specific user
   * @param {string} name - The menu name
   * @param {string} date - The menu date
   * @param {string} actingUser - The user ID creating the menu
   * @returns {Promise<Object>} - The response containing menu ID
   */
  async createMenu(name, date, actingUser) {
    try {
      const response = await apiClient.post('/api/MenuCollection/createMenu', {
        name,
        date,
        actingUser
      })
      return response.data
    } catch (error) {
      console.error('Create menu error:', error)
      throw error
    }
  }

  /**
   * Updates either the name or the date of an existing menu
   * @param {string} menu - The menu ID
   * @param {Object} updates - Object containing name and/or date to update
   * @returns {Promise<Object>} - The response
   */
  async updateMenu(menu, updates) {
    try {
      const requestBody = { menu, ...updates }
      const response = await apiClient.post('/api/MenuCollection/updateMenu', requestBody)
      return response.data
    } catch (error) {
      console.error('Update menu error:', error)
      throw error
    }
  }

  /**
   * Adds a recipe to a menu with a specified scaling factor
   * @param {string} menu - The menu ID
   * @param {string} recipe - The recipe ID
   * @param {number} scalingFactor - The scaling factor
   * @returns {Promise<Object>} - The response
   */
  async addRecipe(menu, recipe, scalingFactor) {
    try {
      const response = await apiClient.post('/api/MenuCollection/addRecipe', {
        menu,
        recipe,
        scalingFactor
      })
      return response.data
    } catch (error) {
      console.error('Add recipe to menu error:', error)
      throw error
    }
  }

  /**
   * Removes a recipe from a menu
   * @param {string} menu - The menu ID
   * @param {string} recipe - The recipe ID
   * @returns {Promise<Object>} - The response
   */
  async removeRecipe(menu, recipe) {
    try {
      const response = await apiClient.post('/api/MenuCollection/removeRecipe', {
        menu,
        recipe
      })
      return response.data
    } catch (error) {
      console.error('Remove recipe from menu error:', error)
      throw error
    }
  }

  /**
   * Changes the scaling factor for an existing recipe within a menu
   * @param {string} menu - The menu ID
   * @param {string} recipe - The recipe ID
   * @param {number} newScalingFactor - The new scaling factor
   * @returns {Promise<Object>} - The response
   */
  async changeRecipeScaling(menu, recipe, newScalingFactor) {
    try {
      const response = await apiClient.post('/api/MenuCollection/changeRecipeScaling', {
        menu,
        recipe,
        newScalingFactor
      })
      return response.data
    } catch (error) {
      console.error('Change recipe scaling error:', error)
      throw error
    }
  }

  /**
   * Returns the name, date, and owner of a specified menu
   * @param {string} menu - The menu ID
   * @returns {Promise<Object>} - The response containing menu details
   */
  async getMenuDetails(menu) {
    try {
      const response = await apiClient.post('/api/MenuCollection/_getMenuDetails', {
        menu
      })
      return response.data
    } catch (error) {
      console.error('Get menu details error:', error)
      throw error
    }
  }

  /**
   * Returns a map of recipe IDs to their scaling factors for a given menu
   * @param {string} menu - The menu ID
   * @returns {Promise<Object>} - The response containing menu recipes
   */
  async getRecipesInMenu(menu) {
    try {
      const response = await apiClient.post('/api/MenuCollection/_getRecipesInMenu', {
        menu
      })
      return response.data
    } catch (error) {
      console.error('Get recipes in menu error:', error)
      throw error
    }
  }

  /**
   * Returns the set of all menus owned by a specific user
   * @param {string} user - The user ID
   * @returns {Promise<Object>} - The response containing user's menus
   */
  async getMenusOwnedByUser(user) {
    try {
      const response = await apiClient.post('/api/MenuCollection/_getMenusOwnedByUser', {
        user
      })
      return response.data
    } catch (error) {
      console.error('Get menus owned by user error:', error)
      throw error
    }
  }

  /**
   * Returns the menu ID associated with a specific date
   * @param {string} date - The date
   * @returns {Promise<Object>} - The response containing menu ID
   */
  async getMenuByDate(date) {
    try {
      const response = await apiClient.post('/api/MenuCollection/_getMenuByDate', {
        date
      })
      return response.data
    } catch (error) {
      console.error('Get menu by date error:', error)
      throw error
    }
  }

  /**
   * Deletes a menu from the collection
   * @param {string} menu - The menu ID
   * @returns {Promise<Object>} - The response
   */
  async deleteMenu(menu) {
    try {
      const response = await apiClient.post('/api/MenuCollection/deleteMenu', {
        menu
      })
      return response.data
    } catch (error) {
      console.error('Delete menu error:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
export const menuCollectionService = new MenuCollectionService()

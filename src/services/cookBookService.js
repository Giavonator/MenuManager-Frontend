/**
 * CookBook Service
 * Handles all CookBook-related API calls to the MenuManager backend
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
      return Promise.reject(new Error('No response received. Either lack of permissions or backend error.'))
    } else {
      // Something else happened
      return Promise.reject(new Error(error.message || 'An unexpected error occurred'))
    }
  }
)

class CookBookService {
  /**
   * Creates a new recipe with a given name and owner
   * @param {string} name - The recipe name
   * @param {string} user - The user ID
   * @returns {Promise<Object>} - The response containing recipe ID
   */
  async createRecipe(name, user) {
    try {
      const response = await apiClient.post('/api/CookBook/createRecipe', {
        name,
        user
      })
      return response.data
    } catch (error) {
      console.error('Create recipe error:', error)
      throw error
    }
  }

  /**
   * Updates a specific attribute of a recipe
   * @param {string} recipe - The recipe ID
   * @param {Object} updates - Object containing instructions, servingQuantity, dishType, or name
   * @returns {Promise<Object>} - The response
   */
  async updateRecipe(recipe, updates) {
    try {
      const requestBody = { recipe, ...updates }
      const response = await apiClient.post('/api/CookBook/updateRecipe', requestBody)
      return response.data
    } catch (error) {
      console.error('Update recipe error:', error)
      throw error
    }
  }

  /**
   * Creates a new recipe that is a copy of an existing one
   * @param {string} originalRecipe - The original recipe ID
   * @param {string} user - The new owner user ID
   * @param {string} newName - The new recipe name
   * @returns {Promise<Object>} - The response containing new recipe ID
   */
  async duplicateRecipe(originalRecipe, user, newName) {
    try {
      const response = await apiClient.post('/api/CookBook/duplicateRecipe', {
        originalRecipe,
        user,
        newName
      })
      return response.data
    } catch (error) {
      console.error('Duplicate recipe error:', error)
      throw error
    }
  }

  /**
   * Adds a new ingredient with specified details to a recipe
   * @param {string} recipe - The recipe ID
   * @param {string} name - The ingredient name
   * @param {number} quantity - The ingredient quantity
   * @param {string} units - The ingredient units
   * @returns {Promise<Object>} - The response
   */
  async addRecipeIngredient(recipe, name, quantity, units) {
    try {
      const response = await apiClient.post('/api/CookBook/addRecipeIngredient', {
        recipe,
        name,
        quantity,
        units
      })
      return response.data
    } catch (error) {
      console.error('Add recipe ingredient error:', error)
      throw error
    }
  }

  /**
   * Updates the quantity and units of an existing ingredient in a recipe
   * @param {string} recipe - The recipe ID
   * @param {string} name - The ingredient name
   * @param {number} quantity - The new quantity
   * @param {string} units - The new units
   * @returns {Promise<Object>} - The response
   */
  async updateRecipeIngredient(recipe, name, quantity, units) {
    try {
      const response = await apiClient.post('/api/CookBook/updateRecipeIngredient', {
        recipe,
        name,
        quantity,
        units
      })
      return response.data
    } catch (error) {
      console.error('Update recipe ingredient error:', error)
      throw error
    }
  }

  /**
   * Removes a specified ingredient from a recipe
   * @param {string} recipe - The recipe ID
   * @param {string} name - The ingredient name
   * @returns {Promise<Object>} - The response
   */
  async removeRecipeIngredient(recipe, name) {
    try {
      const response = await apiClient.post('/api/CookBook/removeRecipeIngredient', {
        recipe,
        name
      })
      return response.data
    } catch (error) {
      console.error('Remove recipe ingredient error:', error)
      throw error
    }
  }

  /**
   * Returns the primary attributes of a recipe
   * @param {string} recipe - The recipe ID
   * @returns {Promise<Object>} - The response containing recipe details
   */
  async getRecipeDetails(recipe) {
    try {
      const response = await apiClient.post('/api/CookBook/_getRecipeDetails', {
        recipe
      })
      return response.data
    } catch (error) {
      console.error('Get recipe details error:', error)
      throw error
    }
  }

  /**
   * Returns the set of all ingredients for a recipe
   * @param {string} recipe - The recipe ID
   * @returns {Promise<Object>} - The response containing recipe ingredients
   */
  async getRecipeIngredients(recipe) {
    try {
      const response = await apiClient.post('/api/CookBook/_getRecipeIngredients', {
        recipe
      })
      return response.data
    } catch (error) {
      console.error('Get recipe ingredients error:', error)
      throw error
    }
  }

  /**
   * Returns the set of all recipes owned by a given user
   * @param {string} user - The user ID
   * @returns {Promise<Object>} - The response containing user's recipes
   */
  async getRecipesOwnedByUser(user) {
    try {
      const response = await apiClient.post('/api/CookBook/_getRecipesOwnedByUser', {
        user
      })
      return response.data
    } catch (error) {
      console.error('Get recipes owned by user error:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
export const cookBookService = new CookBookService()

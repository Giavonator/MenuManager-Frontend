/**
 * Store Catalog Service
 * Handles all StoreCatalog-related API calls to the MenuManager backend
 */

import { createApiClient } from '../utils/apiClient.js'

// Create axios instance with default configuration and auth interceptor
const apiClient = createApiClient()

// Request interceptor (quiet by default; flip DEBUG=true to enable)
const DEBUG = false
apiClient.interceptors.request.use(
  (config) => {
    if (DEBUG) {
      console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`)
      console.log('Request config:', config)
    }
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
    if (DEBUG) console.log('Response received:', response)
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

class StoreCatalogService {
  /**
   * Create a new item in the catalog
   * @param {string} primaryName - The primary name for the item
   * @returns {Promise<Object>} - The response containing the new item ID
   */
  async createItem(primaryName) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/createItem', {
        primaryName
      })
      return response.data
    } catch (error) {
      console.error('Create item error:', error)
      throw error
    }
  }

  /**
   * Delete an item from the catalog
   * @param {string} item - The item ID to delete
   * @returns {Promise<Object>} - The response
   */
  async deleteItem(item) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/deleteItem', {
        item
      })
      return response.data
    } catch (error) {
      console.error('Delete item error:', error)
      throw error
    }
  }

  /**
   * Add a purchase option to an item
   * @param {string} item - The item ID
   * @param {number} quantity - The quantity
   * @param {string} units - The units
   * @param {number} price - The price
   * @param {string} store - The store name
   * @returns {Promise<Object>} - The response containing the new purchase option ID
   */
  async addPurchaseOption(item, quantity, units, price, store) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/addPurchaseOption', {
        item,
        quantity,
        units,
        price,
        store
      })
      return response.data
    } catch (error) {
      console.error('Add purchase option error:', error)
      throw error
    }
  }

  /**
   * Update a purchase option's quantity
   * @param {string} purchaseOption - The purchase option ID
   * @param {number} quantity - The new quantity
   * @returns {Promise<Object>} - The response
   */
  async updatePurchaseOptionQuantity(purchaseOption, quantity) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/updatePurchaseOption', {
        purchaseOption,
        quantity
      })
      return response.data
    } catch (error) {
      console.error('Update purchase option quantity error:', error)
      throw error
    }
  }

  /**
   * Update a purchase option's units
   * @param {string} purchaseOption - The purchase option ID
   * @param {string} units - The new units
   * @returns {Promise<Object>} - The response
   */
  async updatePurchaseOptionUnits(purchaseOption, units) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/updatePurchaseOption', {
        purchaseOption,
        units
      })
      return response.data
    } catch (error) {
      console.error('Update purchase option units error:', error)
      throw error
    }
  }

  /**
   * Update a purchase option's price
   * @param {string} purchaseOption - The purchase option ID
   * @param {number} price - The new price
   * @returns {Promise<Object>} - The response
   */
  async updatePurchaseOptionPrice(purchaseOption, price) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/updatePurchaseOption', {
        purchaseOption,
        price
      })
      return response.data
    } catch (error) {
      console.error('Update purchase option price error:', error)
      throw error
    }
  }

  /**
   * Update a purchase option's store
   * @param {string} purchaseOption - The purchase option ID
   * @param {string} store - The new store name
   * @returns {Promise<Object>} - The response
   */
  async updatePurchaseOptionStore(purchaseOption, store) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/updatePurchaseOption', {
        purchaseOption,
        store
      })
      return response.data
    } catch (error) {
      console.error('Update purchase option store error:', error)
      throw error
    }
  }

  /**
   * Remove a purchase option from an item
   * @param {string} item - The item ID
   * @param {string} purchaseOption - The purchase option ID to remove
   * @returns {Promise<Object>} - The response
   */
  async removePurchaseOption(item, purchaseOption) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/removePurchaseOption', {
        item,
        purchaseOption
      })
      return response.data
    } catch (error) {
      console.error('Remove purchase option error:', error)
      throw error
    }
  }

  /**
   * Update the name of an item
   * @param {string} item - The item ID
   * @param {string} name - The new name for the item
   * @returns {Promise<Object>} - The response
   */
  async updateItemName(item, name) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/updateItemName', {
        item,
        name
      })
      return response.data
    } catch (error) {
      console.error('Update item name error:', error)
      throw error
    }
  }

  /**
   * Confirm a purchase option
   * @param {string} purchaseOption - The purchase option ID to confirm
   * @returns {Promise<Object>} - The response
   */
  async confirmPurchaseOption(purchaseOption) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/confirmPurchaseOption', {
        purchaseOption
      })
      return response.data
    } catch (error) {
      console.error('Confirm purchase option error:', error)
      throw error
    }
  }

  // Query endpoints

  /**
   * Get all items in the catalog
   * @returns {Promise<Object>} - The response containing all item IDs
   */
  async getAllItems() {
    try {
      const response = await apiClient.post('/api/StoreCatalog/_getAllItems', {})
      return response.data
    } catch (error) {
      console.error('Get all items error:', error)
      throw error
    }
  }

  /**
   * Get item by name
   * @param {string} name - The name to search for
   * @returns {Promise<Object>} - The response containing the item ID
   */
  async getItemByName(name) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/_getItemByName', {
        name
      })
      return response.data
    } catch (error) {
      console.error('Get item by name error:', error)
      throw error
    }
  }

  /**
   * Get the name of an item
   * @param {string} item - The item ID
   * @returns {Promise<Object>} - The response containing the item name
   */
  async getItemName(item) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/_getItemName', {
        item
      })
      return response.data
    } catch (error) {
      console.error('Get item name error:', error)
      throw error
    }
  }

  /**
   * Get item by purchase option
   * @param {string} purchaseOption - The purchase option ID
   * @returns {Promise<Object>} - The response containing the item ID
   */
  async getItemByPurchaseOption(purchaseOption) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/_getItemByPurchaseOption', {
        purchaseOption
      })
      return response.data
    } catch (error) {
      console.error('Get item by purchase option error:', error)
      throw error
    }
  }

  /**
   * Get all purchase options for an item
   * @param {string} item - The item ID
   * @returns {Promise<Object>} - The response containing all purchase option IDs
   */
  async getItemPurchaseOptions(item) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/_getItemPurchaseOptions', {
        item
      })
      return response.data
    } catch (error) {
      console.error('Get item purchase options error:', error)
      throw error
    }
  }

  /**
   * Get purchase option details
   * @param {string} purchaseOption - The purchase option ID
   * @returns {Promise<Object>} - The response containing purchase option details
   */
  async getPurchaseOptionDetails(purchaseOption) {
    try {
      const response = await apiClient.post('/api/StoreCatalog/_getPurchaseOptionDetails', {
        purchaseOption
      })
      return response.data
    } catch (error) {
      console.error('Get purchase option details error:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
export const storeCatalogService = new StoreCatalogService()

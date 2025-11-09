/**
 * Purchase System Service
 * Handles all PurchaseSystem-related API calls to the MenuManager backend
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

class PurchaseSystemService {
  /**
   * Create a new SelectOrder representing an item with multiple purchase options
   * @param {string} associateID - The associate ID for the order
   * @returns {Promise<Object>} - The response containing selectOrder ID
   */
  async createSelectOrder(associateID) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/createSelectOrder', {
        associateID
      })
      return response.data
    } catch (error) {
      console.error('Create select order error:', error)
      throw error
    }
  }

  /**
   * Create a new AtomicOrder (a specific purchase option) and associate it with a SelectOrder
   * @param {string} selectOrder - SelectOrder ID
   * @param {string} associateID - The associate ID for the atomic order
   * @param {number} quantity - The quantity
   * @param {string} units - The units
   * @param {number} price - The price
   * @returns {Promise<Object>} - The response containing atomicOrder ID
   */
  async createAtomicOrder(selectOrder, associateID, quantity, units, price) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/createAtomicOrder', {
        selectOrder,
        associateID,
        quantity,
        units,
        price
      })
      return response.data
    } catch (error) {
      console.error('Create atomic order error:', error)
      throw error
    }
  }

  /**
   * Delete a specific AtomicOrder from a SelectOrder
   * @param {string} selectOrder - SelectOrder ID
   * @param {string} atomicOrder - AtomicOrder ID
   * @returns {Promise<Object>} - The response
   */
  async deleteAtomicOrder(selectOrder, atomicOrder) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/deleteAtomicOrder', {
        selectOrder,
        atomicOrder
      })
      return response.data
    } catch (error) {
      console.error('Delete atomic order error:', error)
      throw error
    }
  }

  /**
   * Update an attribute (quantity, units, or price) of an AtomicOrder
   * @param {string} atomicOrder - AtomicOrder ID
   * @param {Object} updates - Object containing quantity, units, or price to update
   * @returns {Promise<Object>} - The response
   */
  async updateAtomicOrder(atomicOrder, updates) {
    try {
      const requestBody = { atomicOrder, ...updates }
      const response = await apiClient.post('/api/PurchaseSystem/updateAtomicOrder', requestBody)
      return response.data
    } catch (error) {
      console.error('Update atomic order error:', error)
      throw error
    }
  }

  /**
   * Create a new CompositeOrder for aggregating other orders
   * @param {string} associateID - The associate ID for the composite order
   * @returns {Promise<Object>} - The response containing compositeOrder ID
   */
  async createCompositeOrder(associateID) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/createCompositeOrder', {
        associateID
      })
      return response.data
    } catch (error) {
      console.error('Create composite order error:', error)
      throw error
    }
  }

  /**
   * Add a SelectOrder to a CompositeOrder with a specified scale factor
   * @param {string} compositeOrder - CompositeOrder ID
   * @param {string} selectOrder - SelectOrder ID
   * @param {number} scaleFactor - The scale factor
   * @returns {Promise<Object>} - The response
   */
  async addSelectOrderToCompositeOrder(compositeOrder, selectOrder, scaleFactor) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/addSelectOrderToCompositeOrder', {
        compositeOrder,
        selectOrder,
        scaleFactor
      })
      return response.data
    } catch (error) {
      console.error('Add select order to composite order error:', error)
      throw error
    }
  }

  /**
   * Remove a SelectOrder from a CompositeOrder
   * @param {string} compositeOrder - CompositeOrder ID
   * @param {string} selectOrder - SelectOrder ID
   * @returns {Promise<Object>} - The response
   */
  async removeSelectOrderFromCompositeOrder(compositeOrder, selectOrder) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/removeSelectOrderFromCompositeOrder', {
        compositeOrder,
        selectOrder
      })
      return response.data
    } catch (error) {
      console.error('Remove select order from composite order error:', error)
      throw error
    }
  }

  /**
   * Add a child CompositeOrder to a parent CompositeOrder
   * @param {string} parentOrder - Parent CompositeOrder ID
   * @param {string} childOrder - Child CompositeOrder ID
   * @returns {Promise<Object>} - The response
   */
  async addCompositeSubOrder(parentOrder, childOrder) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/addCompositeSubOrder', {
        parentOrder,
        childOrder
      })
      return response.data
    } catch (error) {
      console.error('Add composite sub order error:', error)
      throw error
    }
  }

  /**
   * Remove a child CompositeOrder from a parent CompositeOrder
   * @param {string} parentOrder - Parent CompositeOrder ID
   * @param {string} childOrder - Child CompositeOrder ID
   * @returns {Promise<Object>} - The response
   */
  async removeCompositeSubOrder(parentOrder, childOrder) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/removeCompositeSubOrder', {
        parentOrder,
        childOrder
      })
      return response.data
    } catch (error) {
      console.error('Remove composite sub order error:', error)
      throw error
    }
  }

  /**
   * Update the scale factor of a child order within a parent CompositeOrder
   * @param {string} parentOrder - Parent CompositeOrder ID
   * @param {string} childOrder - Child order ID (SelectOrder or CompositeOrder)
   * @param {number} newScaleFactor - The new scale factor
   * @returns {Promise<Object>} - The response
   */
  async updateSubOrderScaleFactor(parentOrder, childOrder, newScaleFactor) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/updateSubOrderScaleFactor', {
        parentOrder,
        childOrder,
        newScaleFactor
      })
      return response.data
    } catch (error) {
      console.error('Update sub order scale factor error:', error)
      throw error
    }
  }

  /**
   * Delete a CompositeOrder and recursively clean up its children
   * @param {string} compositeOrder - CompositeOrder ID
   * @returns {Promise<Object>} - The response
   */
  async deleteCompositeOrder(compositeOrder) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/deleteCompositeOrder', {
        compositeOrder
      })
      return response.data
    } catch (error) {
      console.error('Delete composite order error:', error)
      throw error
    }
  }

  /**
   * Calculate the most cost-effective combination of AtomicOrders
   * @param {Array<string>} compositeOrders - Array of CompositeOrder IDs
   * @returns {Promise<Object>} - The response
   */
  async calculateOptimalPurchase(compositeOrders) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/calculateOptimalPurchase', {
        compositeOrders
      })
      return response.data
    } catch (error) {
      console.error('Calculate optimal purchase error:', error)
      throw error
    }
  }

  /**
   * Mark a root CompositeOrder and all its descendant CompositeOrders as purchased
   * @param {string} compositeOrder - CompositeOrder ID
   * @returns {Promise<Object>} - The response
   */
  async purchaseOrder(compositeOrder) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/purchaseOrder', {
        compositeOrder
      })
      return response.data
    } catch (error) {
      console.error('Purchase order error:', error)
      throw error
    }
  }

  /**
   * Get any order (Atomic, Select, or Composite) associated with a given external ID
   * @param {string} associateID - The associate ID
   * @returns {Promise<Object>} - The response containing order details
   */
  async getOrderByAssociateID(associateID) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/_getOrderByAssociateID', {
        associateID
      })
      return response.data
    } catch (error) {
      console.error('Get order by associate ID error:', error)
      throw error
    }
  }

  /**
   * Get the calculated optimal purchase map for a CompositeOrder
   * @param {string} compositeOrder - CompositeOrder ID
   * @returns {Promise<Object>} - The response containing optimal purchase map
   */
  async getOptimalPurchase(compositeOrder) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/_getOptimalPurchase', {
        compositeOrder
      })
      return response.data
    } catch (error) {
      console.error('Get optimal purchase error:', error)
      throw error
    }
  }

  /**
   * Get the total calculated cost of a CompositeOrder
   * @param {string} compositeOrder - CompositeOrder ID
   * @returns {Promise<Object>} - The response containing total cost
   */
  async getOrderCost(compositeOrder) {
    try {
      const response = await apiClient.post('/api/PurchaseSystem/_getOrderCost', {
        compositeOrder
      })
      return response.data
    } catch (error) {
      console.error('Get order cost error:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
export const purchaseSystemService = new PurchaseSystemService()

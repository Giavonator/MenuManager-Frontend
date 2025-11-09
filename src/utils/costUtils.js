/**
 * Cost Utilities
 * Helper functions to fetch costs for recipes, menus, and carts
 * using the PurchaseSystem API
 */

import { purchaseSystemService } from '../services/purchaseSystemService.js'

/**
 * Fetch the cost for a recipe
 * @param {string} recipeId - The recipe ID
 * @returns {Promise<number|null>} - The cost or null if unavailable
 */
export async function fetchRecipeCost(recipeId) {
  try {
    // Get the CompositeOrder for this recipe
    const orderResponse = await purchaseSystemService.getOrderByAssociateID(recipeId)
    
    if (!orderResponse || orderResponse.length === 0 || !orderResponse[0].order) {
      console.log(`[costUtils] No order found for recipe ${recipeId}`)
      return null
    }
    
    const compositeOrderId = orderResponse[0].order._id
    
    // Get the cost for this CompositeOrder
    const costResponse = await purchaseSystemService.getOrderCost(compositeOrderId)
    
    if (!costResponse || costResponse.length === 0 || costResponse[0].totalCost === undefined) {
      console.log(`[costUtils] No cost found for recipe ${recipeId}`)
      return null
    }
    
    return costResponse[0].totalCost
  } catch (error) {
    console.error(`[costUtils] Error fetching recipe cost for ${recipeId}:`, error)
    return null
  }
}

/**
 * Fetch the cost for a menu
 * @param {string} menuId - The menu ID
 * @returns {Promise<number|null>} - The cost or null if unavailable
 */
export async function fetchMenuCost(menuId) {
  try {
    // Get the CompositeOrder for this menu
    const orderResponse = await purchaseSystemService.getOrderByAssociateID(menuId)
    
    if (!orderResponse || orderResponse.length === 0 || !orderResponse[0].order) {
      console.log(`[costUtils] No order found for menu ${menuId}`)
      return null
    }
    
    const compositeOrderId = orderResponse[0].order._id
    
    // Get the cost for this CompositeOrder
    const costResponse = await purchaseSystemService.getOrderCost(compositeOrderId)
    
    if (!costResponse || costResponse.length === 0 || costResponse[0].totalCost === undefined) {
      console.log(`[costUtils] No cost found for menu ${menuId}`)
      return null
    }
    
    return costResponse[0].totalCost
  } catch (error) {
    console.error(`[costUtils] Error fetching menu cost for ${menuId}:`, error)
    return null
  }
}

/**
 * Fetch the cost for a cart
 * @param {string} cartId - The cart ID
 * @returns {Promise<number|null>} - The cost or null if unavailable
 */
export async function fetchCartCost(cartId) {
  try {
    // Get the CompositeOrder for this cart
    const orderResponse = await purchaseSystemService.getOrderByAssociateID(cartId)
    
    if (!orderResponse || orderResponse.length === 0 || !orderResponse[0].order) {
      console.log(`[costUtils] No order found for cart ${cartId}`)
      return null
    }
    
    const compositeOrderId = orderResponse[0].order._id
    
    // Get the cost for this CompositeOrder
    const costResponse = await purchaseSystemService.getOrderCost(compositeOrderId)
    
    if (!costResponse || costResponse.length === 0 || costResponse[0].totalCost === undefined) {
      console.log(`[costUtils] No cost found for cart ${cartId}`)
      return null
    }
    
    return costResponse[0].totalCost
  } catch (error) {
    console.error(`[costUtils] Error fetching cart cost for ${cartId}:`, error)
    return null
  }
}

/**
 * Format a cost value as currency
 * @param {number|null} cost - The cost value
 * @returns {string} - Formatted cost string (e.g., "$12.34" or "N/A")
 */
export function formatCost(cost) {
  if (cost === null || cost === undefined || isNaN(cost)) {
    return 'N/A'
  }
  return `$${Number(cost).toFixed(2)}`
}


/**
 * Instacart Service
 * Handles integration with Instacart Shopping List API via backend
 */

import { createApiClient } from '../utils/apiClient.js'

// Instacart-compatible units (send as-is)
const INSTACART_COMPATIBLE_UNITS = new Set([
  'oz', 'lb', 'cup', 'tsp', 'tbsp', 'g', 'kg', 'ml', 'l', 'each'
])

/**
 * Check if a unit is compatible with Instacart API
 * @param {string} unit - Unit string to check
 * @returns {boolean} True if unit is compatible
 */
function isInstacartCompatibleUnit(unit) {
  if (!unit || typeof unit !== 'string') return false
  return INSTACART_COMPATIBLE_UNITS.has(unit.toLowerCase())
}

/**
 * Normalize unit for Instacart API
 * @param {string} unit - Unit string to normalize
 * @returns {string} Normalized unit (compatible unit or 'each')
 */
function normalizeUnit(unit) {
  if (!unit || typeof unit !== 'string') return 'each'
  const lowerUnit = unit.toLowerCase()
  return isInstacartCompatibleUnit(lowerUnit) ? lowerUnit : 'each'
}

/**
 * Format display text with name, quantity, and unit
 * @param {string} name - Ingredient name
 * @param {number} quantity - Quantity value
 * @param {string} unit - Unit string
 * @returns {string} Formatted display text in "NAME QUANTITY UNIT" format
 */
function formatDisplayText(name, quantity, unit) {
  const normalizedUnit = normalizeUnit(unit)
  const roundedQuantity = Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(2))
  return `${name} ${roundedQuantity} ${normalizedUnit}`
}

/**
 * Convert ingredient object to Instacart line item format
 * @param {Object} ingredient - Ingredient object from Weekly Cart
 * @returns {Object} Instacart line item object
 */
function convertToLineItem(ingredient) {
  const name = ingredient.name || 'Unknown Item'
  const quantity = Math.max(1, Number(ingredient.totalQuantity) || 1)
  const unit = normalizeUnit(ingredient.units || '')
  const displayText = formatDisplayText(name, quantity, unit)

  const lineItem = {
    name: name,
    display_text: displayText,
    quantity: quantity,
    unit: unit
  }

  return lineItem
}

/**
 * Create Instacart shopping list via backend
 * @param {Array<Object>} ingredients - Array of ingredient objects from Weekly Cart
 * @param {Object} options - Options for creating the shopping list
 * @param {string} options.title - Title of the shopping list
 * @param {string} options.weekStart - Week start date string (YYYY-MM-DD) for linkback URL
 * @returns {Promise<string>} Promise resolving to the Instacart shopping list URL
 * @throws {Error} If API call fails
 */
export async function createShoppingList(ingredients, options) {
  try {
    // Filter out header items and validate ingredients
    const validIngredients = ingredients.filter(
      ing => ing && !ing.isMenuHeader && !ing.isStoreHeader && ing.name
    )

    if (validIngredients.length === 0) {
      throw new Error('No valid ingredients to export to Instacart')
    }

    // Convert ingredients to line items
    const lineItems = validIngredients.map(convertToLineItem)

    // Use production URL for linkback (even in dev, so Instacart links work correctly)
    const linkbackOrigin = import.meta.env.DEV 
      ? 'https://menumanager-frontend.pages.dev'
      : window.location.origin

    // Prepare request payload for backend
    const payload = {
      title: options.title || 'Shopping List',
      weekStart: options.weekStart || '',
      linkbackOrigin: linkbackOrigin,
      lineItems: lineItems
    }

    // Create API client and make request to backend
    const apiClient = createApiClient()
    const response = await apiClient.post('/api/Instacart/createShoppingList', payload)

    // Extract URL from backend response
    const instacartUrl = response.data?.url

    if (!instacartUrl) {
      console.error('Backend response:', response.data)
      throw new Error('Backend did not return a valid Instacart shopping list URL')
    }

    return instacartUrl
  } catch (error) {
    console.error('[InstacartService] Error creating shopping list:', error)
    
    if (error.response) {
      // Backend responded with error status
      const errorMessage = error.response.data?.error || 
                          error.response.data?.message || 
                          `Backend error: ${error.response.status} ${error.response.statusText}`
      throw new Error(errorMessage)
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Unable to connect to backend. Please check your internet connection and try again.')
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred while creating the shopping list')
    }
  }
}


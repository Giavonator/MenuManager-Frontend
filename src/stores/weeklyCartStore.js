/**
 * Weekly Cart Store
 * Manages weekly cart state and caching for the session
 * Reuses menusStore for menu details to avoid duplication
 * Follows the same pattern as menusStore for consistency
 */

import { reactive, computed } from 'vue'
import { weeklyCartService } from '../services/weeklyCartService.js'
import { menusStore } from './menusStore.js'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { authService } from '../services/authService.js'
import { cookBookService } from '../services/cookBookService.js'
import { authState } from './authStore.js'

// Reactive state
const state = reactive({
  carts: {}, // Map of weekStart (date string) -> { cartId, menuIds, loadedAt, isLoading, error }
  loading: {}, // Loading state per week start date
  errors: {}, // Error state per week start date
  currentWeekStart: null, // Currently viewed week
  weekMenuMappings: {}, // Map of weekStart (date string) -> { [dateStr]: menuData }
  menuDetailsCache: {}, // Map of menuId -> menu details
  menuByDateCache: {}, // Map of dateStr -> menuId (from getMenuByDate responses)
  buildingMappings: {} // Map of weekStart -> Promise (to prevent duplicate builds)
})

class WeeklyCartStore {
  constructor() {
    // No initialization from storage needed - session-only cache
  }

  /**
   * Get week start date string from a date
   * @param {Date|string} date - Date to get week start for
   * @returns {string} - Week start date string in YYYY-MM-DD format
   */
  getWeekStartString(date) {
    const weekStart = weeklyCartService.getWeekStart(date instanceof Date ? date : new Date(date))
    return weeklyCartService.formatDate(weekStart)
  }

  /**
   * Set loading state for a week
   * @param {string} weekStart - Week start date string
   * @param {boolean} loading - Loading state
   */
  setLoading(weekStart, loading) {
    if (!state.loading[weekStart]) {
      state.loading[weekStart] = false
    }
    state.loading[weekStart] = loading
  }

  /**
   * Set error state for a week
   * @param {string} weekStart - Week start date string
   * @param {string|null} error - Error message or null
   */
  setError(weekStart, error) {
    if (!state.errors[weekStart]) {
      state.errors[weekStart] = null
    }
    state.errors[weekStart] = error
  }

  /**
   * Clear error state for a week
   * @param {string} weekStart - Week start date string
   */
  clearError(weekStart) {
    state.errors[weekStart] = null
  }

  /**
   * Check if cart is loaded for a week
   * @param {string} weekStart - Week start date string
   * @returns {boolean}
   */
  isLoaded(weekStart) {
    const cart = state.carts[weekStart]
    return !!(cart && cart.cartId && cart.loadedAt)
  }

  /**
   * Check if cart is loading for a week
   * @param {string} weekStart - Week start date string
   * @returns {boolean}
   */
  isLoading(weekStart) {
    return !!(state.loading[weekStart])
  }

  /**
   * Get error for a week
   * @param {string} weekStart - Week start date string
   * @returns {string|null}
   */
  getError(weekStart) {
    return state.errors[weekStart] || null
  }

  /**
   * Load cart and menus for a week
   * @param {Date|string} weekStartDate - Week start date
   */
  async loadCartForWeek(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    
    // If already loading, wait for it
    if (state.loading[weekStart]) {
      return
    }

    console.log('[WeeklyCartStore] loadCartForWeek:start for week:', weekStart)
    this.setLoading(weekStart, true)
    this.clearError(weekStart)

    try {
      // Get cart for this week
      const cartResponse = await weeklyCartService.getCartByDate(weekStart)
      console.log('[WeeklyCartStore] Cart response:', cartResponse)

      if (cartResponse[0]?.cart) {
        const cartId = cartResponse[0].cart
        console.log('[WeeklyCartStore] Found cart:', cartId)

        // Get menus in cart
        const menusResponse = await weeklyCartService.getMenusInCart(cartId)
        console.log('[WeeklyCartStore] Menus in cart response:', menusResponse)

        const menuIds = menusResponse[0]?.menus || []
        console.log('[WeeklyCartStore] Menu IDs in cart:', menuIds)

        // Store cart data
        state.carts[weekStart] = {
          cartId,
          menuIds: Array.isArray(menuIds) ? menuIds : [],
          loadedAt: Date.now(),
          isLoading: false,
          error: null
        }

        // Optionally pre-load menu details for menus not in menusStore
        // This will be handled by getMenusForWeek when needed
      } else {
        console.log('[WeeklyCartStore] No cart found for this week')
        // Store empty cart data
        state.carts[weekStart] = {
          cartId: null,
          menuIds: [],
          loadedAt: Date.now(),
          isLoading: false,
          error: null
        }
      }

      state.currentWeekStart = weekStart

      console.log('[WeeklyCartStore] loadCartForWeek:finish')
    } catch (error) {
      console.error('[WeeklyCartStore] Error loading cart for week:', error)
      this.setError(weekStart, error.message || 'Failed to load cart for week')
      // Still store empty cart data on error
      if (!state.carts[weekStart]) {
        state.carts[weekStart] = {
          cartId: null,
          menuIds: [],
          loadedAt: null,
          isLoading: false,
          error: error.message || 'Failed to load cart for week'
        }
      }
      throw error
    } finally {
      this.setLoading(weekStart, false)
    }
  }

  /**
   * Ensure cart is loaded for a week, but don't reload if already loaded
   * @param {Date|string} weekStartDate - Week start date
   */
  async ensureCartLoaded(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    if (!this.isLoaded(weekStart) && !this.isLoading(weekStart)) {
      await this.loadCartForWeek(weekStartDate)
    }
  }

  /**
   * Force refresh cart for a week from API
   * @param {Date|string} weekStartDate - Week start date
   */
  async refreshCartForWeek(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    // Clear cached data for this week
    delete state.carts[weekStart]
    state.loading[weekStart] = false
    state.errors[weekStart] = null
    this.clearWeekMenuMapping(weekStartDate)
    await this.loadCartForWeek(weekStartDate)
  }

  /**
   * Get cached cart data for a week
   * @param {Date|string} weekStartDate - Week start date
   * @returns {Object|null} - Cart data or null if not loaded
   */
  getCartForWeek(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    return state.carts[weekStart] || null
  }

  /**
   * Get menu IDs in cart for a week
   * @param {Date|string} weekStartDate - Week start date
   * @returns {Array<string>} - Array of menu IDs
   */
  getMenuIdsForWeek(weekStartDate) {
    const cart = this.getCartForWeek(weekStartDate)
    return cart ? cart.menuIds : []
  }

  /**
   * Enrich menu IDs with details from menusStore or fetch if not available
   * @param {Array<string>} menuIds - Array of menu IDs
   * @returns {Promise<Array<Object>>} - Array of menu objects with details
   */
  async enrichMenuIdsWithDetails(menuIds) {
    const enrichedMenus = []
    
    for (const menuId of menuIds) {
      // Check if menu exists in menusStore
      let menu = menusStore.findMenu(menuId)
      
      if (!menu) {
        // Menu not in menusStore, fetch from API
        try {
          const menuDetails = await menuCollectionService.getMenuDetails(menuId)
          const recipesResponse = await menuCollectionService.getRecipesInMenu(menuId)
          
          if (menuDetails[0]) {
            const details = menuDetails[0]
            const recipes = recipesResponse[0]?.menuRecipes || {}
            
            menu = {
              id: menuId,
              name: details.name,
              date: details.date,
              owner: details.owner,
              recipeCount: Object.keys(recipes).length
            }
            
            // Add to menusStore cache for future use
            menusStore.addMenu(menu)
          }
        } catch (err) {
          console.error(`[WeeklyCartStore] Error fetching menu ${menuId}:`, err)
          // Continue with other menus
        }
      }
      
      if (menu) {
        enrichedMenus.push(menu)
      }
    }
    
    return enrichedMenus
  }

  /**
   * Get menu details for a week (enriched with details from menusStore)
   * @param {Date|string} weekStartDate - Week start date
   * @returns {Promise<Array<Object>>} - Array of menu objects with details
   */
  async getMenusForWeek(weekStartDate) {
    const menuIds = this.getMenuIdsForWeek(weekStartDate)
    if (menuIds.length === 0) {
      return []
    }
    
    return await this.enrichMenuIdsWithDetails(menuIds)
  }

  /**
   * Fetch menu extras (ownerName, recipeNames) for a menu
   * @param {string} menuId - Menu ID
   * @param {string} ownerId - Owner ID
   * @returns {Promise<Object>} - Object with ownerName and recipeNames
   */
  async fetchMenuExtras(menuId, ownerId) {
    // Fetch username for owner
    let ownerName = null
    try {
      // Prefer authState if matches current user
      if (authState.user?.id === ownerId && authState.user?.username) {
        ownerName = authState.user.username
      } else {
        ownerName = await authService.getUsername(ownerId)
      }
    } catch (e) {
      ownerName = ownerId
    }

    // Fetch recipe names
    const recipeNames = []
    try {
      const recipesResp = await menuCollectionService.getRecipesInMenu(menuId)
      const recipeMap = recipesResp[0]?.menuRecipes || {}
      const recipeIds = Object.keys(recipeMap)
      for (const recipeId of recipeIds) {
        try {
          const details = await cookBookService.getRecipeDetails(recipeId)
          const name = details[0]?.name || `Recipe ${recipeId}`
          recipeNames.push(name)
        } catch (e) {
          recipeNames.push(`Recipe ${recipeId}`)
        }
      }
    } catch (e) {
      // ignore, leave empty list
    }

    return { ownerName, recipeNames }
  }

  /**
   * Get menu ID for a date (using cache if available)
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {Promise<string|null>} - Menu ID or null
   */
  async getMenuIdForDate(dateStr) {
    // Check cache first
    if (state.menuByDateCache[dateStr] !== undefined) {
      return state.menuByDateCache[dateStr]
    }

    // Fetch from API
    try {
      const byDateResp = await menuCollectionService.getMenuByDate(dateStr)
      const menuId = byDateResp[0]?.menu || null
      // Cache the result (even if null)
      state.menuByDateCache[dateStr] = menuId
      return menuId
    } catch (e) {
      // Cache null on error
      state.menuByDateCache[dateStr] = null
      return null
    }
  }

  /**
   * Build week menu mapping (date -> menu data) and cache it
   * @param {Date|string} weekStartDate - Week start date
   * @returns {Promise<Object>} - Mapping of dateStr -> menuData
   */
  async buildWeekMenuMapping(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    
    // If already building, wait for that to complete
    if (state.buildingMappings[weekStart]) {
      console.log('[WeeklyCartStore] buildWeekMenuMapping - Already building, waiting...')
      return await state.buildingMappings[weekStart]
    }
    
    console.log('[WeeklyCartStore] buildWeekMenuMapping:start for week:', weekStart)
    
    // Create a promise for this build and store it
    const buildPromise = (async () => {

    // Ensure cart is loaded first
    await this.ensureCartLoaded(weekStartDate)

    // Get menu IDs in cart
    const cartMenuIds = new Set(this.getMenuIdsForWeek(weekStartDate))
    console.log('[WeeklyCartStore] buildWeekMenuMapping - cart menu IDs:', Array.from(cartMenuIds))

    const weekMenuMapping = {}
    // Convert weekStartDate to Date if it's a string
    let weekStartDateObj
    if (weekStartDate instanceof Date) {
      weekStartDateObj = weekStartDate
    } else {
      // If it's a string like "2025-11-10", create a Date object
      weekStartDateObj = new Date(weekStartDate + 'T00:00:00Z')
    }
    const weekDatesArray = weeklyCartService.getWeekDates(weekStartDateObj)

    // For each date of the week, check if a menu exists and if it's in the cart
    for (const date of weekDatesArray) {
      const dateStr = weeklyCartService.formatDate(date)
      try {
        // Get menu ID for this date (uses cache)
        const menuIdForDate = await this.getMenuIdForDate(dateStr)
        
        if (menuIdForDate && cartMenuIds.has(menuIdForDate)) {
          // Menu exists and is in cart - get details
          // First check local cache
          let menuDetails = state.menuDetailsCache[menuIdForDate]
          
          // If not in local cache, check menusStore
          if (!menuDetails) {
            const menuFromStore = menusStore.findMenu(menuIdForDate)
            if (menuFromStore) {
              // Use menu from menusStore, but we need full details for date/owner
              // So we still need to fetch, but we know it exists
              menuDetails = {
                name: menuFromStore.name,
                date: menuFromStore.date,
                owner: menuFromStore.owner
              }
            }
          }
          
          // If still no details, fetch from API
          if (!menuDetails) {
            const detailsResponse = await menuCollectionService.getMenuDetails(menuIdForDate)
            if (detailsResponse[0]) {
              menuDetails = detailsResponse[0]
              // Cache menu details
              state.menuDetailsCache[menuIdForDate] = menuDetails
            }
          }

          if (menuDetails) {
            // Fetch extras (ownerName, recipeNames)
            const extras = await this.fetchMenuExtras(menuIdForDate, menuDetails.owner)
            
            // Build enriched menu data
            weekMenuMapping[dateStr] = {
              id: menuIdForDate,
              name: menuDetails.name,
              date: menuDetails.date,
              owner: menuDetails.owner,
              ownerName: extras.ownerName,
              recipeNames: extras.recipeNames
            }
            console.log(`[WeeklyCartStore] buildWeekMenuMapping - Placed cart menu ${menuIdForDate} on ${dateStr}`)
          }
        }
        // If no menu or not in cart, leave dateStr out of mapping (empty slot)
      } catch (e) {
        console.log(`[WeeklyCartStore] buildWeekMenuMapping - No menu for ${dateStr} or error occurred:`, e.message)
      }
    }

      // Cache the mapping
      state.weekMenuMappings[weekStart] = weekMenuMapping
      console.log('[WeeklyCartStore] buildWeekMenuMapping:finish - mapping cached')
      return weekMenuMapping
    })()
    
    // Store the promise
    state.buildingMappings[weekStart] = buildPromise
    
    try {
      const result = await buildPromise
      return result
    } finally {
      // Clear the building flag
      delete state.buildingMappings[weekStart]
    }
  }

  /**
   * Get week menu mapping (cached or build if needed)
   * @param {Date|string} weekStartDate - Week start date
   * @returns {Promise<Object>} - Mapping of dateStr -> menuData
   */
  async getWeekMenuMapping(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    
    // Check if mapping is cached
    if (state.weekMenuMappings[weekStart]) {
      console.log('[WeeklyCartStore] getWeekMenuMapping - Using cached mapping for week:', weekStart)
      return state.weekMenuMappings[weekStart]
    }

    // Build and cache mapping
    console.log('[WeeklyCartStore] getWeekMenuMapping - Building mapping for week:', weekStart)
    return await this.buildWeekMenuMapping(weekStartDate)
  }

  /**
   * Clear week menu mapping cache for a week
   * @param {Date|string} weekStartDate - Week start date
   */
  clearWeekMenuMapping(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    delete state.weekMenuMappings[weekStart]
    // Don't delete buildingMappings - let the build complete if in progress
    console.log('[WeeklyCartStore] clearWeekMenuMapping - Cleared mapping for week:', weekStart)
  }

  /**
   * Add menu to cart (creates cart if needed)
   * @param {string} menuId - Menu ID
   * @param {string} menuDate - Menu date in YYYY-MM-DD format
   * @returns {Promise<string>} - Cart ID
   */
  async addMenuToCart(menuId, menuDate) {
    try {
      console.log('[WeeklyCartStore] Adding menu to cart:', menuId, menuDate)
      const response = await weeklyCartService.addMenuToCart(menuId, menuDate)
      const cartId = response.cart
      
      // Get week start for this menu date
      const weekStart = this.getWeekStartString(menuDate)
      
      // Update cached cart data
      if (state.carts[weekStart]) {
        // Add menuId if not already in the array
        if (!state.carts[weekStart].menuIds.includes(menuId)) {
          state.carts[weekStart].menuIds.push(menuId)
        }
        state.carts[weekStart].cartId = cartId
      } else {
        // Initialize cart data if not exists
        state.carts[weekStart] = {
          cartId,
          menuIds: [menuId],
          loadedAt: Date.now(),
          isLoading: false,
          error: null
        }
      }
      
      // Invalidate week menu mapping cache so it gets rebuilt with new menu
      this.clearWeekMenuMapping(weekStart)
      
      // Also cache menu ID for this date
      state.menuByDateCache[menuDate] = menuId
      
      console.log('[WeeklyCartStore] Menu added to cart, cart ID:', cartId)
      return cartId
    } catch (error) {
      console.error('[WeeklyCartStore] Error adding menu to cart:', error)
      throw error
    }
  }

  /**
   * Remove menu from cart
   * @param {string} menuId - Menu ID
   * @returns {Promise<string>} - Cart ID
   */
  async removeMenuFromCart(menuId) {
    try {
      console.log('[WeeklyCartStore] Removing menu from cart:', menuId)
      const response = await weeklyCartService.removeMenuFromCart(menuId)
      const cartId = response.cart
      
      // Find which week contains this menu and invalidate cache
      for (const weekStart in state.carts) {
        const cart = state.carts[weekStart]
        if (cart.menuIds.includes(menuId)) {
          // Remove menuId from array
          cart.menuIds = cart.menuIds.filter(id => id !== menuId)
          // Invalidate week menu mapping cache so it gets rebuilt without this menu
          this.clearWeekMenuMapping(weekStart)
          break
        }
      }
      
      console.log('[WeeklyCartStore] Menu removed from cart, cart ID:', cartId)
      return cartId
    } catch (error) {
      console.error('[WeeklyCartStore] Error removing menu from cart:', error)
      throw error
    }
  }

  /**
   * Create new cart for a week
   * @param {Date|string} weekStartDate - Week start date
   * @returns {Promise<string>} - Cart ID
   */
  async createCart(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    try {
      console.log('[WeeklyCartStore] Creating cart for week:', weekStart)
      const response = await weeklyCartService.createCart(weekStart)
      const cartId = response.cart
      
      // Initialize cache entry for this week
      state.carts[weekStart] = {
        cartId,
        menuIds: [],
        loadedAt: Date.now(),
        isLoading: false,
        error: null
      }
      
      console.log('[WeeklyCartStore] Cart created, cart ID:', cartId)
      return cartId
    } catch (error) {
      console.error('[WeeklyCartStore] Error creating cart:', error)
      this.setError(weekStart, error.message || 'Failed to create cart')
      throw error
    }
  }

  /**
   * Delete cart for a week
   * @param {Date|string} weekStartDate - Week start date
   * @returns {Promise<string>} - Cart ID
   */
  async deleteCart(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    try {
      console.log('[WeeklyCartStore] Deleting cart for week:', weekStart)
      const response = await weeklyCartService.deleteCart(weekStart)
      const cartId = response.cart
      
      // Clear cache entry for this week
      delete state.carts[weekStart]
      state.loading[weekStart] = false
      state.errors[weekStart] = null
      
      console.log('[WeeklyCartStore] Cart deleted, cart ID:', cartId)
      return cartId
    } catch (error) {
      console.error('[WeeklyCartStore] Error deleting cart:', error)
      this.setError(weekStart, error.message || 'Failed to delete cart')
      throw error
    }
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    state.carts = {}
    state.loading = {}
    state.errors = {}
    state.currentWeekStart = null
    state.weekMenuMappings = {}
    state.menuDetailsCache = {}
    state.menuByDateCache = {}
    state.buildingMappings = {}
  }

  /**
   * Clear cache for a specific week
   * @param {Date|string} weekStartDate - Week start date
   */
  clearCartForWeek(weekStartDate) {
    const weekStart = this.getWeekStartString(weekStartDate)
    delete state.carts[weekStart]
    state.loading[weekStart] = false
    state.errors[weekStart] = null
    this.clearWeekMenuMapping(weekStartDate)
  }

  // Getters
  get carts() {
    return state.carts
  }

  get loading() {
    return state.loading
  }

  get errors() {
    return state.errors
  }

  get currentWeekStart() {
    return state.currentWeekStart
  }
}

// Create and export singleton instance
export const weeklyCartStore = new WeeklyCartStore()

// Export reactive state for Vue components
export const weeklyCartState = state

// Computed properties for easy access
export const weeklyCarts = computed(() => state.carts)
export const weeklyCartLoading = computed(() => state.loading)
export const weeklyCartErrors = computed(() => state.errors)
export const weeklyCartCurrentWeekStart = computed(() => state.currentWeekStart)


/**
 * Menu Detail Store
 * Manages individual menu details state and caching for the session
 * Follows the same pattern as authStore, catalogStore, and menusStore for consistency
 */

import { reactive, computed } from 'vue'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { cookBookService } from '../services/cookBookService.js'
import { menusStore } from './menusStore.js'

const STORAGE_KEY = 'menumanager_menu_detail_store'

const loadFromSession = () => {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn('[MenuDetailStore] Failed to read session storage:', error)
    return null
  }
}

const saveToSession = (payload) => {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('[MenuDetailStore] Failed to write session storage:', error)
  }
}

// Reactive state
const state = reactive({
  menus: {}, // menuId -> menu data
  loading: {}, // menuId -> loading state
  errors: {}, // menuId -> error state
  loadedAt: {} // menuId -> timestamp
})

class MenuDetailStore {
  constructor() {
    const cached = loadFromSession()
    if (cached && typeof cached === 'object') {
      state.menus = cached.menus && typeof cached.menus === 'object' ? cached.menus : {}
      state.loadedAt = cached.loadedAt && typeof cached.loadedAt === 'object' ? cached.loadedAt : {}
      state.errors = cached.errors && typeof cached.errors === 'object' ? cached.errors : {}
    }
  }

  persistState() {
    saveToSession({
      menus: state.menus,
      loadedAt: state.loadedAt,
      errors: state.errors
    })
  }

  /**
   * Set loading state for a menu
   */
  setLoading(menuId, loading) {
    console.log(`[MenuDetailStore] setLoading called - menuId: ${menuId}, loading: ${loading}, previous: ${state.loading[menuId]}`)
    state.loading[menuId] = loading
    console.log(`[MenuDetailStore] setLoading complete - state.loading[${menuId}] = ${state.loading[menuId]}`)
  }

  /**
   * Set error state for a menu
   */
  setError(menuId, error) {
    console.log(`[MenuDetailStore] setError called - menuId: ${menuId}, error: ${error}, previous: ${state.errors[menuId]}`)
    state.errors[menuId] = error
    console.log(`[MenuDetailStore] setError complete - state.errors[${menuId}] = ${state.errors[menuId]}`)
  }

  /**
   * Clear error state for a menu
   */
  clearError(menuId) {
    console.log(`[MenuDetailStore] clearError called - menuId: ${menuId}, previous error: ${state.errors[menuId]}`)
    state.errors[menuId] = null
    console.log(`[MenuDetailStore] clearError complete - state.errors[${menuId}] = ${state.errors[menuId]}`)
  }

  /**
   * Check if a menu is loading
   */
  isLoading(menuId) {
    const result = state.loading[menuId] || false
    console.log(`[MenuDetailStore] isLoading called - menuId: ${menuId}, returning: ${result}, state.loading[${menuId}]: ${state.loading[menuId]}`)
    return result
  }

  /**
   * Get error for a menu
   */
  getError(menuId) {
    const result = state.errors[menuId] || null
    console.log(`[MenuDetailStore] getError called - menuId: ${menuId}, returning: ${result}`)
    return result
  }

  /**
   * Check if a menu is loaded
   * Simple check: menu exists and has menuDetails
   */
  isLoaded(menuId) {
    const menu = state.menus[menuId]
    const hasMenu = !!menu
    const hasMenuDetails = !!(menu && menu.menuDetails)
    const result = !!(menu && menu.menuDetails)
    console.log(`[MenuDetailStore] isLoaded called - menuId: ${menuId}, hasMenu: ${hasMenu}, hasMenuDetails: ${hasMenuDetails}, returning: ${result}`)
    console.log(`[MenuDetailStore] isLoaded - state.menus keys: [${Object.keys(state.menus).join(', ')}]`)
    if (menu) {
      console.log(`[MenuDetailStore] isLoaded - menu structure:`, { hasMenuDetails: !!menu.menuDetails, hasRecipes: Array.isArray(menu.recipes), hasOwnerUsername: !!menu.ownerUsername })
    }
    return result
  }

  /**
   * Load full menu data from the API
   * Simple pattern matching menusStore - wait if already loading
   */
  async loadMenu(menuId) {
    console.log(`[MenuDetailStore] loadMenu ENTRY - menuId: ${menuId}`)
    console.log(`[MenuDetailStore] loadMenu - current state.loading[${menuId}]: ${state.loading[menuId]}`)
    console.log(`[MenuDetailStore] loadMenu - current state.menus keys: [${Object.keys(state.menus).join(', ')}]`)
    console.log(`[MenuDetailStore] loadMenu - state.menus[${menuId}] exists: ${!!state.menus[menuId]}`)
    
    // If already loading, wait for it to complete
    if (state.loading[menuId]) {
      console.log(`[MenuDetailStore] loadMenu - Already loading, waiting for completion...`)
      let waitCount = 0
      // Poll until loading is complete (simple approach without promise cache)
      while (state.loading[menuId]) {
        waitCount++
        console.log(`[MenuDetailStore] loadMenu - Waiting (attempt ${waitCount})...`)
        await new Promise(resolve => setTimeout(resolve, 50))
        if (waitCount > 200) { // 10 second timeout
          console.warn(`[MenuDetailStore] loadMenu - Waited too long, breaking wait loop`)
          break
        }
      }
      console.log(`[MenuDetailStore] loadMenu - Finished waiting, checking if loaded...`)
      // Check if data was loaded successfully
      if (this.isLoaded(menuId)) {
        console.log(`[MenuDetailStore] loadMenu - Menu was loaded during wait, returning early`)
        return
      }
      console.log(`[MenuDetailStore] loadMenu - Loading completed but no data found, continuing to load`)
      // If loading completed but no data, continue to load
    }

    console.log('[MenuDetailStore] loadMenu:start for menuId:', menuId)
    this.setLoading(menuId, true)
    this.clearError(menuId)
    console.log(`[MenuDetailStore] loadMenu - After setLoading/clearError, state.loading[${menuId}]: ${state.loading[menuId]}`)

    try {
      // Load menu details
      const menuResponse = await menuCollectionService.getMenuDetails(menuId)
      if (!menuResponse || menuResponse.length === 0) {
        throw new Error('Menu not found')
      }

      const menuDetails = menuResponse[0]
      console.log('[MenuDetailStore] Menu details:', menuDetails)

      // Load owner username (use menusStore cache if available)
      let ownerUsername = ''
      if (menuDetails.owner) {
        ownerUsername = await menusStore.getUsername(menuDetails.owner)
      }

      // Load recipes in menu
      const recipesResponse = await menuCollectionService.getRecipesInMenu(menuId)
      console.log('[MenuDetailStore] Recipes response:', recipesResponse)

      let recipes = []
      if (recipesResponse && recipesResponse.length > 0) {
        const menuRecipes = recipesResponse[0].menuRecipes || {}
        console.log('[MenuDetailStore] Menu recipes:', menuRecipes)

        // Load details for each recipe
        const recipePromises = Object.keys(menuRecipes).map(async (recipeId) => {
          const scalingFactor = menuRecipes[recipeId]
          const [detailsResponse, ingredientsResponse] = await Promise.all([
            cookBookService.getRecipeDetails(recipeId),
            cookBookService.getRecipeIngredients(recipeId)
          ])

          const details = detailsResponse[0]
          const ingredients = ingredientsResponse[0]?.ingredients || []

          return {
            id: recipeId,
            name: details.name,
            dishType: details.dishType,
            servingQuantity: details.servingQuantity,
            instructions: details.instructions,
            scalingFactor: scalingFactor,
            ingredients: ingredients
          }
        })

        recipes = await Promise.all(recipePromises)
      }

      // Cache the menu data (no isLoaded flag - infer from presence)
      // Use Vue.set or direct assignment - reactive should handle it
      console.log(`[MenuDetailStore] loadMenu - About to cache menu data for menuId: ${menuId}`)
      console.log(`[MenuDetailStore] loadMenu - menuDetails:`, menuDetails)
      console.log(`[MenuDetailStore] loadMenu - recipes count: ${recipes.length}`)
      console.log(`[MenuDetailStore] loadMenu - ownerUsername: ${ownerUsername}`)
      
      const menuDataToCache = {
        menuDetails: menuDetails,
        ownerUsername: ownerUsername,
        recipes: recipes,
        loadedAt: Date.now()
      }
      
      console.log(`[MenuDetailStore] loadMenu - Before assignment, state.menus keys: [${Object.keys(state.menus).join(', ')}]`)
      state.menus[menuId] = menuDataToCache
      console.log(`[MenuDetailStore] loadMenu - After assignment, state.menus keys: [${Object.keys(state.menus).join(', ')}]`)
      console.log(`[MenuDetailStore] loadMenu - state.menus[${menuId}] exists: ${!!state.menus[menuId]}`)
      console.log(`[MenuDetailStore] loadMenu - state.menus[${menuId}].menuDetails exists: ${!!(state.menus[menuId] && state.menus[menuId].menuDetails)}`)

      state.loadedAt[menuId] = Date.now()
      console.log('[MenuDetailStore] Menu cached:', state.menus[menuId])
      console.log('[MenuDetailStore] State menus keys:', Object.keys(state.menus))
      console.log('[MenuDetailStore] State menus[menuId]:', state.menus[menuId])
      console.log(`[MenuDetailStore] loadMenu - isLoaded(${menuId}) now returns: ${this.isLoaded(menuId)}`)
      this.persistState()
    } catch (error) {
      console.error('[MenuDetailStore] Error loading menu:', error)
      console.error(`[MenuDetailStore] loadMenu ERROR - menuId: ${menuId}, error:`, error)
      this.setError(menuId, error.message || 'Failed to load menu')
      this.persistState()
      console.log(`[MenuDetailStore] loadMenu ERROR - After setError, state.errors[${menuId}]: ${state.errors[menuId]}`)
      // Don't delete cache on error - let it be overwritten on retry
      throw error
    } finally {
      console.log('[MenuDetailStore] loadMenu:finish')
      console.log(`[MenuDetailStore] loadMenu FINALLY - menuId: ${menuId}, setting loading to false`)
      console.log(`[MenuDetailStore] loadMenu FINALLY - Before setLoading, state.loading[${menuId}]: ${state.loading[menuId]}`)
      this.setLoading(menuId, false)
      console.log(`[MenuDetailStore] loadMenu FINALLY - After setLoading, state.loading[${menuId}]: ${state.loading[menuId]}`)
      console.log(`[MenuDetailStore] loadMenu FINALLY - state.menus[${menuId}] exists: ${!!state.menus[menuId]}`)
      if (state.menus[menuId]) {
        console.log(`[MenuDetailStore] loadMenu FINALLY - Menu data structure:`, {
          hasMenuDetails: !!state.menus[menuId].menuDetails,
          hasRecipes: Array.isArray(state.menus[menuId].recipes),
          recipesCount: Array.isArray(state.menus[menuId].recipes) ? state.menus[menuId].recipes.length : 'N/A'
        })
      }
    }
  }

  /**
   * Ensure menu is loaded, but don't reload if already loaded
   * Simple check: if not loaded and not loading, then load
   */
  async ensureMenuLoaded(menuId) {
    console.log(`[MenuDetailStore] ensureMenuLoaded ENTRY - menuId: ${menuId}`)
    console.log(`[MenuDetailStore] ensureMenuLoaded - Checking isLoaded(${menuId})...`)
    const loaded = this.isLoaded(menuId)
    console.log(`[MenuDetailStore] ensureMenuLoaded - isLoaded returned: ${loaded}`)
    console.log(`[MenuDetailStore] ensureMenuLoaded - Checking isLoading(${menuId})...`)
    const loading = this.isLoading(menuId)
    console.log(`[MenuDetailStore] ensureMenuLoaded - isLoading returned: ${loading}`)
    console.log(`[MenuDetailStore] ensureMenuLoaded - Condition: !loaded (${!loaded}) && !loading (${!loading}) = ${!loaded && !loading}`)
    console.log(`[MenuDetailStore] ensureMenuLoaded - state.menus keys: [${Object.keys(state.menus).join(', ')}]`)
    console.log(`[MenuDetailStore] ensureMenuLoaded - state.menus[${menuId}]:`, state.menus[menuId])
    
    if (!loaded && !loading) {
      console.log(`[MenuDetailStore] ensureMenuLoaded - Calling loadMenu(${menuId})...`)
      await this.loadMenu(menuId)
      console.log(`[MenuDetailStore] ensureMenuLoaded - loadMenu completed, checking isLoaded again...`)
      const loadedAfter = this.isLoaded(menuId)
      console.log(`[MenuDetailStore] ensureMenuLoaded - isLoaded after loadMenu: ${loadedAfter}`)
    } else {
      console.log(`[MenuDetailStore] ensureMenuLoaded - Skipping loadMenu (loaded: ${loaded}, loading: ${loading})`)
    }
    console.log(`[MenuDetailStore] ensureMenuLoaded EXIT - menuId: ${menuId}`)
  }

  /**
   * Force refresh menu from API
   */
  async refreshMenu(menuId) {
    console.log(`[MenuDetailStore] refreshMenu ENTRY - menuId: ${menuId}`)
    console.log(`[MenuDetailStore] refreshMenu - Before clear, state.menus[${menuId}] exists: ${!!state.menus[menuId]}`)
    // Clear existing cache
    delete state.menus[menuId]
    delete state.loadedAt[menuId]
    delete state.errors[menuId]
    console.log(`[MenuDetailStore] refreshMenu - After delete, state.menus[${menuId}] exists: ${!!state.menus[menuId]}`)
    this.setLoading(menuId, false)
    this.clearError(menuId)
    console.log(`[MenuDetailStore] refreshMenu - Calling loadMenu(${menuId})...`)
    await this.loadMenu(menuId)
    console.log(`[MenuDetailStore] refreshMenu EXIT - menuId: ${menuId}`)
  }

  /**
   * Get cached menu data
   */
  getMenu(menuId) {
    const result = state.menus[menuId] || null
    console.log(`[MenuDetailStore] getMenu called - menuId: ${menuId}, found: ${!!result}`)
    if (result) {
      console.log(`[MenuDetailStore] getMenu - Menu structure:`, {
        hasMenuDetails: !!result.menuDetails,
        hasRecipes: Array.isArray(result.recipes),
        recipesCount: Array.isArray(result.recipes) ? result.recipes.length : 'N/A',
        hasOwnerUsername: !!result.ownerUsername
      })
    } else {
      console.log(`[MenuDetailStore] getMenu - No menu found, state.menus keys: [${Object.keys(state.menus).join(', ')}]`)
    }
    return result
  }

  /**
   * Get cached owner username
   */
  getOwnerUsername(menuId) {
    const menu = state.menus[menuId]
    return menu ? menu.ownerUsername : ''
  }

  /**
   * Update menu details in cache
   */
  updateMenu(menuId, updates) {
    const menu = state.menus[menuId]
    if (menu) {
      const normalizedUpdates = { ...updates }
      if (normalizedUpdates.date instanceof Date) {
        normalizedUpdates.date = normalizedUpdates.date.toISOString()
      }
      Object.assign(menu.menuDetails, normalizedUpdates)
      menu.loadedAt = Date.now()
      state.loadedAt[menuId] = Date.now()
      this.persistState()
    }
  }

  /**
   * Add recipe to menu in cache
   */
  async addRecipe(menuId, recipeId, scalingFactor) {
    const menu = state.menus[menuId]
    if (!menu) {
      // Menu not cached, load it first
      await this.loadMenu(menuId)
      return this.addRecipe(menuId, recipeId, scalingFactor)
    }

    // Ensure recipes array exists
    if (!Array.isArray(menu.recipes)) {
      menu.recipes = []
    }

    // Load recipe details
    const [detailsResponse, ingredientsResponse] = await Promise.all([
      cookBookService.getRecipeDetails(recipeId),
      cookBookService.getRecipeIngredients(recipeId)
    ])

    const details = detailsResponse[0]
    const ingredients = ingredientsResponse[0]?.ingredients || []

    const newRecipe = {
      id: recipeId,
      name: details.name,
      dishType: details.dishType,
      servingQuantity: details.servingQuantity,
      instructions: details.instructions,
      scalingFactor: scalingFactor,
      ingredients: ingredients
    }

    menu.recipes.push(newRecipe)
    menu.loadedAt = Date.now()
    state.loadedAt[menuId] = Date.now()
    this.persistState()
  }

  /**
   * Remove recipe from menu in cache
   */
  removeRecipe(menuId, recipeId) {
    const menu = state.menus[menuId]
    if (menu && Array.isArray(menu.recipes)) {
      menu.recipes = menu.recipes.filter(recipe => recipe.id !== recipeId)
      menu.loadedAt = Date.now()
      state.loadedAt[menuId] = Date.now()
      this.persistState()
    }
  }

  /**
   * Update recipe scaling factor in cache
   */
  updateRecipeScaling(menuId, recipeId, scalingFactor) {
    const menu = state.menus[menuId]
    if (menu && Array.isArray(menu.recipes)) {
      const recipe = menu.recipes.find(r => r.id === recipeId)
      if (recipe) {
        recipe.scalingFactor = scalingFactor
        menu.loadedAt = Date.now()
        state.loadedAt[menuId] = Date.now()
        this.persistState()
      }
    }
  }

  /**
   * Update recipe details in cache
   */
  updateRecipe(menuId, recipeId, updates) {
    const menu = state.menus[menuId]
    if (menu && Array.isArray(menu.recipes)) {
      const recipe = menu.recipes.find(r => r.id === recipeId)
      if (recipe) {
        Object.assign(recipe, updates)
        menu.loadedAt = Date.now()
        state.loadedAt[menuId] = Date.now()
        this.persistState()
      }
    }
  }

  /**
   * Update recipe ingredients in cache
   */
  updateRecipeIngredients(menuId, recipeId, ingredients) {
    const menu = state.menus[menuId]
    if (menu && Array.isArray(menu.recipes)) {
      const recipe = menu.recipes.find(r => r.id === recipeId)
      if (recipe) {
        recipe.ingredients = ingredients
        menu.loadedAt = Date.now()
        state.loadedAt[menuId] = Date.now()
        this.persistState()
      }
    }
  }

  /**
   * Clear cached data for a specific menu
   */
  clearMenu(menuId) {
    console.log(`[MenuDetailStore] clearMenu called - menuId: ${menuId}`)
    console.log(`[MenuDetailStore] clearMenu - Before clear, state.menus[${menuId}] exists: ${!!state.menus[menuId]}`)
    delete state.menus[menuId]
    delete state.loading[menuId]
    delete state.errors[menuId]
    delete state.loadedAt[menuId]
    console.log(`[MenuDetailStore] clearMenu - After clear, state.menus[${menuId}] exists: ${!!state.menus[menuId]}`)
    console.log(`[MenuDetailStore] clearMenu - state.menus keys after clear: [${Object.keys(state.menus).join(', ')}]`)
    this.persistState()
  }

  /**
   * Clear all cached menu data
   */
  clearCache() {
    console.log(`[MenuDetailStore] clearCache called`)
    console.log(`[MenuDetailStore] clearCache - Before clear, state.menus keys: [${Object.keys(state.menus).join(', ')}]`)
    state.menus = {}
    state.loading = {}
    state.errors = {}
    state.loadedAt = {}
    console.log(`[MenuDetailStore] clearCache - After clear, state.menus keys: [${Object.keys(state.menus).join(', ')}]`)
    this.persistState()
  }

  // Getters
  get menus() {
    return state.menus
  }

  get loading() {
    return state.loading
  }

  get errors() {
    return state.errors
  }
}

// Create and export singleton instance
export const menuDetailStore = new MenuDetailStore()

// Export reactive state for Vue components
export const menuDetailState = state

// Computed properties for easy access
export const menuDetailMenus = computed(() => state.menus)
export const menuDetailLoading = computed(() => state.loading)
export const menuDetailErrors = computed(() => state.errors)

/**
 * Catalog Store
 * Manages store catalog state and caching for the session
 * Follows the same pattern as authStore for consistency
 */

import { reactive, computed } from 'vue'
import { storeCatalogService } from '../services/storeCatalogService.js'

const STORAGE_KEY = 'menumanager_catalog_store'

const loadFromSession = () => {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn('[CatalogStore] Failed to read session storage:', error)
    return null
  }
}

const saveToSession = (payload) => {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('[CatalogStore] Failed to write session storage:', error)
  }
}

// Reactive state
const state = reactive({
  items: [],
  loading: false,
  error: null,
  loadedAt: null,
  isLoaded: false
})

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
const compareItemNames = (left, right) => {
  const leftName = left?.name ?? ''
  const rightName = right?.name ?? ''
  return collator.compare(leftName, rightName)
}

class CatalogStore {
  constructor() {
    const cached = loadFromSession()
    if (cached && typeof cached === 'object') {
      state.items = Array.isArray(cached.items) ? cached.items : []
      state.loadedAt = typeof cached.loadedAt === 'number' ? cached.loadedAt : null
      state.isLoaded = !!cached.isLoaded
      state.error = cached.error || null
    }

    if (state.items.length > 1) {
      state.items.sort(compareItemNames)
    }
  }

  persistState() {
    saveToSession({
      items: state.items,
      loadedAt: state.loadedAt,
      isLoaded: state.isLoaded,
      error: state.error
    })
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    state.loading = loading
  }

  /**
   * Set error state
   */
  setError(error) {
    state.error = error
  }

  /**
   * Clear error state
   */
  clearError() {
    state.error = null
  }

  /**
   * Load all items from the API
   * This is the expensive operation that we want to cache
   */
  async loadItems() {
    if (state.loading) {
      // If already loading, wait for it
      return
    }

    console.log('[CatalogStore] loadItems:start')
    this.setLoading(true)
    this.clearError()

    try {
      const response = await storeCatalogService.getAllItems()
      console.log('[CatalogStore] getAllItems response:', response)
      const root = Array.isArray(response) ? response[0] : response
      const itemIds = root?.items || []
      console.log('[CatalogStore] itemIds:', itemIds)

      // Load detailed information for each item
      const itemsWithDetails = await Promise.all(
        itemIds.map(async (itemId) => {
          try {
            console.log(`[CatalogStore] loading item ${itemId}`)
            const [nameResponse, purchaseOptionsResponse] = await Promise.all([
              storeCatalogService.getItemName(itemId),
              storeCatalogService.getItemPurchaseOptions(itemId)
            ])
            console.log(`[CatalogStore] item ${itemId} nameResponse:`, nameResponse)
            console.log(`[CatalogStore] item ${itemId} purchaseOptionsResponse:`, purchaseOptionsResponse)

            const nameRoot = Array.isArray(nameResponse) ? nameResponse[0] : nameResponse
            const poRoot = Array.isArray(purchaseOptionsResponse) ? purchaseOptionsResponse[0] : purchaseOptionsResponse
            const itemName = nameRoot?.name || 'Unknown'
            const purchaseOptionIds = poRoot?.purchaseOptions || []
            console.log(`[CatalogStore] item ${itemId} name:`, itemName)
            console.log(`[CatalogStore] item ${itemId} purchaseOptionIds:`, purchaseOptionIds)

            // Load purchase option details
            const purchaseOptions = await Promise.all(
              purchaseOptionIds.map(async (optionId) => {
                try {
                  console.log(`  [CatalogStore] loading purchase option ${optionId}`)
                  const detailsResponse = await storeCatalogService.getPurchaseOptionDetails(optionId)
                  const rawDetails = Array.isArray(detailsResponse) ? detailsResponse[0] : detailsResponse
                  const detailsRoot = rawDetails && typeof rawDetails === 'object' ? rawDetails : {}
                  const priceNum = Number(detailsRoot?.price ?? 0)
                  console.log(`  [CatalogStore] purchase option ${optionId} details:`, detailsRoot)
                  return {
                    id: optionId,
                    ...detailsRoot,
                    price: isNaN(priceNum) ? 0 : priceNum
                  }
                } catch (error) {
                  console.error(`Error loading purchase option ${optionId}:`, error)
                  return null
                }
              })
            )

            return {
              id: itemId,
              name: itemName,
              purchaseOptions: purchaseOptions.filter(option => option !== null)
            }
          } catch (error) {
            console.error(`Error loading item ${itemId}:`, error)
            return null
          }
        })
      )
      console.log('[CatalogStore] itemsWithDetails:', itemsWithDetails)

      state.items = itemsWithDetails.filter(item => item !== null)
      if (state.items.length > 1) {
        state.items.sort(compareItemNames)
      }
      state.loadedAt = Date.now()
      state.isLoaded = true
      this.persistState()
      console.log('[CatalogStore] items set:', state.items)
    } catch (error) {
      console.error('Error loading items:', error)
      this.setError(error.message || 'Failed to load items')
      this.persistState()
      throw error
    } finally {
      console.log('[CatalogStore] loadItems:finish')
      this.setLoading(false)
    }
  }

  /**
   * Ensure items are loaded, but don't reload if already loaded
   */
  async ensureLoaded() {
    if (!state.isLoaded && !state.loading) {
      await this.loadItems()
    }
  }

  /**
   * Force refresh items from API
   */
  async refreshItems() {
    state.isLoaded = false
    await this.loadItems()
  }

  /**
   * Clear the cache
   */
  clearCache() {
    state.items = []
    state.loadedAt = null
    state.isLoaded = false
    state.error = null
    this.persistState()
  }

  /**
   * Add a new item to the cache
   */
  addItem(item) {
    const insertAt = state.items.findIndex(existing => compareItemNames(item, existing) < 0)
    if (insertAt === -1) {
      state.items.push(item)
    } else {
      state.items.splice(insertAt, 0, item)
    }
    this.persistState()
  }

  /**
   * Update an item in the cache
   */
  updateItem(itemId, updates) {
    const item = state.items.find(i => i.id === itemId)
    if (item) {
      Object.assign(item, updates)
      if (Object.prototype.hasOwnProperty.call(updates, 'name') && state.items.length > 1) {
        state.items.sort(compareItemNames)
      }
      this.persistState()
    }
  }

  /**
   * Update an item's name in the cache
   */
  updateItemName(itemId, name) {
    const item = state.items.find(i => i.id === itemId)
    if (item) {
      item.name = name
      if (state.items.length > 1) {
        state.items.sort(compareItemNames)
      }
      this.persistState()
    }
  }

  /**
   * Remove an item from the cache
   */
  removeItem(itemId) {
    state.items = state.items.filter(item => item.id !== itemId)
    this.persistState()
  }

  /**
   * Add a purchase option to an item in the cache
   */
  addPurchaseOption(itemId, option) {
    const item = state.items.find(i => i.id === itemId)
    if (item) {
      item.purchaseOptions.unshift(option)
      this.persistState()
    }
  }

  /**
   * Update a purchase option in the cache
   */
  updatePurchaseOption(itemId, optionId, updates) {
    const item = state.items.find(i => i.id === itemId)
    if (item) {
      const option = item.purchaseOptions.find(po => po.id === optionId)
      if (option) {
        Object.assign(option, updates)
        this.persistState()
      }
    }
  }

  /**
   * Remove a purchase option from an item in the cache
   */
  removePurchaseOption(itemId, optionId) {
    const item = state.items.find(i => i.id === itemId)
    if (item) {
      item.purchaseOptions = item.purchaseOptions.filter(po => po.id !== optionId)
      this.persistState()
    }
  }

  /**
   * Find an item by ID
   */
  findItem(itemId) {
    return state.items.find(item => item.id === itemId)
  }

  /**
   * Find an item that contains a specific purchase option
   */
  findItemByPurchaseOption(purchaseOptionId) {
    return state.items.find(item => 
      item.purchaseOptions.some(po => po.id === purchaseOptionId)
    )
  }

  // Getters
  get items() {
    return state.items
  }

  get loading() {
    return state.loading
  }

  get error() {
    return state.error
  }

  get loadedAt() {
    return state.loadedAt
  }

  get isLoaded() {
    return state.isLoaded
  }
}

// Create and export singleton instance
export const catalogStore = new CatalogStore()

// Export reactive state for Vue components
export const catalogState = state

// Computed properties for easy access
export const catalogItems = computed(() => state.items)
export const catalogLoading = computed(() => state.loading)
export const catalogError = computed(() => state.error)
export const catalogIsLoaded = computed(() => state.isLoaded)


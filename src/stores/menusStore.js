/**
 * Menus Store
 * Manages menus state and caching for the session
 * Follows the same pattern as authStore and catalogStore for consistency
 */

import { reactive, computed } from 'vue'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { authService } from '../services/authService.js'

// Reactive state
const state = reactive({
  menus: [],
  usersList: [],
  ownerUsernames: {},
  loading: false,
  loadingUsers: false,
  error: null,
  loadedAt: null,
  isLoaded: false,
  usersLoadedAt: null,
  isUsersLoaded: false,
  currentUserId: null
})

class MenusStore {
  constructor() {
  }

  persistState() {
    // Intentionally no-op: in-memory only cache.
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    state.loading = loading
  }

  /**
   * Set loading state for users
   */
  setLoadingUsers(loading) {
    state.loadingUsers = loading
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
   * Load all menus for a specific user from the API
   */
  async loadMenus(userId) {
    if (state.loading) {
      // If already loading, wait for it
      return
    }

    console.log('[MenusStore] loadMenus:start for user:', userId)
    this.setLoading(true)
    this.clearError()

    try {
      // Load user's menus
      const response = await menuCollectionService.getMenusOwnedByUser(userId)
      console.log('[MenusStore] Menus raw response from backend:', JSON.parse(JSON.stringify(response)))

      if (response && response.length > 0) {
        // Backend returns an array of objects, each with a `menus` field
        const allMenusRaw = response.map(entry => entry.menus)
        console.log('[MenusStore] All menus raw list:', allMenusRaw)
        let menuIds = []

        // Normalize to array of IDs
        for (const entry of allMenusRaw) {
          if (!entry) continue
          if (Array.isArray(entry)) {
            menuIds.push(...entry)
          } else if (typeof entry === 'string') {
            // Could be single ID or comma-separated list
            const parts = entry.split(',').map(s => s.trim()).filter(Boolean)
            menuIds.push(...parts)
          } else if (typeof entry === 'object') {
            // Object of ids; take values
            menuIds.push(...Object.values(entry))
          }
        }

        // Ensure menuIds is an array
        if (!Array.isArray(menuIds)) {
          menuIds = []
        }
        console.log('[MenusStore] Parsed menu IDs:', menuIds)

        // Load details for each menu
        const menuPromises = menuIds.map(async (menuId) => {
          console.log('[MenusStore] Fetching details for menuId:', menuId)
          const detailsResponse = await menuCollectionService.getMenuDetails(menuId)
          const recipesResponse = await menuCollectionService.getRecipesInMenu(menuId)

          const details = detailsResponse[0]
          const recipes = recipesResponse[0]?.menuRecipes || {}

          const built = {
            id: menuId,
            name: details.name,
            date: details.date,
            owner: details.owner,
            recipeCount: Object.keys(recipes).length
          }
          console.log('[MenusStore] Built menu card data:', built)
          return built
        })

        if (menuPromises.length > 0) {
          state.menus = await Promise.all(menuPromises)
          console.log('[MenusStore] Final menus array:', state.menus)
          // Sort menus by date (newest first)
          state.menus.sort((a, b) => new Date(b.date) - new Date(a.date))

          // Load usernames for all unique owners
          const uniqueOwners = [...new Set(state.menus.map(menu => menu.owner))]
          await this.loadUsernamesForOwners(uniqueOwners)
        } else {
          state.menus = []
        }
      } else {
        state.menus = []
      }

      state.loadedAt = Date.now()
      state.isLoaded = true
      state.currentUserId = userId
      this.persistState()
      console.log('[MenusStore] loadMenus:finish')
    } catch (error) {
      console.error('[MenusStore] Error loading menus:', error)
      this.setError(error.message || 'Failed to load menus')
      this.persistState()
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Ensure menus are loaded for a user, but don't reload if already loaded for that user
   */
  async ensureMenusLoaded(userId) {
    if (!state.isLoaded || state.currentUserId !== userId) {
      await this.loadMenus(userId)
    }
  }

  /**
   * Force refresh menus for a user from API
   */
  async refreshMenus(userId) {
    state.isLoaded = false
    await this.loadMenus(userId)
  }

  /**
   * Load all users list from the API
   */
  async loadUsers(currentUserId = null) {
    if (state.loadingUsers) {
      // If already loading, wait for it
      return
    }

    console.log('[MenusStore] loadUsers:start')
    this.setLoadingUsers(true)

    try {
      const response = await authService.getListOfUsers()
      console.log('[MenusStore] Users API response:', response)

      let userIds = []

      // Handle different possible response formats
      if (Array.isArray(response)) {
        // Case 1: [{ users: ["id1", "id2", ...] }]
        if (response.length > 0 && response[0]?.users) {
          const usersData = response[0].users
          console.log('[MenusStore] Found users array in response[0].users:', usersData)

          if (Array.isArray(usersData)) {
            userIds = usersData
          } else if (typeof usersData === 'string') {
            userIds = usersData.split(',').map(s => s.trim()).filter(Boolean)
          }
        }
        // Case 2: ["id1", "id2", ...] - direct array of IDs
        else if (response.length > 0 && typeof response[0] === 'string') {
          console.log('[MenusStore] Response is direct array of user IDs')
          userIds = response
        }
        // Case 3: Array of objects with user IDs
        else {
          response.forEach(item => {
            if (item?.users) {
              if (Array.isArray(item.users)) {
                userIds.push(...item.users)
              } else if (typeof item.users === 'string') {
                userIds.push(item.users)
              }
            } else if (item?.user) {
              userIds.push(item.user)
            } else if (typeof item === 'string') {
              userIds.push(item)
            }
          })
        }
      } else if (response && typeof response === 'object') {
        // Case 4: { users: ["id1", "id2", ...] }
        if (response.users) {
          if (Array.isArray(response.users)) {
            userIds = response.users
          } else if (typeof response.users === 'string') {
            userIds = response.users.split(',').map(s => s.trim()).filter(Boolean)
          }
        }
      } else if (typeof response === 'string') {
        // Case 5: Single user ID or comma-separated string
        userIds = response.split(',').map(s => s.trim()).filter(Boolean)
      }

      // Remove duplicates
      userIds = [...new Set(userIds)]
      console.log('[MenusStore] Parsed user IDs:', userIds)

      if (userIds.length > 0) {
        // Fetch usernames for all users
        const userPromises = userIds.map(async (userId) => {
          try {
            const username = await authService.getUsername(userId)
            // Cache username
            state.ownerUsernames[userId] = username
            return { id: userId, username }
          } catch (err) {
            console.error(`[MenusStore] Error fetching username for ${userId}:`, err)
            // Cache fallback
            state.ownerUsernames[userId] = userId
            return { id: userId, username: userId } // Fallback to ID
          }
        })

        const allUsers = await Promise.all(userPromises)

        // Filter out the current user from the list if provided
        if (currentUserId) {
          state.usersList = allUsers.filter(user => user.id !== currentUserId)
          console.log('[MenusStore] Filtered users list (excluding current user):', state.usersList)
        } else {
          state.usersList = allUsers
          console.log('[MenusStore] Final users list:', state.usersList)
        }
      } else {
        state.usersList = []
        console.warn('[MenusStore] No user IDs found in response')
      }

      state.usersLoadedAt = Date.now()
      state.isUsersLoaded = true
      this.persistState()
      console.log('[MenusStore] loadUsers:finish')
    } catch (error) {
      console.error('[MenusStore] Error loading users:', error)
      this.setError(error.message || 'Failed to load users')
      state.usersList = []
      this.persistState()
      throw error
    } finally {
      this.setLoadingUsers(false)
    }
  }

  /**
   * Ensure users list is loaded, but don't reload if already loaded
   */
  async ensureUsersLoaded(currentUserId = null) {
    if (!state.isUsersLoaded) {
      await this.loadUsers(currentUserId)
    }
  }

  /**
   * Force refresh users list from API
   */
  async refreshUsers(currentUserId = null) {
    state.isUsersLoaded = false
    await this.loadUsers(currentUserId)
  }

  /**
   * Load usernames for a list of owner IDs and cache them
   */
  async loadUsernamesForOwners(ownerIds) {
    const uncachedOwners = ownerIds.filter(id => !state.ownerUsernames[id])
    
    if (uncachedOwners.length > 0) {
      const usernamePromises = uncachedOwners.map(async (ownerId) => {
        try {
          const username = await authService.getUsername(ownerId)
          state.ownerUsernames[ownerId] = username
          return { ownerId, username }
        } catch (err) {
          console.error(`[MenusStore] Error fetching username for ${ownerId}:`, err)
          state.ownerUsernames[ownerId] = ownerId // Fallback to ID
          return { ownerId, username: ownerId }
        }
      })

      await Promise.all(usernamePromises)
      this.persistState()
    }
  }

  /**
   * Get username for an owner ID (from cache or fetch if not cached)
   */
  async getUsername(ownerId) {
    if (state.ownerUsernames[ownerId]) {
      return state.ownerUsernames[ownerId]
    }

    // Fetch and cache
    try {
      const username = await authService.getUsername(ownerId)
      state.ownerUsernames[ownerId] = username
      this.persistState()
      return username
    } catch (err) {
      console.error(`[MenusStore] Error fetching username for ${ownerId}:`, err)
      state.ownerUsernames[ownerId] = ownerId // Fallback to ID
      this.persistState()
      return ownerId
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    state.menus = []
    state.usersList = []
    state.ownerUsernames = {}
    state.loadedAt = null
    state.isLoaded = false
    state.usersLoadedAt = null
    state.isUsersLoaded = false
    state.currentUserId = null
    state.error = null
    this.persistState()
  }

  /**
   * Clear menus cache for a specific user
   */
  clearMenusForUser(userId) {
    if (state.currentUserId === userId) {
      state.menus = []
      state.isLoaded = false
      state.loadedAt = null
      state.currentUserId = null
      this.persistState()
    }
  }

  /**
   * Add a new menu to the cache
   */
  addMenu(menu) {
    state.menus.unshift(menu)
    // Sort menus by date (newest first)
    state.menus.sort((a, b) => new Date(b.date) - new Date(a.date))
    // Ensure username is cached for the owner
    if (menu.owner && !state.ownerUsernames[menu.owner]) {
      this.getUsername(menu.owner)
    }
    this.persistState()
  }

  /**
   * Update a menu in the cache
   */
  updateMenu(menuId, updates) {
    const menu = state.menus.find(m => m.id === menuId)
    if (menu) {
      const normalizedUpdates = { ...updates }
      if (normalizedUpdates.date instanceof Date) {
        normalizedUpdates.date = normalizedUpdates.date.toISOString()
      }
      Object.assign(menu, normalizedUpdates)
      // Re-sort after update
      state.menus.sort((a, b) => new Date(b.date) - new Date(a.date))
      this.persistState()
    }
  }

  /**
   * Remove a menu from the cache
   */
  removeMenu(menuId) {
    state.menus = state.menus.filter(menu => menu.id !== menuId)
    this.persistState()
  }

  /**
   * Find a menu by ID
   */
  findMenu(menuId) {
    return state.menus.find(menu => menu.id === menuId)
  }

  // Getters
  get menus() {
    return state.menus
  }

  get usersList() {
    return state.usersList
  }

  get ownerUsernames() {
    return state.ownerUsernames
  }

  get loading() {
    return state.loading
  }

  get loadingUsers() {
    return state.loadingUsers
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

  get usersLoadedAt() {
    return state.usersLoadedAt
  }

  get isUsersLoaded() {
    return state.isUsersLoaded
  }

  get currentUserId() {
    return state.currentUserId
  }
}

// Create and export singleton instance
export const menusStore = new MenusStore()

// Export reactive state for Vue components
export const menusState = state

// Computed properties for easy access
export const menus = computed(() => state.menus)
export const usersList = computed(() => state.usersList)
export const ownerUsernames = computed(() => state.ownerUsernames)
export const menusLoading = computed(() => state.loading)
export const menusLoadingUsers = computed(() => state.loadingUsers)
export const menusError = computed(() => state.error)
export const menusIsLoaded = computed(() => state.isLoaded)
export const menusIsUsersLoaded = computed(() => state.isUsersLoaded)


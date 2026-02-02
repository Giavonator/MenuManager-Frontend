<template>
  <div
    :class="[
      'menus-page',
      showPageHeaders ? 'page-container-with-header' : 'page-container-no-header'
    ]"
  >
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading menus...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-message">
        <h3>Error</h3>
        <p>{{ error }}</p>
        <button @click="retryLoadMenus" class="retry-btn">Retry</button>
      </div>
    </div>

    <!-- Menus Content -->
    <div v-else class="menus-content">
      <!-- Search Section -->
      <div class="search-section">
        <div v-if="showPageHeaders" class="page-header-block">
          <div class="page-header-text">
            <h2 class="page-header-title">Search Menus</h2>
            <p class="page-header-description">Browse menus from other users or search by date</p>
          </div>
        </div>

        <!-- Combined Search Bar -->
        <div class="search-card">
          <div class="combined-search-form">
            <!-- Search by User -->
            <div class="search-form-column">
              <label for="user-select">Search by User</label>
              <div class="search-form">
                <select 
                  id="user-select"
                  v-model="selectedUserId" 
                  class="form-input"
                  :disabled="isLoadingUsers"
                >
                  <option value="">-- Select a user --</option>
                  <option 
                    v-for="user in usersList" 
                    :key="user.id" 
                    :value="user.id"
                  >
                    {{ user.username }}
                  </option>
                </select>
                <button 
                  @click="searchByUser" 
                  class="search-btn"
                  :class="{ 'search-btn-inactive': activeSearchType === 'date' }"
                  :disabled="!selectedUserId || isSearching"
                >
                  {{ isSearching && activeSearchType === 'user' ? 'Searching...' : 'Load' }}
                </button>
              </div>
            </div>

            <!-- Search by Date -->
            <div class="search-form-column">
              <label for="search-date">Search by Date</label>
              <div class="search-form">
                <input 
                  id="search-date"
                  v-model="searchDate" 
                  type="date" 
                  class="form-input"
                />
                <button 
                  @click="searchByDate" 
                  class="search-btn"
                  :class="{ 'search-btn-inactive': activeSearchType === 'user' }"
                  :disabled="!searchDate || isSearching"
                >
                  {{ isSearching && activeSearchType === 'date' ? 'Searching...' : 'Find' }}
                </button>
              </div>
            </div>
          </div>
          
          <!-- Loading Users Indicator -->
          <div v-if="isLoadingUsers" class="loading-users">
            <span>Loading users...</span>
          </div>
          
          <!-- Error Loading Users -->
          <div v-if="!isLoadingUsers && usersList.length === 0" class="users-error">
            <span>No users available</span>
          </div>
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length > 0" class="search-results">
          <h3>Search Results</h3>
          <div class="menus-list">
            <div 
              v-for="menu in searchResults" 
              :key="menu.id" 
              class="menu-card"
              @click="viewMenu(menu.id)"
            >
              <div class="menu-card-header">
                <h3 class="menu-name">{{ menu.name }}</h3>
                <span class="menu-date">{{ formatDate(menu.date) }}</span>
              </div>
              <div class="menu-card-meta">
                <span class="menu-owner">Owner: {{ searchOwnerUsernames[menu.owner] || menu.owner }}</span>
                <span class="recipe-count">{{ menu.recipeCount }} recipes</span>
              </div>
            </div>
          </div>
        </div>

        <!-- No Search Results -->
        <div v-if="hasSearched && searchResults.length === 0" class="empty-search-state">
          <div class="empty-icon">🔍</div>
          <h3>No menus found</h3>
          <p>Try a different user or date</p>
        </div>
      </div>

      <!-- My Menus Section -->
      <div class="my-menus-section">
        <!-- Page Header -->
        <div v-if="showPageHeaders" class="page-header-block">
          <div class="page-header-row">
            <div class="page-header-text">
              <h1 class="page-header-title">My Menus</h1>
              <p class="page-header-description">View and manage historical menus</p>
            </div>
            <button @click="showCreateModal = true" class="create-menu-btn">
              Create New Menu
            </button>
          </div>
        </div>

        <!-- Menus List -->
        <div v-if="menus.length > 0" class="menus-list">
          <div 
            v-for="menu in menus" 
            :key="menu.id" 
            class="menu-card"
            @click="viewMenu(menu.id)"
          >
            <div class="menu-card-header">
              <h3 class="menu-name">{{ menu.name }}</h3>
              <span class="menu-date">{{ formatDate(menu.date) }}</span>
            </div>
            <div class="menu-card-meta">
              <span class="menu-owner">Owner: {{ ownerUsernames[menu.owner] || menu.owner }}</span>
              <span class="recipe-count">{{ getRecipeCount(menu.id) }} recipes</span>
            </div>
            <div class="menu-card-actions">
              <button @click.stop="viewMenu(menu.id)" class="view-btn">View Menu</button>
              <button @click.stop="editMenu(menu)" class="edit-btn">Edit</button>
              <button @click.stop="deleteMenu(menu)" class="delete-btn">Delete</button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No menus yet</h3>
          <p>Create your first menu to start organizing your recipes!</p>
          <button @click="showCreateModal = true" class="create-first-menu-btn">
            Create Your First Menu
          </button>
        </div>
      </div>
    </div>

    <!-- Create Menu Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create New Menu</h3>
          <button @click="closeCreateModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="menu-name">Menu Name</label>
            <input 
              id="menu-name"
              v-model="newMenu.name" 
              type="text" 
              class="form-input"
              :class="{ 'error': formErrors.name }"
              placeholder="e.g., Sunday Brunch, Weekday Dinners"
            />
            <span v-if="formErrors.name" class="error-message">{{ formErrors.name }}</span>
          </div>
          
          <div class="form-group">
            <label for="menu-date">Menu Date</label>
            <input 
              id="menu-date"
              v-model="newMenu.date" 
              type="date" 
              class="form-input"
              :class="{ 'error': formErrors.date }"
            />
            <span v-if="formErrors.date" class="error-message">{{ formErrors.date }}</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeCreateModal" class="cancel-btn">Cancel</button>
          <button 
            @click="createMenu" 
            class="create-btn"
            :disabled="isCreating"
          >
            {{ isCreating ? 'Creating...' : 'Create Menu' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { weeklyCartService } from '../services/weeklyCartService.js'
import { weeklyCartStore } from '../stores/weeklyCartStore.js'
import { authStore } from '../stores/authStore.js'
import { authService } from '../services/authService.js'
import { menusStore, menusState } from '../stores/menusStore.js'
import { SHOW_PAGE_HEADERS } from '../constants/uiConfig.js'

export default {
  name: 'MenusPage',
  emits: ['view-menu'],
  setup(props, { emit }) {
    // Use menus store for menus, users list, and owner usernames
    const isLoading = computed(() => menusState.loading)
    const isCreating = ref(false)
    const error = computed(() => menusState.error || null)
    
    const menus = computed(() => menusState.menus)
    const menuRecipeCounts = ref({})
    const ownerUsernames = computed(() => menusState.ownerUsernames)
    
    // Search state
    const usersList = computed(() => menusState.usersList)
    const isLoadingUsers = computed(() => menusState.loadingUsers)
    const selectedUserId = ref('')
    const searchResults = ref([])
    const searchOwnerUsernames = ref({})
    const isSearching = ref(false)
    const hasSearched = ref(false)
    const searchDate = ref('')
    const activeSearchType = ref(null) // 'user' or 'date' or null
    
    const showCreateModal = ref(false)
    const newMenu = reactive({
      name: '',
      date: ''
    })
    const formErrors = reactive({})

    const showPageHeaders = SHOW_PAGE_HEADERS
    
    // Computed properties
    const currentUser = computed(() => authStore.user)
    
    // Methods
    const retryLoadMenus = async () => {
      if (currentUser.value?.id) {
        await menusStore.refreshMenus(currentUser.value.id)
      }
    }
    
    const createMenu = async () => {
      if (!validateForm()) return
      
      isCreating.value = true
      
      try {
        // Convert date string to Date object at midnight UTC for the API
        const dateForAPI = new Date(`${newMenu.date}T00:00:00Z`)
        
        const response = await menuCollectionService.createMenu(
          newMenu.name,
          dateForAPI,
          currentUser.value.id
        )
        
        if (response.menu) {
          let menuDateStr = newMenu.date
          
          // Load menu details to add to cache
          try {
            const detailsResponse = await menuCollectionService.getMenuDetails(response.menu)
            const recipesResponse = await menuCollectionService.getRecipesInMenu(response.menu)
            
            const details = detailsResponse[0]
            const recipes = recipesResponse[0]?.menuRecipes || {}
            
            const newMenuData = {
              id: response.menu,
              name: details.name,
              date: details.date,
              owner: details.owner,
              recipeCount: Object.keys(recipes).length
            }
            
            // Add to store cache
            menusStore.addMenu(newMenuData)
            
            // Use date from details if available
            if (details.date) {
              menuDateStr = details.date.includes('T') 
                ? new Date(details.date).toISOString().split('T')[0] 
                : details.date
            }
          } catch (err) {
            console.error('Error loading new menu details:', err)
            // Still continue even if loading details fails
          }
          
          // Close modal and reset form
          closeCreateModal()
          
          // Menu is automatically added to weekly cart when created (backend synchronization)
          // Invalidate cache so UI reflects the new menu
          if (menuDateStr) {
            weeklyCartStore.clearWeekMenuMapping(menuDateStr)
          }
          
          // Navigate to the new menu
          emit('view-menu', response.menu)
        }
        
      } catch (err) {
        console.error('Error creating menu:', err)
        menusStore.setError(err.message || 'Failed to create menu')
      } finally {
        isCreating.value = false
      }
    }
    
    const validateForm = () => {
      clearFormErrors()
      let isValid = true
      
      if (!newMenu.name.trim()) {
        formErrors.name = 'Menu name is required'
        isValid = false
      }
      
      if (!newMenu.date) {
        formErrors.date = 'Menu date is required'
        isValid = false
      } else {
        // Check if date is in the future
        const selectedDate = new Date(newMenu.date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (selectedDate < today) {
          formErrors.date = 'Menu date must be in the future'
          isValid = false
        }
      }
      
      return isValid
    }
    
    const clearFormErrors = () => {
      Object.keys(formErrors).forEach(key => delete formErrors[key])
    }
    
    const resetForm = () => {
      newMenu.name = ''
      newMenu.date = ''
      clearFormErrors()
    }
    
    const closeCreateModal = () => {
      showCreateModal.value = false
      resetForm()
    }
    
    const viewMenu = (menuId) => {
      emit('view-menu', menuId)
    }
    
    const editMenu = (menu) => {
      // Navigate to menu page and open directly in edit mode
      emit('view-menu', { id: menu.id, edit: true })
    }
    
    const deleteMenu = async (menu) => {
      if (!confirm(`Are you sure you want to delete the menu "${menu.name}"? This action cannot be undone.`)) {
        return
      }
      
      try {
        // Delete the menu using the API
        await menuCollectionService.deleteMenu(menu.id)
        
        // Menu is automatically removed from weekly cart when deleted (backend synchronization)
        // Invalidate cache so UI reflects the menu removal
        if (menu.date) {
          const menuDateStr = menu.date.includes('T') 
            ? new Date(menu.date).toISOString().split('T')[0] 
            : menu.date
          weeklyCartStore.clearWeekMenuMapping(menuDateStr)
        }
        
        // Remove from store cache
        menusStore.removeMenu(menu.id)
      } catch (err) {
        console.error('Error deleting menu:', err)
        menusStore.setError(err.message || 'Failed to delete menu')
      }
    }
    
    const getRecipeCount = (menuId) => {
      const menu = menus.value.find(m => m.id === menuId)
      return menu ? menu.recipeCount : 0
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return ''
      
      try {
        // Normalize to UTC for consistent display
        const date = dateString.includes('T')
          ? new Date(dateString)
          : new Date(`${dateString}T00:00:00Z`)

        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        })
      } catch (error) {
        console.error('Error formatting date:', dateString, error)
        return dateString // Return original string if formatting fails
      }
    }
    
    // Search methods - users list is loaded from store
    
    const searchByUser = async () => {
      if (!selectedUserId.value) return
      
      activeSearchType.value = 'user'
      isSearching.value = true
      hasSearched.value = true
      searchResults.value = []
      searchOwnerUsernames.value = {}
      
      try {
        const response = await menuCollectionService.getMenusOwnedByUser(selectedUserId.value)
        
        if (response && response.length > 0) {
          const allMenusRaw = response.map(entry => entry.menus)
          let menuIds = []

          // Normalize to array of IDs
          for (const entry of allMenusRaw) {
            if (!entry) continue
            if (Array.isArray(entry)) {
              menuIds.push(...entry)
            } else if (typeof entry === 'string') {
              const parts = entry.split(',').map(s => s.trim()).filter(Boolean)
              menuIds.push(...parts)
            } else if (typeof entry === 'object') {
              menuIds.push(...Object.values(entry))
            }
          }
          
          // Load details for each menu
          const menuPromises = menuIds.map(async (menuId) => {
            const detailsResponse = await menuCollectionService.getMenuDetails(menuId)
            const recipesResponse = await menuCollectionService.getRecipesInMenu(menuId)
            
            const details = detailsResponse[0]
            const recipes = recipesResponse[0]?.menuRecipes || {}
            
            return {
              id: menuId,
              name: details.name,
              date: details.date,
              owner: details.owner,
              recipeCount: Object.keys(recipes).length
            }
          })
          
          if (menuPromises.length > 0) {
            searchResults.value = await Promise.all(menuPromises)
            searchResults.value.sort((a, b) => new Date(b.date) - new Date(a.date))
            
            // Load usernames for owners (use cached lookups)
            const uniqueOwners = [...new Set(searchResults.value.map(menu => menu.owner))]
            const usernamePromises = uniqueOwners.map(async (ownerId) => {
              const username = await menusStore.getUsername(ownerId)
              return { ownerId, username }
            })
            
            const usernameResults = await Promise.all(usernamePromises)
            usernameResults.forEach(({ ownerId, username }) => {
              searchOwnerUsernames.value[ownerId] = username
            })
          }
        }
      } catch (err) {
        console.error('Error searching by user:', err)
        menusStore.setError(err.message || 'Failed to search menus')
      } finally {
        isSearching.value = false
      }
    }
    
    const searchByDate = async () => {
      if (!searchDate.value) return
      
      activeSearchType.value = 'date'
      isSearching.value = true
      hasSearched.value = true
      searchResults.value = []
      searchOwnerUsernames.value = {}
      
      try {
        // Convert date string to Date object at midnight UTC
        const dateForAPI = new Date(`${searchDate.value}T00:00:00Z`)
        const response = await menuCollectionService.getMenuByDate(dateForAPI)
        
        if (response && response.length > 0) {
          const menuId = response[0]?.menu
          if (menuId) {
            // Load menu details
            const detailsResponse = await menuCollectionService.getMenuDetails(menuId)
            const recipesResponse = await menuCollectionService.getRecipesInMenu(menuId)
            
            const details = detailsResponse[0]
            const recipes = recipesResponse[0]?.menuRecipes || {}
            
            const menu = {
              id: menuId,
              name: details.name,
              date: details.date,
              owner: details.owner,
              recipeCount: Object.keys(recipes).length
            }
            
            searchResults.value = [menu]
            
            // Load username for owner (use cached lookup)
            const username = await menusStore.getUsername(menu.owner)
            searchOwnerUsernames.value[menu.owner] = username
          }
        }
      } catch (err) {
        console.error('Error searching by date:', err)
        // If menu not found, that's okay - just show empty results
        if (!err.message?.includes('not found')) {
          menusStore.setError(err.message || 'Failed to search menu by date')
        }
      } finally {
        isSearching.value = false
      }
    }
    
    // Watch for current user changes to reload menus if user changes
    watch(() => currentUser.value?.id, (newUserId, oldUserId) => {
      if (newUserId && newUserId !== oldUserId) {
        menusStore.ensureMenusLoaded(newUserId)
      }
    })

    // Lifecycle
    onMounted(() => {
      if (currentUser.value?.id) {
        menusStore.ensureMenusLoaded(currentUser.value.id)
      }
      menusStore.ensureUsersLoaded(currentUser.value?.id)
    })
    
    return {
      // State
      isLoading,
      isCreating,
      error,
      menus,
      ownerUsernames,
      showCreateModal,
      newMenu,
      formErrors,
      currentUser,
      showPageHeaders,
      
      // Search state
      usersList,
      isLoadingUsers,
      selectedUserId,
      searchResults,
      searchOwnerUsernames,
      isSearching,
      hasSearched,
      searchDate,
      activeSearchType,
      
      // Methods
      retryLoadMenus,
      createMenu,
      closeCreateModal,
      viewMenu,
      editMenu,
      deleteMenu,
      getRecipeCount,
      formatDate,
      searchByUser,
      searchByDate
    }
  }
}
</script>

<style scoped>
.menus-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.menus-page.page-container-with-header {
  padding-top: 3rem;
}

.menus-page.page-container-no-header {
  padding-top: 2rem;
}

/* Loading and Error States */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--primary-light);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  justify-content: center;
  padding: 4rem 2rem;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  max-width: 400px;
}

.error-message h3 {
  color: #c33;
  margin: 0 0 1rem 0;
}

.retry-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1rem;
}

.create-menu-btn, .create-first-menu-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
  flex: 0 0 auto;
}

.create-menu-btn:hover, .create-first-menu-btn:hover {
  background: var(--secondary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(52, 152, 219, 0.4);
}

/* Menus List */
.menus-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.menu-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: var(--primary-color);
}

.menu-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.menu-name {
  color: var(--primary-color);
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  flex: 1;
  min-width: 200px;
}

.menu-date {
  background: var(--primary-light);
  color: var(--primary-color);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.menu-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

.menu-owner {
  color: var(--secondary-color);
}

.recipe-count {
  background: #e8f5e8;
  color: #2d5a2d;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
}

.menu-card-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.view-btn, .edit-btn, .delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.view-btn {
  background: #002395;
  color: white;
  border: 1px solid #001f7a;
}

.view-btn:hover {
  background: #001f7a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 35, 149, 0.3);
}

.edit-btn {
  background: #ffffff;
  color: #333333;
  border: 1px solid #cccccc;
}

.edit-btn:hover {
  background: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.delete-btn {
  background: #ed2939;
  color: white;
  border: 1px solid #d21e2e;
}

.delete-btn:hover {
  background: #d21e2e;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(237, 41, 57, 0.3);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: var(--primary-color);
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
}

.empty-state p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: var(--primary-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 2rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e0e0e0;
}

/* Form Styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.form-input.error {
  border-color: #dc3545;
}

.error-message {
  color: #dc3545;
  font-size: 0.9rem;
  margin-top: 0.25rem;
  display: block;
}

/* Buttons */
.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: #5a6268;
}

.create-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.create-btn:hover:not(:disabled) {
  background: var(--secondary-color);
}

.create-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 768px) {
  .menus-page {
    padding: 1rem;
  }

  .menus-page.page-container-with-header {
    padding-top: 2rem;
  }

  .menus-page.page-container-no-header {
    padding-top: 1rem;
  }
  
  .menus-list {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .menu-card {
    padding: 1.5rem;
  }
  
  .menu-card-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .menu-card-actions {
    justify-content: stretch;
  }
  
  .menu-card-actions button {
    flex: 1;
  }
  
  .modal-content {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .modal-footer {
    padding: 1rem;
    flex-direction: column;
  }
  
  .modal-footer button {
    width: 100%;
  }
}

/* Search Section */
.search-section {
  margin-top: 0;
  margin-bottom: 5rem;
}

/* My Menus Section */
.my-menus-section {
  margin-top: 2rem;
}

.search-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.combined-search-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.search-form-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-form-column label {
  font-weight: 500;
  color: var(--primary-color);
  font-size: 0.9rem;
}

.search-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: end;
}

.search-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
  height: fit-content;
}

.search-btn:hover:not(:disabled) {
  background: var(--secondary-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

.search-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.search-btn-inactive:not(:disabled) {
  background: #9ca3af !important;
  opacity: 0.6;
  cursor: pointer;
}

.search-btn-inactive:not(:disabled):hover {
  background: #6b7280 !important;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

.loading-users,
.users-error {
  margin-top: 1rem;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: #666;
}

.users-error {
  color: #dc3545;
}

.search-results {
  margin-top: 2rem;
}

.search-results h3 {
  color: var(--primary-color);
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.empty-search-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #666;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  margin-top: 2rem;
}

.empty-search-state .empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-search-state h3 {
  color: var(--primary-color);
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.empty-search-state p {
  font-size: 1rem;
  margin: 0;
}

/* Responsive Design for Search */
@media (max-width: 768px) {
  .search-header h2 {
    font-size: 2rem;
  }
  
  .search-header p {
    font-size: 1rem;
  }
  
  .combined-search-form {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .search-form {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .search-btn {
    width: 100%;
  }
  
  .search-card {
    padding: 1.5rem;
  }
}
</style>

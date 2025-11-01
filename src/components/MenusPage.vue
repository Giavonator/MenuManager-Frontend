<template>
  <div class="menus-page">
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
        <button @click="loadMenus" class="retry-btn">Retry</button>
      </div>
    </div>

    <!-- Menus Content -->
    <div v-else class="menus-content">
      <!-- Page Header -->
      <div class="page-header">
        <h1>My Menus</h1>
        <p>Create and manage your recipe menus for different dates</p>
        <button @click="showCreateModal = true" class="create-menu-btn">
          Create New Menu
        </button>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { weeklyCartService } from '../services/weeklyCartService.js'
import { authStore } from '../stores/authStore.js'
import { authService } from '../services/authService.js'

export default {
  name: 'MenusPage',
  emits: ['view-menu'],
  setup(props, { emit }) {
    // Reactive state
    const isLoading = ref(false)
    const isCreating = ref(false)
    const error = ref(null)
    
    const menus = ref([])
    const menuRecipeCounts = ref({})
    const ownerUsernames = ref({})
    
    const showCreateModal = ref(false)
    const newMenu = reactive({
      name: '',
      date: ''
    })
    const formErrors = reactive({})
    
    // Computed properties
    const currentUser = computed(() => authStore.user)
    
    // Methods
    const loadMenus = async () => {
      if (!currentUser.value) return
      
      isLoading.value = true
      error.value = null
      
      try {
        // Load user's menus
        console.log('Loading menus for user:', currentUser.value.id)
        const response = await menuCollectionService.getMenusOwnedByUser(currentUser.value.id)
        console.log('Menus raw response from backend:', JSON.parse(JSON.stringify(response)))
        
        if (response && response.length > 0) {
          // Backend returns an array of objects, each with a `menus` field
          // e.g., [{ menus: "id1" }, { menus: "id2" }, ...]
          const allMenusRaw = response.map(entry => entry.menus)
          console.log('All menus raw list:', allMenusRaw)
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
          console.log('Parsed menu IDs:', menuIds)
          
          // Load details for each menu
          const menuPromises = menuIds.map(async (menuId) => {
            console.log('Fetching details for menuId:', menuId)
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
            console.log('Built menu card data:', built)
            return built
          })
          
          if (menuPromises.length > 0) {
            menus.value = await Promise.all(menuPromises)
            console.log('Final menus array to render:', menus.value)
            // Sort menus by date (newest first)
            menus.value.sort((a, b) => new Date(b.date) - new Date(a.date))
            
            // Load usernames for all unique owners
            const uniqueOwners = [...new Set(menus.value.map(menu => menu.owner))]
            const usernamePromises = uniqueOwners.map(async (ownerId) => {
              const username = await authService.getUsername(ownerId)
              return { ownerId, username }
            })
            
            const usernameResults = await Promise.all(usernamePromises)
            usernameResults.forEach(({ ownerId, username }) => {
              ownerUsernames.value[ownerId] = username
            })
          } else {
            menus.value = []
          }
        } else {
          menus.value = []
        }
        
      } catch (err) {
        console.error('Error loading menus:', err)
        error.value = err.message || 'Failed to load menus'
      } finally {
        isLoading.value = false
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
          // Reload menus to show the new one
          await loadMenus()
          
          // Close modal and reset form
          closeCreateModal()
          
          // Sync to Weekly Cart (creates cart if needed)
          try {
            await weeklyCartService.addMenuToCart(response.menu, newMenu.date)
          } catch (syncErr) {
            console.error('Failed to sync new menu to Weekly Cart:', syncErr)
          }
          
          // Navigate to the new menu
          emit('view-menu', response.menu)
        }
        
      } catch (err) {
        console.error('Error creating menu:', err)
        error.value = err.message || 'Failed to create menu'
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
        // Note: The API doesn't have a delete menu endpoint in the spec
        // This would need to be implemented in the backend
        error.value = 'Delete menu functionality not yet implemented in the backend API'
      } catch (err) {
        console.error('Error deleting menu:', err)
        error.value = err.message || 'Failed to delete menu'
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
    
    // Lifecycle
    onMounted(() => {
      loadMenus()
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
      
      // Methods
      loadMenus,
      createMenu,
      closeCreateModal,
      viewMenu,
      editMenu,
      deleteMenu,
      getRecipeCount,
      formatDate
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

/* Page Header */
.page-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid var(--primary-light);
}

.page-header h1 {
  color: var(--primary-color);
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
}

.page-header p {
  color: var(--secondary-color);
  margin: 0 0 2rem 0;
  font-size: 1.2rem;
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
  margin-bottom: 1.5rem;
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
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .page-header p {
    font-size: 1rem;
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
</style>

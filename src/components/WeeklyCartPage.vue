<template>
  <div class="weekly-cart-page">
    <!-- Header Section -->
    <div class="page-header">
      <h1>Weekly Cart</h1>
      <p>View and manage your weekly menus. Each week has its own cart that's created automatically.</p>
    </div>

    <!-- Week Navigation -->
    <div class="week-navigation">
      <button @click="goToPreviousWeek" class="nav-btn" :disabled="isLoading">
        <i class="arrow">←</i> Previous Week
      </button>
      
      <div class="week-display">
        <h2>{{ formatWeekRange(currentWeekStart) }}</h2>
        <button @click="goToCurrentWeek" class="current-week-btn" :disabled="isLoading">
          Go to Current Week
        </button>
        <div class="goto-date">
          <input
            type="date"
            v-model="goToDateValue"
            :disabled="isLoading"
            class="date-input"
          />
          <button @click="goToSelectedDate" class="current-week-btn" :disabled="isLoading || !goToDateValue">
            Go To Date
          </button>
        </div>
      </div>
      
      <button @click="goToNextWeek" class="nav-btn" :disabled="isLoading">
        Next Week <i class="arrow">→</i>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading weekly cart...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="loadWeekData" class="retry-btn">Retry</button>
    </div>

    <!-- Week Grid -->
    <div v-if="!isLoading && !error" class="week-grid">
      <!-- Day Headers -->
      <div class="day-headers">
        <div v-for="(dayName, index) in dayNames" :key="index" 
             :class="['day-header', { 'extra-day': index === 6 }]">
          {{ dayName }}
        </div>
      </div>

      <!-- Day Columns -->
      <div class="day-columns">
        <div v-for="(date, index) in weekDates" :key="index" 
             :class="['day-column', { 'extra-column': index === 6 }]">
          
          <!-- Regular Days (Su-F) -->
          <div v-if="index < 6" class="day-content">
            <div class="date-display">
              {{ formatDate(date) }}
            </div>
            
            <div class="menu-card" v-if="getMenuForDate(date)">
              <div class="menu-info">
                <h4>{{ getMenuForDate(date).name }}</h4>
                <p class="menu-date">{{ formatDate(date) }}</p>
                <p class="menu-owner" v-if="getMenuForDate(date).owner !== authState.user?.id">
                  by {{ getMenuForDate(date).ownerName || 'Other User' }}
                </p>
              </div>
              <div class="menu-actions">
                <button @click="viewMenu(getMenuForDate(date))" class="action-btn view-btn">
                  View
                </button>
                <button v-if="getMenuForDate(date).owner === authState.user?.id" 
                        @click="removeMenuFromCart(getMenuForDate(date))" 
                        class="action-btn remove-btn">
                  Remove
                </button>
              </div>
            </div>
            
            <div v-else class="no-menu">
              <p>No Menu</p>
              <button @click="addMenuToDate(date)" class="add-menu-btn">
                Add Menu
              </button>
            </div>
          </div>

          <!-- Extra Day (E) -->
          <div v-else class="extra-content">
            <div class="extra-header">
              <h3>Extra Menu</h3>
              <p>Miscellaneous Items</p>
            </div>
            
            <div v-if="extraMenu" class="extra-menu-card">
              <div class="extra-menu-info">
                <h4>{{ extraMenu.name || 'Extra Items' }}</h4>
                <p class="item-count">{{ getExtraMenuItemCount() }} items</p>
              </div>
              <div class="extra-menu-actions">
                <button @click="viewExtraMenu" class="action-btn view-btn">
                  View Items
                </button>
                <button @click="addItemToExtraMenu" class="action-btn add-btn">
                  Add Item
                </button>
              </div>
            </div>
            
            <div v-else class="no-extra-menu">
              <p>No Extra Menu</p>
              <button @click="createExtraMenu" class="create-extra-btn">
                Create Extra Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cart Information -->
    <div v-if="!isLoading && !error" class="cart-management">
      <div class="cart-actions">
        <button @click="viewCartDetails" class="action-btn secondary-btn" :disabled="!currentCart">
          View Cart Details
        </button>
        <button @click="debugWeekData" class="action-btn secondary-btn">
          Debug Info
        </button>
      </div>
      
      <div v-if="currentCart" class="cart-info">
        <p><strong>Week:</strong> {{ formatWeekRange(currentWeekStart) }}</p>
        <p><strong>Menus in Cart:</strong> {{ Object.keys(weekMenus).length }}</p>
        <p><strong>Cart Status:</strong> Active</p>
      </div>
      
      <div v-else class="cart-info">
        <p><strong>Week:</strong> {{ formatWeekRange(currentWeekStart) }}</p>
        <p><strong>Cart Status:</strong> No cart exists for this week</p>
        <p class="cart-note">Cart will be created automatically when you add your first menu.</p>
        <button @click="createCartForWeek" class="action-btn primary-btn" :disabled="isLoading">
          Create Cart for This Week
        </button>
      </div>
    </div>

    <!-- Weekly Ingredients List -->
    <div v-if="!isLoading && !error" class="weekly-ingredients">
      <div class="ingredients-header">
        <h3>Weekly Shopping List</h3>
        <p>Aggregated ingredients needed for the week</p>
        <button @click="loadWeeklyIngredients" class="action-btn secondary-btn" :disabled="isLoadingIngredients">
          {{ isLoadingIngredients ? 'Loading...' : 'Refresh Ingredients' }}
        </button>
      </div>
      
      <div v-if="isLoadingIngredients" class="loading-ingredients">
        <div class="spinner"></div>
        <p>Loading ingredients...</p>
      </div>
      
      <div v-else-if="weeklyIngredients.length === 0" class="no-ingredients">
        <p>No ingredients found for this week.</p>
        <p>Add menus to see ingredients here.</p>
      </div>
      
      <div v-else class="ingredients-list">
        <div class="ingredients-summary">
          <p><strong>Total Ingredients:</strong> {{ weeklyIngredients.length }}</p>
          <p><strong>Total Quantity:</strong> {{ totalQuantity }}</p>
        </div>
        
        <div class="ingredients-grid">
          <div v-for="ingredient in weeklyIngredients" :key="`${ingredient.name}-${ingredient.units}`" 
               class="ingredient-item">
            <div class="ingredient-info">
              <h4>{{ ingredient.name }}</h4>
              <p class="ingredient-details">
                <span class="quantity">{{ formatQuantity(ingredient.totalQuantity) }}</span>
                <span class="units">{{ ingredient.units }}</span>
                <span class="sources">({{ ingredient.sources.length }} menu{{ ingredient.sources.length !== 1 ? 's' : '' }})</span>
              </p>
            </div>
            <div class="ingredient-sources">
              <div v-for="source in ingredient.sources" :key="source.menuId" class="source-item">
                <span class="source-menu">{{ source.menuName }}</span>
                <span class="source-date">{{ source.date }}</span>
                <span class="source-quantity">{{ formatQuantity(source.quantity) }} {{ ingredient.units }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Add Menu Modal -->
    <div v-if="showAddMenuModal" class="modal-overlay" @click="closeAddMenuModal">
      <div class="modal" @click.stop>
        <h3>Add Menu to {{ formatDate(selectedDate) }}</h3>
        <div class="modal-content">
          <p>This will create a new menu for {{ formatDate(selectedDate) }} and add it to the weekly cart. If no cart exists for this week, one will be created automatically.</p>
          <div class="modal-actions">
            <button @click="confirmAddMenu" class="action-btn primary-btn" :disabled="isLoading">
              Create Menu
            </button>
            <button @click="closeAddMenuModal" class="action-btn secondary-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal" @click.stop>
        <h3>{{ confirmModal.title }}</h3>
        <div class="modal-content">
          <p>{{ confirmModal.message }}</p>
          <div class="modal-actions">
            <button @click="confirmAction" class="action-btn danger-btn" :disabled="isLoading">
              {{ confirmModal.confirmText }}
            </button>
            <button @click="closeConfirmModal" class="action-btn secondary-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { weeklyCartService } from '../services/weeklyCartService.js'
import { purchaseSystemService } from '../services/purchaseSystemService.js'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { cookBookService } from '../services/cookBookService.js'
import { authState } from '../stores/authStore.js'

export default {
  name: 'WeeklyCartPage',
  setup() {
    // Reactive state
    const isLoading = ref(false)
    const error = ref(null)
    const currentWeekStart = ref(weeklyCartService.getWeekStart(new Date()))
    const currentCart = ref(null)
    const weekMenus = ref({})
    const extraMenu = ref(null)
    const weeklyIngredients = ref([])
    const isLoadingIngredients = ref(false)
    
    // Modal state
    const showAddMenuModal = ref(false)
    const showConfirmModal = ref(false)
    const selectedDate = ref(null)
    const confirmModal = ref({
      title: '',
      message: '',
      confirmText: '',
      action: null
    })

    // Computed properties
    const dayNames = computed(() => weeklyCartService.getDayNames())
    const weekDates = computed(() => weeklyCartService.getWeekDates(currentWeekStart.value))
    const goToDateValue = ref('')
    
    const totalQuantity = computed(() => {
      return weeklyIngredients.value.reduce((total, ingredient) => {
        return total + ingredient.totalQuantity
      }, 0)
    })

    // Methods
    const formatDate = (date) => {
      return weeklyCartService.formatDate(date)
    }

    const formatWeekRange = (weekStart) => {
      const weekEnd = weeklyCartService.getWeekEnd(new Date(weekStart))
      return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
    }

    const getMenuForDate = (date) => {
      const dateStr = formatDate(date)
      return weekMenus.value[dateStr] || null
    }

    const getExtraMenuItemCount = () => {
      if (!extraMenu.value) return 0
      // This would need to be implemented based on the actual extra menu structure
      return 0
    }

    const formatQuantity = (quantity) => {
      // Format quantity to show up to 2 decimal places, removing trailing zeros
      return parseFloat(quantity.toFixed(2))
    }

    const loadWeeklyIngredients = async () => {
      isLoadingIngredients.value = true
      weeklyIngredients.value = []

      try {
        const currentUser = authState.user
        if (!currentUser) {
          throw new Error('No user logged in')
        }

        const ingredientsMap = new Map()

        // Get all menus for the current week
        const weekDatesArray = weeklyCartService.getWeekDates(currentWeekStart.value)
        
        for (const date of weekDatesArray) {
          const dateStr = formatDate(date)
          const menu = weekMenus.value[dateStr]
          
          if (menu) {
            try {
              // Get ingredients for this menu
              const ingredientsResponse = await menuCollectionService.getRecipesInMenu(menu.id)
              console.log(`Ingredients for menu ${menu.id} (${dateStr}):`, ingredientsResponse)
              
              if (ingredientsResponse[0]?.menuRecipes) {
                const menuRecipes = ingredientsResponse[0].menuRecipes
                
                // For each recipe in the menu, get its ingredients
                for (const [recipeId, scalingFactor] of Object.entries(menuRecipes)) {
                  try {
                    const recipeIngredientsResponse = await cookBookService.getRecipeIngredients(recipeId)
                    console.log(`Recipe ${recipeId} ingredients:`, recipeIngredientsResponse)
                    
                    if (recipeIngredientsResponse[0]?.ingredients) {
                      const recipeIngredients = recipeIngredientsResponse[0].ingredients
                      
                      // Process each ingredient
                      for (const ingredient of recipeIngredients) {
                        const scaledQuantity = ingredient.quantity * scalingFactor
                        const key = `${ingredient.name}-${ingredient.units}`
                        
                        if (ingredientsMap.has(key)) {
                          const existing = ingredientsMap.get(key)
                          existing.totalQuantity += scaledQuantity
                          existing.sources.push({
                            menuId: menu.id,
                            menuName: menu.name,
                            date: dateStr,
                            quantity: scaledQuantity
                          })
                        } else {
                          ingredientsMap.set(key, {
                            name: ingredient.name,
                            units: ingredient.units,
                            totalQuantity: scaledQuantity,
                            sources: [{
                              menuId: menu.id,
                              menuName: menu.name,
                              date: dateStr,
                              quantity: scaledQuantity
                            }]
                          })
                        }
                      }
                    }
                  } catch (recipeErr) {
                    console.error(`Error loading ingredients for recipe ${recipeId}:`, recipeErr)
                  }
                }
              }
            } catch (menuErr) {
              console.error(`Error loading ingredients for menu ${menu.id}:`, menuErr)
            }
          }
        }

        // Convert map to array and sort by name
        weeklyIngredients.value = Array.from(ingredientsMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))

        console.log('Weekly ingredients loaded:', weeklyIngredients.value)

      } catch (err) {
        console.error('Error loading weekly ingredients:', err)
        error.value = err.message || 'Failed to load weekly ingredients'
      } finally {
        isLoadingIngredients.value = false
      }
    }

    const loadWeekData = async () => {
      isLoading.value = true
      error.value = null

      try {
        // Clear existing menus
        weekMenus.value = {}
        
        // Get current user
        const currentUser = authState.user
        if (!currentUser) {
          throw new Error('No user logged in')
        }

        // Get cart for current week
        const weekStartStr = formatDate(currentWeekStart.value)
        console.log('Loading cart for week starting:', weekStartStr)
        const cartResponse = await weeklyCartService.getCartByDate(weekStartStr)
        console.log('Cart response:', cartResponse)
        
        if (cartResponse[0]?.cart) {
          currentCart.value = { id: cartResponse[0].cart }
          console.log('Found cart:', currentCart.value.id)

          // Get menus in cart (as a set for quick membership checks)
          const menusResponse = await weeklyCartService.getMenusInCart(currentCart.value.id)
          console.log('Menus in cart response:', menusResponse)

          const cartMenuIds = new Set(menusResponse[0]?.menus || [])
          console.log('Cart menu IDs:', Array.from(cartMenuIds))

          // For each date of the week, check if a menu exists and if it's in the cart
          const weekDatesArray = weeklyCartService.getWeekDates(currentWeekStart.value)
          for (const date of weekDatesArray) {
            const dateStr = formatDate(date)
            try {
              const byDateResp = await menuCollectionService.getMenuByDate(dateStr)
              const menuIdForDate = byDateResp[0]?.menu
              if (menuIdForDate && cartMenuIds.has(menuIdForDate)) {
                // Fetch details and map to this exact date column
                const menuDetails = await menuCollectionService.getMenuDetails(menuIdForDate)
                if (menuDetails[0]) {
                  const menu = menuDetails[0]
                  weekMenus.value[dateStr] = {
                    id: menuIdForDate,
                    name: menu.name,
                    date: menu.date,
                    owner: menu.owner
                  }
                  console.log(`Placed cart menu ${menuIdForDate} on ${dateStr}`)
                }
              } else {
                // Ensure empty dates show no menu explicitly
                if (!weekMenus.value[dateStr]) {
                  // leave as empty; UI shows placeholder
                }
              }
            } catch (e) {
              console.log(`No menu for ${dateStr} or error occurred:`, e.message)
            }
          }
        } else {
          console.log('No cart found for this week')
          currentCart.value = null
        }

        // If no cart was found, try to create one for this week
        if (!currentCart.value) {
          console.log('No cart found, attempting to create one for this week')
          try {
            const createCartResponse = await weeklyCartService.createCart(weekStartStr)
            console.log('Create cart response:', createCartResponse)
            
            if (createCartResponse.cart) {
              currentCart.value = { id: createCartResponse.cart }
              console.log('Created new cart:', currentCart.value.id)
            }
          } catch (createErr) {
            console.log('Could not create cart (might already exist):', createErr.message)
            // Try to get the cart again in case it was created by another process
            const retryCartResponse = await weeklyCartService.getCartByDate(weekStartStr)
            if (retryCartResponse[0]?.cart) {
              currentCart.value = { id: retryCartResponse[0].cart }
              console.log('Found cart on retry:', currentCart.value.id)
            }
          }
        }

        // Load extra menu if it exists
        await loadExtraMenu()

        // Load weekly ingredients after menus are loaded
        await loadWeeklyIngredients()
        
        console.log('Final weekMenus:', weekMenus.value)

      } catch (err) {
        console.error('Error loading week data:', err)
        error.value = err.message || 'Failed to load week data'
      } finally {
        isLoading.value = false
      }
    }

    const loadExtraMenu = async () => {
      try {
        // Check if extra menu exists for this week
        const extraMenuId = `extra-${formatDate(currentWeekStart.value)}`
        const orderResponse = await purchaseSystemService.getOrderByAssociateID(extraMenuId)
        
        if (orderResponse[0]?.order) {
          extraMenu.value = {
            id: orderResponse[0].order._id,
            name: 'Extra Items',
            associateID: extraMenuId
          }
        } else {
          extraMenu.value = null
        }
      } catch (err) {
        console.error('Error loading extra menu:', err)
        extraMenu.value = null
      }
    }

    const goToPreviousWeek = () => {
      const newWeekStart = new Date(currentWeekStart.value)
      newWeekStart.setUTCDate(newWeekStart.getUTCDate() - 7)
      currentWeekStart.value = newWeekStart
    }

    const goToNextWeek = () => {
      const newWeekStart = new Date(currentWeekStart.value)
      newWeekStart.setUTCDate(newWeekStart.getUTCDate() + 7)
      currentWeekStart.value = newWeekStart
    }

    const goToCurrentWeek = () => {
      currentWeekStart.value = weeklyCartService.getWeekStart(new Date())
    }

    const goToSelectedDate = () => {
      if (!goToDateValue.value) return
      const selected = new Date(goToDateValue.value)
      currentWeekStart.value = weeklyCartService.getWeekStart(selected)
    }

    const createCartForWeek = async () => {
      isLoading.value = true
      try {
        const weekStartStr = formatDate(currentWeekStart.value)
        console.log('Creating cart for week starting:', weekStartStr)
        
        const createCartResponse = await weeklyCartService.createCart(weekStartStr)
        console.log('Create cart response:', createCartResponse)
        
        if (createCartResponse.cart) {
          currentCart.value = { id: createCartResponse.cart }
          console.log('Created cart:', currentCart.value.id)
          await loadWeekData() // Refresh data
        } else {
          throw new Error('Failed to create cart')
        }
      } catch (err) {
        console.error('Error creating cart:', err)
        error.value = err.message || 'Failed to create cart'
      } finally {
        isLoading.value = false
      }
    }

    const addMenuToDate = (date) => {
      selectedDate.value = date
      showAddMenuModal.value = true
    }

    const confirmAddMenu = async () => {
      if (!selectedDate.value) return

      isLoading.value = true
      try {
        // Get current user
        const currentUser = authState.user
        if (!currentUser) {
          throw new Error('No user logged in')
        }

        const dateStr = formatDate(selectedDate.value)
        const menuName = `Menu for ${dateStr}`
        
        // Create a new menu for the selected date using MenuCollection API
        const menuResponse = await menuCollectionService.createMenu(menuName, dateStr, currentUser.id)
        
        if (menuResponse.menu) {
          const menuId = menuResponse.menu
          console.log(`Created menu ${menuId} for date ${dateStr}`)
          
          // Add menu to cart (this will automatically create a cart if one doesn't exist)
          try {
            console.log(`Adding menu ${menuId} to WeeklyCart for date ${dateStr}`)
            const addToCartResponse = await weeklyCartService.addMenuToCart(menuId, dateStr)
            console.log(`Add to cart response:`, addToCartResponse)
            
            if (addToCartResponse.cart) {
              console.log(`Menu added to cart ${addToCartResponse.cart}`)
            }
          } catch (addErr) {
            console.error(`Error adding menu to cart:`, addErr)
            throw new Error(`Failed to add menu to cart: ${addErr.message}`)
          }
          
          // Update local state
          weekMenus.value[dateStr] = {
            id: menuId,
            name: menuName,
            date: dateStr,
            owner: currentUser.id
          }

          closeAddMenuModal()
          await loadWeekData() // Refresh data
        } else {
          throw new Error('Failed to create menu')
        }
      } catch (err) {
        console.error('Error adding menu:', err)
        error.value = err.message || 'Failed to add menu'
      } finally {
        isLoading.value = false
      }
    }

    const removeMenuFromCart = (menu) => {
      // Check if the current user owns this menu
      if (menu.owner !== authState.user?.id) {
        error.value = 'You can only remove menus that you created'
        return
      }

      confirmModal.value = {
        title: 'Remove Menu',
        message: `Are you sure you want to remove "${menu.name}" from the cart?`,
        confirmText: 'Remove',
        action: async () => {
          try {
            await weeklyCartService.removeMenuFromCart(menu.id)
            delete weekMenus.value[menu.date]
            await loadWeekData() // Refresh data
          } catch (err) {
            console.error('Error removing menu:', err)
            error.value = err.message || 'Failed to remove menu'
          }
        }
      }
      showConfirmModal.value = true
    }


    const viewCartDetails = async () => {
      if (!currentCart.value) return

      try {
        const datesResponse = await weeklyCartService.getCartDates(currentCart.value.id)
        const menusResponse = await weeklyCartService.getMenusInCart(currentCart.value.id)
        
        console.log('Cart Details:', {
          dates: datesResponse,
          menus: menusResponse
        })
        
        // You could show this in a modal or alert
        alert(`Cart Details:\nDates: ${JSON.stringify(datesResponse)}\nMenus: ${JSON.stringify(menusResponse)}`)
      } catch (err) {
        console.error('Error getting cart details:', err)
        error.value = err.message || 'Failed to get cart details'
      }
    }

    const debugWeekData = async () => {
      const currentUser = authState.user
      const weekDatesArray = weeklyCartService.getWeekDates(currentWeekStart.value)
      const weekStartStr = formatDate(currentWeekStart.value)
      
      console.log('=== DEBUG WEEK DATA ===')
      console.log('Current User:', currentUser)
      console.log('Current Week Start:', currentWeekStart.value)
      console.log('Week Start String:', weekStartStr)
      console.log('Week Dates:', weekDatesArray.map(d => formatDate(d)))
      console.log('Current Cart:', currentCart.value)
      console.log('Week Menus:', weekMenus.value)
      console.log('Extra Menu:', extraMenu.value)
      
      // Test WeeklyCart APIs
      try {
        console.log('=== TESTING WEEKLY CART APIs ===')
        
        // Test getCartByDate
        console.log('Testing getCartByDate for:', weekStartStr)
        const cartResponse = await weeklyCartService.getCartByDate(weekStartStr)
        console.log('getCartByDate response:', cartResponse)
        
        if (cartResponse[0]?.cart) {
          const cartId = cartResponse[0].cart
          console.log('Found cart ID:', cartId)
          
          // Test getMenusInCart
          console.log('Testing getMenusInCart for cart:', cartId)
          const menusResponse = await weeklyCartService.getMenusInCart(cartId)
          console.log('getMenusInCart response:', menusResponse)
          
          if (menusResponse[0]?.menus) {
            console.log('Menus in cart:', menusResponse[0].menus)
            
            // Test getMenuDetails for each menu
            for (const menuId of menusResponse[0].menus) {
              console.log(`Testing getMenuDetails for menu: ${menuId}`)
              const menuDetails = await menuCollectionService.getMenuDetails(menuId)
              console.log(`Menu details for ${menuId}:`, menuDetails)
            }
          }
        }
        
        // Test getMenuByDate for each day in the week
        console.log('=== TESTING MENU BY DATE ===')
        for (const date of weekDatesArray) {
          const dateStr = formatDate(date)
          try {
            const menuResponse = await menuCollectionService.getMenuByDate(dateStr)
            console.log(`Menu for ${dateStr}:`, menuResponse)
          } catch (err) {
            console.log(`No menu for ${dateStr}:`, err.message)
          }
        }
        
      } catch (err) {
        console.error('Error testing APIs:', err)
      }
      
      // Check if 10/30/25 is in the current week
      const targetDate = new Date('2025-10-30')
      const weekStart = new Date(currentWeekStart.value)
      const weekEnd = new Date(weekStart)
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
      
      console.log('Target Date (10/30/25):', targetDate)
      console.log('Week Range:', weekStart, 'to', weekEnd)
      console.log('Is 10/30/25 in current week?', targetDate >= weekStart && targetDate <= weekEnd)
      
      alert(`Debug Info logged to console. Check browser console for details.\n\nCurrent Week: ${formatWeekRange(currentWeekStart.value)}\nMenus Found: ${Object.keys(weekMenus.value).length}\nCart ID: ${currentCart.value?.id || 'None'}\nTarget Date 10/30/25 in week: ${targetDate >= weekStart && targetDate <= weekEnd}`)
    }

    const createExtraMenu = async () => {
      isLoading.value = true
      try {
        const extraMenuId = `extra-${formatDate(currentWeekStart.value)}`
        const response = await purchaseSystemService.createCompositeOrder(extraMenuId)
        
        if (response.compositeOrder) {
          extraMenu.value = {
            id: response.compositeOrder,
            name: 'Extra Items',
            associateID: extraMenuId
          }
        }
      } catch (err) {
        console.error('Error creating extra menu:', err)
        error.value = err.message || 'Failed to create extra menu'
      } finally {
        isLoading.value = false
      }
    }

    const viewExtraMenu = () => {
      // This would open a detailed view of the extra menu items
      console.log('View extra menu:', extraMenu.value)
    }

    const addItemToExtraMenu = () => {
      // This would open a form to add items to the extra menu
      console.log('Add item to extra menu')
    }

    const viewMenu = (menu) => {
      // This would open a detailed view of the menu
      console.log('View menu:', menu)
    }

    const closeAddMenuModal = () => {
      showAddMenuModal.value = false
      selectedDate.value = null
    }

    const closeConfirmModal = () => {
      showConfirmModal.value = false
      confirmModal.value = {
        title: '',
        message: '',
        confirmText: '',
        action: null
      }
    }

    const confirmAction = async () => {
      if (confirmModal.value.action) {
        await confirmModal.value.action()
      }
      closeConfirmModal()
    }

    // Watch for week changes
    watch(currentWeekStart, () => {
      loadWeekData()
    })

    // Initialize
    onMounted(() => {
      loadWeekData()
    })

    return {
      // State
      isLoading,
      error,
      currentWeekStart,
      currentCart,
      weekMenus,
      extraMenu,
      weeklyIngredients,
      isLoadingIngredients,
      showAddMenuModal,
      showConfirmModal,
      selectedDate,
      confirmModal,
      
      // Computed
      dayNames,
      weekDates,
      totalQuantity,
      
      // Methods
      formatDate,
      formatWeekRange,
      getMenuForDate,
      getExtraMenuItemCount,
      formatQuantity,
      loadWeeklyIngredients,
      loadWeekData,
      goToPreviousWeek,
      goToNextWeek,
      goToCurrentWeek,
      goToSelectedDate,
      goToDateValue,
      createCartForWeek,
      addMenuToDate,
      confirmAddMenu,
      removeMenuFromCart,
      viewCartDetails,
      debugWeekData,
      createExtraMenu,
      viewExtraMenu,
      addItemToExtraMenu,
      viewMenu,
      closeAddMenuModal,
      closeConfirmModal,
      confirmAction,
      // expose authState so template can safely read current user
      authState
    }
  }
}
</script>

<style scoped>
.weekly-cart-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  color: var(--primary-color);
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.page-header p {
  color: var(--secondary-color);
  font-size: 1.1rem;
}

.week-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--primary-light);
  border-radius: 12px;
}

.nav-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn:hover:not(:disabled) {
  background: var(--secondary-color);
  transform: translateY(-2px);
}

.nav-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.week-display {
  text-align: center;
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.week-display h2 {
  color: var(--primary-color);
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.goto-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  background: #fff;
}

.current-week-btn {
  background: var(--secondary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.current-week-btn:hover:not(:disabled) {
  background: var(--primary-color);
}

.loading-state, .error-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--primary-light);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #e74c3c;
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.retry-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: var(--secondary-color);
}

.week-grid {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
}

.day-headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--primary-color);
  color: white;
}

.day-header {
  padding: 1rem;
  text-align: center;
  font-weight: 600;
  font-size: 1.1rem;
}

.extra-day {
  background: var(--secondary-color);
}

.day-columns {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 200px;
}

.day-column {
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.day-column:last-child {
  border-right: none;
}

.extra-column {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.day-content, .extra-content {
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
}

.date-display {
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
  text-align: center;
}

.menu-card, .extra-menu-card {
  background: white;
  border: 2px solid var(--primary-light);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.extra-menu-card {
  border-color: var(--secondary-color);
  background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
}

.menu-info, .extra-menu-info {
  margin-bottom: 0.5rem;
}

.menu-info h4, .extra-menu-info h4 {
  margin: 0 0 0.25rem 0;
  color: var(--primary-color);
  font-size: 1rem;
}

.menu-date, .item-count {
  color: var(--secondary-color);
  font-size: 0.9rem;
  margin: 0;
}

.menu-owner {
  color: #6c757d;
  font-size: 0.8rem;
  margin: 0;
  font-style: italic;
}

.menu-actions, .extra-menu-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 60px;
}

.view-btn {
  background: var(--primary-color);
  color: white;
}

.view-btn:hover {
  background: var(--secondary-color);
}

.remove-btn {
  background: #e74c3c;
  color: white;
}

.remove-btn:hover {
  background: #c0392b;
}

.add-btn {
  background: #27ae60;
  color: white;
}

.add-btn:hover {
  background: #229954;
}

.primary-btn {
  background: var(--primary-color);
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.primary-btn:hover:not(:disabled) {
  background: var(--secondary-color);
  transform: translateY(-2px);
}

.secondary-btn {
  background: #6c757d;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.secondary-btn:hover:not(:disabled) {
  background: #5a6268;
}

.danger-btn {
  background: #e74c3c;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.danger-btn:hover:not(:disabled) {
  background: #c0392b;
}

.no-menu, .no-extra-menu {
  text-align: center;
  color: var(--secondary-color);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;
}

.add-menu-btn, .create-extra-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.add-menu-btn:hover, .create-extra-btn:hover {
  background: var(--secondary-color);
}

.extra-header {
  text-align: center;
  margin-bottom: 1rem;
}

.extra-header h3 {
  color: var(--secondary-color);
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.extra-header p {
  color: var(--secondary-color);
  margin: 0;
  font-size: 0.9rem;
}

.cart-management {
  background: var(--primary-light);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.cart-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.cart-info {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
}

.cart-info p {
  margin: 0.5rem 0;
  color: var(--primary-color);
}

.cart-info strong {
  color: var(--secondary-color);
}

.cart-note {
  color: #6c757d;
  font-style: italic;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h3 {
  color: var(--primary-color);
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.modal-content {
  margin-bottom: 1.5rem;
}

.modal-content p {
  color: var(--secondary-color);
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* Weekly Ingredients Styles */
.weekly-ingredients {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  overflow: hidden;
}

.ingredients-header {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.ingredients-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.ingredients-header p {
  margin: 0.25rem 0 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.loading-ingredients {
  text-align: center;
  padding: 3rem;
}

.no-ingredients {
  text-align: center;
  padding: 3rem;
  color: var(--secondary-color);
}

.no-ingredients p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.ingredients-list {
  padding: 2rem;
}

.ingredients-summary {
  background: var(--primary-light);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.ingredients-summary p {
  margin: 0;
  color: var(--primary-color);
  font-size: 1rem;
}

.ingredients-summary strong {
  color: var(--secondary-color);
}

.ingredients-grid {
  display: grid;
  gap: 1.5rem;
}

.ingredient-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.ingredient-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ingredient-info {
  margin-bottom: 1rem;
}

.ingredient-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--primary-color);
  font-size: 1.2rem;
  font-weight: 600;
}

.ingredient-details {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin: 0;
}

.quantity {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.units {
  color: var(--secondary-color);
  font-weight: 500;
  font-size: 0.9rem;
}

.sources {
  color: #6c757d;
  font-size: 0.8rem;
  font-style: italic;
}

.ingredient-sources {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  font-size: 0.9rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.source-menu {
  color: var(--primary-color);
  font-weight: 500;
  flex: 1;
  min-width: 120px;
}

.source-date {
  color: var(--secondary-color);
  font-size: 0.8rem;
  min-width: 80px;
}

.source-quantity {
  color: #6c757d;
  font-size: 0.8rem;
  font-weight: 500;
  min-width: 80px;
  text-align: right;
}

/* Responsive Design */
@media (max-width: 768px) {
  .weekly-cart-page {
    padding: 1rem;
  }

  .week-navigation {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .day-headers, .day-columns {
    grid-template-columns: 1fr;
  }

  .day-column {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .day-column:last-child {
    border-bottom: none;
  }

  .cart-actions {
    flex-direction: column;
  }

  .modal-actions {
    flex-direction: column;
  }

  .ingredients-header {
    flex-direction: column;
    text-align: center;
  }

  .ingredients-summary {
    flex-direction: column;
    gap: 1rem;
  }

  .source-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .source-quantity {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .page-header h1 {
    font-size: 2rem;
  }

  .week-display h2 {
    font-size: 1.2rem;
  }

  .menu-actions, .extra-menu-actions {
    flex-direction: column;
  }

  .action-btn {
    min-width: auto;
  }
}
</style>

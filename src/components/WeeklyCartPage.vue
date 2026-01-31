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
    <div v-if="isLoading || isAddingMenu" class="loading-state">
      <div class="spinner"></div>
      <p>{{ isAddingMenu ? 'Adding menu...' : 'Loading weekly cart...' }}</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="loadWeekData" class="retry-btn">Retry</button>
    </div>

    <!-- Week Grid -->
    <div v-if="!isLoading && !isAddingMenu && !error" class="week-grid">
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
          
          <div class="day-content">
            <div class="date-display">
              {{ formatDate(date) }}
            </div>
            
            <div class="menu-card" v-if="getMenuForDate(date)">
              <div class="menu-info">
                <h4>{{ getMenuForDate(date).name }}</h4>
                <p class="menu-owner">
                  by {{ getMenuForDate(date).ownerName || (getMenuForDate(date).owner === authState.user?.id ? (authState.user?.username || 'You') : 'Other User') }}
                </p>
                <ul class="recipe-list" v-if="getMenuForDate(date).recipeNames && getMenuForDate(date).recipeNames.length">
                  <li v-for="(rName, idx) in getMenuForDate(date).recipeNames" :key="idx">{{ idx + 1 }}. {{ rName }}</li>
                </ul>
              </div>
              <div class="menu-actions">
                <button @click="viewMenu(getMenuForDate(date))" class="action-btn view-btn">
                  View
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
        </div>
      </div>
    </div>

    <!-- Weekly Ingredients List -->
    <div v-if="!isLoading && !error" class="weekly-ingredients">
      <div class="ingredients-header">
        <div class="header-title">
          <h3>Weekly Shopping List</h3>
          <p>Aggregated ingredients needed for the week</p>
        </div>
        <div class="header-controls">
          <div class="sorting-controls">
            <span class="sort-label">Sort:</span>
            <label class="sort-toggle">
              <input type="checkbox" v-model="sortByMenu" @change="handleMenuSortChange">
              <span>By Menu</span>
            </label>
            <label class="sort-toggle">
              <input type="checkbox" v-model="sortByStore" @change="handleStoreSortChange">
              <span>By Store</span>
            </label>
          </div>
          <button @click="loadWeeklyIngredients" class="action-btn secondary-btn" :disabled="isLoadingIngredients">
            {{ isLoadingIngredients ? 'Loading...' : 'Refresh Ingredients' }}
          </button>
        </div>
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
          <p><strong>Total Ingredients:</strong> {{ ingredientCount }}</p>
          <p><strong>Total Cost:</strong> {{ formatCost(totalCost) }}</p>
        </div>
        
        <div class="ingredients-grid">
          <div v-for="ingredient in sortedIngredients" :key="`${ingredient.name}-${ingredient.units}-${ingredient.store || ''}-${ingredient.isMenuHeader || ingredient.isStoreHeader ? 'header' : ''}`" 
               :class="['ingredient-item', { 'menu-header': ingredient.isMenuHeader, 'store-header': ingredient.isStoreHeader }]">
            <div class="ingredient-info">
              <h4 v-if="!ingredient.isMenuHeader && !ingredient.isStoreHeader">
                {{ ingredient.name }} <span class="ingredient-cost">{{ formatCost(ingredient.totalCost) }}</span>
              </h4>
              <h4 v-else-if="ingredient.isStoreHeader">{{ ingredient.name }}</h4>
              <div v-else-if="ingredient.isMenuHeader" class="menu-header-content">
                <div class="menu-header-left">
                  <span class="menu-header-day-date">{{ ingredient.dayName }} - {{ ingredient.date }}</span>
                </div>
                <div class="menu-header-center">
                  <span class="menu-header-name-owner">{{ ingredient.menuName }} - {{ ingredient.ownerName }}</span>
                </div>
                <div class="menu-header-right">
                  <span class="menu-header-cost">{{ ingredient.cost }}</span>
                </div>
              </div>
            </div>
            <div v-if="!ingredient.isMenuHeader && !ingredient.isStoreHeader && ingredient.sources && ingredient.sources.length > 0" class="ingredient-sources">
              <div v-for="(source, index) in ingredient.sources" :key="`${source.menuId}-${source.date}-${index}`" class="source-item">
                <span class="source-menu">{{ source.menuName }}</span>
                <span class="source-date">{{ source.date }}</span>
                <span class="source-quantity">{{ formatQuantity(source.quantity) }} {{ source.units || ingredient.units }}</span>
                <span class="source-store">{{ source.store || 'Unknown Store' }}</span>
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
          <p>This will create a new menu for {{ formatDate(selectedDate) }}. The menu will be automatically added to the weekly cart for this week. If no cart exists for this week, one will be created automatically.</p>
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
import { weeklyCartStore, weeklyCartState } from '../stores/weeklyCartStore.js'
import { purchaseSystemService } from '../services/purchaseSystemService.js'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { cookBookService } from '../services/cookBookService.js'
import { authState } from '../stores/authStore.js'
import { authService } from '../services/authService.js'
import { fetchCartCost, fetchMenuCost, formatCost } from '../utils/costUtils.js'
import { storeCatalogService } from '../services/storeCatalogService.js'

export default {
  name: 'WeeklyCartPage',
  setup(props, { emit }) {
    // Local UI state
    const currentWeekStart = ref(weeklyCartService.getWeekStart(new Date()))
    const weekMenus = ref({})
    const weeklyIngredients = ref([])
    const isLoadingIngredients = ref(false)
    const sortedIngredients = ref([])
    const isAddingMenu = ref(false)
    
    // Use store state for cart data
    const isLoading = computed(() => {
      const weekStart = weeklyCartService.formatDate(currentWeekStart.value)
      return weeklyCartState.loading[weekStart] || false
    })
    
    const error = computed(() => {
      const weekStart = weeklyCartService.formatDate(currentWeekStart.value)
      return weeklyCartState.errors[weekStart] || null
    })
    
    const currentCart = computed(() => {
      const weekStart = weeklyCartService.formatDate(currentWeekStart.value)
      const cart = weeklyCartState.carts[weekStart]
      return cart ? { id: cart.cartId } : null
    })
    
    // Cost state
    const cartCost = ref(null)
    const cartCostLoading = ref(false)
    const cartCostError = ref(null)
    
    // Sorting state (default to combined list)
    const sortByMenu = ref(false)
    const sortByStore = ref(false)

    const UNIT_CONVERSIONS = {
      g: { base: 'g', factor: 1 },
      kg: { base: 'g', factor: 1000 },
      mg: { base: 'g', factor: 0.001 },
      ml: { base: 'ml', factor: 1 },
      l: { base: 'ml', factor: 1000 },
      tsp: { base: 'ml', factor: 4.92892 },
      tbsp: { base: 'ml', factor: 14.7868 },
      cup: { base: 'ml', factor: 240 },
      oz: { base: 'g', factor: 28.3495 },
      lb: { base: 'g', factor: 453.592 },
      pound: { base: 'g', factor: 453.592 }
    }

    const normalizeToBase = (quantity, units) => {
      if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
        return {
          quantityInBase: 0,
          baseUnit: units || '',
          originalQuantity: quantity || 0,
          originalUnits: units || ''
        }
      }

      if (!units) {
        return {
          quantityInBase: quantity,
          baseUnit: '',
          originalQuantity: quantity,
          originalUnits: ''
        }
      }

      const unitKey = units.toLowerCase()
      const conversion = UNIT_CONVERSIONS[unitKey]

      if (!conversion) {
        return {
          quantityInBase: quantity,
          baseUnit: units,
          originalQuantity: quantity,
          originalUnits: units
        }
      }

      return {
        quantityInBase: quantity * conversion.factor,
        baseUnit: conversion.base,
        originalQuantity: quantity,
        originalUnits: units
      }
    }

    const formatQuantityFromBase = (quantityInBase, baseUnit) => {
      const rounded = (value) => {
        const fixed = Number(value.toFixed(2))
        return Number.isInteger(fixed) ? Math.trunc(fixed) : fixed
      }

      if (!baseUnit) {
        return { quantity: rounded(quantityInBase), units: '' }
      }

      if (baseUnit === 'g') {
        if (quantityInBase >= 1000) {
          return { quantity: rounded(quantityInBase / 1000), units: 'kg' }
        }
        if (quantityInBase < 1) {
          return { quantity: rounded(quantityInBase * 1000), units: 'mg' }
        }
        return { quantity: rounded(quantityInBase), units: 'g' }
      }

      if (baseUnit === 'ml') {
        if (quantityInBase >= 1000) {
          return { quantity: rounded(quantityInBase / 1000), units: 'l' }
        }
        return { quantity: rounded(quantityInBase), units: 'ml' }
      }

      return { quantity: rounded(quantityInBase), units: baseUnit }
    }
    
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

    const totalCost = computed(() => {
      return weeklyIngredients.value.reduce((total, ingredient) => {
        return total + (ingredient.totalCost || 0)
      }, 0)
    })

    const ingredientCount = computed(() => weeklyIngredients.value.length)

    // Methods
    const formatDate = (date) => {
      return weeklyCartService.formatDate(date)
    }

    const formatWeekRange = (weekStart) => {
      const weekEnd = weeklyCartService.getWeekEnd(new Date(weekStart))
      return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
    }

    const fetchMenuExtras = async (menuId, ownerId) => {
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

    const getMenuForDate = (date) => {
      const dateStr = formatDate(date)
      return weekMenus.value[dateStr] || null
    }


    const formatQuantity = (quantity) => {
      // Format quantity to show up to 2 decimal places, removing trailing zeros
      return parseFloat(quantity.toFixed(2))
    }

    /**
     * Build a mapping from atomicOrderId to purchaseOption ID by traversing using associateIDs
     * Returns: Map<atomicOrderId, { purchaseOptionId, itemId, quantity, units, price }>
     */
    const getAtomicOrderMapping = async (cartId) => {
      const mapping = new Map() // atomicOrderId -> { purchaseOptionId, itemId, quantity, units, price }
      const processedItems = new Set() // Track items we've already processed

      try {
        // Get all menus in the week
        const weekDatesArray = weeklyCartService.getWeekDates(currentWeekStart.value)
        
        // Collect all unique ingredient names from all menus
        const ingredientNames = new Set()
        
        for (const date of weekDatesArray) {
          const dateStr = formatDate(date)
          const menu = weekMenus.value[dateStr]
          
          if (menu) {
            try {
              // Get recipes in this menu
              const recipesResp = await menuCollectionService.getRecipesInMenu(menu.id)
              if (recipesResp && recipesResp.length > 0 && recipesResp[0].menuRecipes) {
                const recipeIds = Object.keys(recipesResp[0].menuRecipes)
                
                // Get ingredients from each recipe
                for (const recipeId of recipeIds) {
                  try {
                    const ingredientsResp = await cookBookService.getRecipeIngredients(recipeId)
                    if (ingredientsResp && ingredientsResp.length > 0 && ingredientsResp[0].ingredients) {
                      const ingredients = ingredientsResp[0].ingredients
                      
                      // Collect ingredient names
                      for (const ingredient of ingredients) {
                        if (ingredient.name) {
                          ingredientNames.add(ingredient.name)
                        }
                      }
                    }
                  } catch (err) {
                    console.error(`Error getting ingredients for recipe ${recipeId}:`, err)
                  }
                }
              }
            } catch (err) {
              console.error(`Error getting recipes for menu ${menu.id}:`, err)
            }
          }
        }

        console.log(`Found ${ingredientNames.size} unique ingredient names`)

        // For each ingredient name, get the item and its purchase options
        for (const ingredientName of ingredientNames) {
          try {
            // Get item by name (may throw if item doesn't exist)
            const itemResp = await storeCatalogService.getItemByName(ingredientName)
            if (!itemResp || itemResp.length === 0 || !itemResp[0].item) {
              // Item doesn't exist in StoreCatalog, skip it
              console.debug(`Item not found in StoreCatalog: ${ingredientName}`)
              continue
            }

            const itemId = itemResp[0].item
            
            // Skip if we've already processed this item
            if (processedItems.has(itemId)) {
              continue
            }
            processedItems.add(itemId)

            // Get all purchase options for this item
            try {
              const purchaseOptionsResp = await storeCatalogService.getItemPurchaseOptions(itemId)
              if (!purchaseOptionsResp || purchaseOptionsResp.length === 0 || !purchaseOptionsResp[0].purchaseOptions) {
                // No purchase options for this item, skip it
                console.debug(`No purchase options found for item ${itemId} (${ingredientName})`)
                continue
              }

              const purchaseOptionIds = purchaseOptionsResp[0].purchaseOptions

              // For each purchase option, get its AtomicOrder and map the _id
              for (const purchaseOptionId of purchaseOptionIds) {
                try {
                  const atomicOrderResp = await purchaseSystemService.getOrderByAssociateID(purchaseOptionId)
                  if (atomicOrderResp && atomicOrderResp.length > 0 && atomicOrderResp[0].order) {
                    const atomicOrder = atomicOrderResp[0].order
                    const atomicOrderId = atomicOrder._id
                    
                    // Map the AtomicOrder _id to its purchaseOption ID and item ID
                    mapping.set(atomicOrderId, {
                      purchaseOptionId,
                      itemId,
                      quantity: atomicOrder.quantity,
                      units: atomicOrder.units,
                      price: atomicOrder.price
                    })
                  }
                } catch (err) {
                  // Continue to next purchaseOption
                  console.debug(`Error getting atomic order for purchaseOption ${purchaseOptionId}:`, err)
                }
              }
            } catch (err) {
              // Error getting purchase options, skip this item
              console.debug(`Error getting purchase options for item ${itemId}:`, err)
              continue
            }
          } catch (err) {
            // Item doesn't exist or error getting item, skip it
            console.debug(`Item not found or error getting item for ingredient ${ingredientName}:`, err.message || err)
            continue
          }
        }

        console.log(`Built mapping for ${mapping.size} atomicOrders`)
        return mapping
      } catch (err) {
        console.error('Error building atomic order mapping:', err)
        return mapping
      }
    }

    const loadWeeklyIngredients = async () => {
      isLoadingIngredients.value = true
      weeklyIngredients.value = []

      try {
        const currentUser = authState.user
        if (!currentUser) {
          throw new Error('No user logged in')
        }

        // Get cart ID
        const cart = currentCart.value
        if (!cart || !cart.id) {
          console.log('No cart available for this week')
          weeklyIngredients.value = []
          applySorting()
          return
        }

        // Get the cart's CompositeOrder
        const cartOrderResponse = await purchaseSystemService.getOrderByAssociateID(cart.id)
        if (!cartOrderResponse || cartOrderResponse.length === 0 || !cartOrderResponse[0].order) {
          console.log('No order found for cart:', cart.id)
          weeklyIngredients.value = []
          applySorting()
          return
        }

        const cartCompositeOrderId = cartOrderResponse[0].order._id
        console.log('Cart CompositeOrder ID:', cartCompositeOrderId)

        // Get optimal purchase
        const optimalPurchaseResponse = await purchaseSystemService.getOptimalPurchase(cartCompositeOrderId)
        if (!optimalPurchaseResponse || optimalPurchaseResponse.length === 0 || !optimalPurchaseResponse[0].optimalPurchase) {
          console.log('No optimal purchase found for cart')
          weeklyIngredients.value = []
          applySorting()
          return
        }

        const optimalPurchase = optimalPurchaseResponse[0].optimalPurchase
        console.log('Cart optimal purchase:', optimalPurchase)

        // Build mapping from atomicOrderId to purchaseOption ID using associateIDs
        console.log('Building atomic order mapping...')
        const atomicOrderToPurchaseOptionMap = await getAtomicOrderMapping(cart.id)
        console.log('Atomic order mapping built:', atomicOrderToPurchaseOptionMap.size, 'entries')

        // Build mapping from atomicOrderId to menu sources
        // For each menu, get its optimal purchase and map atomicOrderIds to menu info
        const atomicOrderToMenuMap = new Map() // atomicOrderId -> Array of { menuId, menuName, date, ownerName, quantity, units, quantityInBase, baseUnit }
        
        const weekDatesArray = weeklyCartService.getWeekDates(currentWeekStart.value)
        for (const date of weekDatesArray) {
          const dateStr = formatDate(date)
          const menu = weekMenus.value[dateStr]
          
          if (menu) {
            try {
              // Get menu's CompositeOrder
              const menuOrderResponse = await purchaseSystemService.getOrderByAssociateID(menu.id)
              if (!menuOrderResponse || menuOrderResponse.length === 0 || !menuOrderResponse[0].order) {
                console.log(`No order found for menu ${menu.id}`)
                continue
              }

              const menuCompositeOrderId = menuOrderResponse[0].order._id
              
              // Get optimal purchase for this menu
              const menuOptimalPurchaseResponse = await purchaseSystemService.getOptimalPurchase(menuCompositeOrderId)
              if (!menuOptimalPurchaseResponse || menuOptimalPurchaseResponse.length === 0 || !menuOptimalPurchaseResponse[0].optimalPurchase) {
                console.log(`No optimal purchase found for menu ${menu.id}`)
                continue
              }

              const menuOptimalPurchase = menuOptimalPurchaseResponse[0].optimalPurchase
              const ownerDisplayName = menu.ownerName || (menu.owner === authState.user?.id ? (authState.user?.username || 'You') : 'Other User')

              // Map each atomicOrderId in this menu's optimal purchase to menu info
              for (const [atomicOrderId, quantity] of Object.entries(menuOptimalPurchase)) {
                if (!atomicOrderToMenuMap.has(atomicOrderId)) {
                  atomicOrderToMenuMap.set(atomicOrderId, [])
                }
                
                const atomicOrderData = atomicOrderToPurchaseOptionMap.get(atomicOrderId)
                if (atomicOrderData) {
                  const quantityToBuy = Number(quantity) || 0
                  const atomicOrderQuantity = atomicOrderData.quantity || 1
                  const atomicOrderUnits = atomicOrderData.units || ''
                  const totalQuantity = quantityToBuy * atomicOrderQuantity
                  
                  const normalized = normalizeToBase(totalQuantity, atomicOrderUnits)
                  
                  atomicOrderToMenuMap.get(atomicOrderId).push({
                    menuId: menu.id,
                    menuName: menu.name,
                    ownerName: ownerDisplayName,
                    date: dateStr,
                    quantity: normalized.originalQuantity,
                    units: normalized.originalUnits,
                    quantityInBase: normalized.quantityInBase,
                    baseUnit: normalized.baseUnit
                  })
                }
              }
            } catch (err) {
              console.error(`Error getting optimal purchase for menu ${menu.id}:`, err)
            }
          }
        }

        console.log('Menu mapping built:', atomicOrderToMenuMap.size, 'atomicOrders mapped to menus')

        const ingredientsMap = new Map() // key: item name + baseUnit + store, value: ingredient data

        // For each atomicOrderId in optimalPurchase
        for (const [atomicOrderId, quantity] of Object.entries(optimalPurchase)) {
          try {

            // Get the purchaseOption data for this atomicOrderId
            const atomicOrderData = atomicOrderToPurchaseOptionMap.get(atomicOrderId)
            if (!atomicOrderData) {
              console.warn(`Could not find purchaseOption for atomicOrderId ${atomicOrderId}`)
              continue
            }

            // Get purchase option details to get store
            const purchaseOptionDetailsResp = await storeCatalogService.getPurchaseOptionDetails(atomicOrderData.purchaseOptionId)
            if (!purchaseOptionDetailsResp || purchaseOptionDetailsResp.length === 0) {
              console.warn(`Could not get purchase option details for ${atomicOrderData.purchaseOptionId}`)
              continue
            }

            const purchaseOptionDetails = purchaseOptionDetailsResp[0]
            const store = purchaseOptionDetails.store || 'Unknown Store'

            // Get item name
            const itemNameResp = await storeCatalogService.getItemName(atomicOrderData.itemId)
            const itemName = itemNameResp && itemNameResp.length > 0 ? itemNameResp[0].name : 'Unknown Item'

            // Get quantity from optimal purchase (this is the number of units to buy)
            const quantityToBuy = Number(quantity) || 0
            const atomicOrderQuantity = atomicOrderData.quantity || 1
            const atomicOrderUnits = atomicOrderData.units || purchaseOptionDetails.units || ''

            // Calculate total quantity needed
            const totalQuantity = quantityToBuy * atomicOrderQuantity

            // Normalize quantity
            const normalized = normalizeToBase(totalQuantity, atomicOrderUnits)
            const key = `${itemName}-${normalized.baseUnit}-${store}`

            // Get menu sources for this atomicOrderId and add store information to each source
            const menuSources = atomicOrderToMenuMap.get(atomicOrderId) || []
            // Add store to each source since we now have it
            const menuSourcesWithStore = menuSources.map(source => ({
              ...source,
              store: store
            }))

            // Calculate cost: quantityToBuy * price per unit
            const price = atomicOrderData.price || 0
            const cost = quantityToBuy * price

            if (ingredientsMap.has(key)) {
              const existing = ingredientsMap.get(key)
              existing.totalBaseQuantity += normalized.quantityInBase
              existing.totalCost = (existing.totalCost || 0) + cost
              // Merge menu sources with store information
              existing.sources.push(...menuSourcesWithStore)
            } else {
              ingredientsMap.set(key, {
                name: itemName,
                baseUnit: normalized.baseUnit,
                totalBaseQuantity: normalized.quantityInBase,
                totalCost: cost,
                store: store,
                purchaseOptionId: atomicOrderData.purchaseOptionId,
                itemId: atomicOrderData.itemId,
                sources: [...menuSourcesWithStore] // Store menu sources with store information
              })
            }
          } catch (err) {
            console.error(`Error processing atomicOrderId ${atomicOrderId}:`, err)
          }
        }

        // Convert map to array and format
        weeklyIngredients.value = Array.from(ingredientsMap.values())
          .map((entry) => {
            const { quantity: displayQuantity, units: displayUnits } = formatQuantityFromBase(entry.totalBaseQuantity, entry.baseUnit)
            return {
              name: entry.name,
              units: displayUnits,
              totalQuantity: displayQuantity,
              baseUnit: entry.baseUnit,
              totalBaseQuantity: entry.totalBaseQuantity,
              totalCost: entry.totalCost || 0,
              store: entry.store,
              purchaseOptionId: entry.purchaseOptionId,
              itemId: entry.itemId,
              sources: entry.sources // Populated with menu information from optimal purchase, including store
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name))

        console.log('Weekly ingredients loaded from optimal purchase:', weeklyIngredients.value)
        
        // Apply initial sorting
        applySorting()

      } catch (err) {
        // Error loading ingredients - this is separate from cart errors
        console.error('Error loading weekly ingredients:', err)
      } finally {
        isLoadingIngredients.value = false
      }
    }
    
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    const getFullDayName = (dateStr) => {
      if (!dateStr) return 'Unknown Day'
      const date = new Date(`${dateStr}T00:00:00Z`)
      if (Number.isNaN(date.getTime())) {
        return 'Unknown Day'
      }
      const idx = date.getUTCDay()
      return fullDayNames[idx] || 'Unknown Day'
    }

    const handleMenuSortChange = () => {
      if (sortByMenu.value && sortByStore.value) {
        // If menu is checked and store was also checked, uncheck store
        sortByStore.value = false
      }
      applySorting()
    }

    const handleStoreSortChange = () => {
      if (sortByStore.value && sortByMenu.value) {
        // If store is checked and menu was also checked, uncheck menu
        sortByMenu.value = false
      }
      applySorting()
    }

    const applySorting = () => {
      if (weeklyIngredients.value.length === 0) {
        sortedIngredients.value = []
        return
      }
      
      // Neither enabled: Show default aggregated view
      if (!sortByStore.value && !sortByMenu.value) {
        sortedIngredients.value = weeklyIngredients.value
        return
      }
      
      // Note: Both cannot be enabled at the same time due to mutual exclusivity
      // If both are somehow enabled, prioritize menu sorting
      if (sortByStore.value && sortByMenu.value) {
        sortByStore.value = false
      }
      
      if (sortByStore.value) {
        // Only store sorting: group ingredients by store
        const storeSections = new Map()

        for (const ingredient of weeklyIngredients.value) {
          const store = ingredient.store || 'Unknown Store'

          if (!storeSections.has(store)) {
            storeSections.set(store, {
              storeName: store,
              ingredients: []
            })
          }

          const section = storeSections.get(store)
          section.ingredients.push(ingredient)
        }

        // Flatten into sorted array by store name, then by ingredient name
        sortedIngredients.value = []
        Array.from(storeSections.values())
          .sort((a, b) => a.storeName.localeCompare(b.storeName))
          .forEach((section) => {
            // Add store header
            sortedIngredients.value.push({
              name: section.storeName,
              units: '',
              totalQuantity: 0,
              totalCost: 0,
              sources: [],
              isStoreHeader: true
            })

            // Add ingredients for this store, sorted by name
            section.ingredients
              .sort((a, b) => a.name.localeCompare(b.name))
              .forEach((ing) => sortedIngredients.value.push(ing))
          })
      } else if (sortByMenu.value) {
        // Only menu sorting: group ingredients by which menu they come from
        const menuSections = new Map()

        for (const ingredient of weeklyIngredients.value) {
          if (!ingredient.sources || ingredient.sources.length === 0) continue

          for (const source of ingredient.sources) {
            const sectionKey = source.menuId || `${source.menuName}-${source.date}`

            if (!menuSections.has(sectionKey)) {
              const menuMeta = weekMenus.value[source.date]
              const ownerName = source.ownerName || menuMeta?.ownerName || (menuMeta?.owner === authState.user?.id ? (authState.user?.username || 'You') : 'Other User')
              const menuCost = menuMeta?.cost ?? null

              menuSections.set(sectionKey, {
                menuId: source.menuId,
                date: source.date,
                menuName: source.menuName,
                ownerName,
                menuCost,
                ingredients: []
              })
            }

            const section = menuSections.get(sectionKey)
            section.ingredients.push({
              name: ingredient.name,
              units: source.units || ingredient.units,
              totalQuantity: source.quantity,
              totalCost: ingredient.totalCost || 0,
              sources: [{
                menuId: section.menuId,
                menuName: section.menuName,
                ownerName: section.ownerName,
                date: section.date,
                quantity: source.quantity,
                units: source.units || ingredient.units,
                store: source.store || ingredient.store
              }]
            })
          }
        }

        // Flatten into sorted array by menu date
        sortedIngredients.value = []
        Array.from(menuSections.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .forEach((section) => {
            const dayName = getFullDayName(section.date)
            const dateStr = section.date
            const ownerLabel = section.ownerName || 'Unknown User'
            const costStr = section.menuCost !== null && section.menuCost !== undefined ? formatCost(section.menuCost) : 'N/A'
            sortedIngredients.value.push({
              name: `${dayName} - ${dateStr} - ${section.menuName} - ${ownerLabel} - ${costStr}`,
              dayName: dayName,
              date: dateStr,
              menuName: section.menuName,
              ownerName: ownerLabel,
              cost: costStr,
              units: '',
              totalQuantity: 0,
              totalCost: 0,
              sources: [],
              isMenuHeader: true
            })

            section.ingredients
              .sort((a, b) => a.name.localeCompare(b.name))
              .forEach((ing) => sortedIngredients.value.push(ing))
          })
      }
    }

    const loadCartCost = async () => {
      const cart = currentCart.value
      if (!cart || !cart.id) {
        cartCost.value = null
        return
      }
      
      cartCostLoading.value = true
      cartCostError.value = null
      
      try {
        const cost = await fetchCartCost(cart.id)
        cartCost.value = cost
      } catch (err) {
        console.error('Error loading cart cost:', err)
        cartCostError.value = err.message || 'Failed to load cart cost'
        cartCost.value = null
      } finally {
        cartCostLoading.value = false
      }
    }
    
    const loadWeekData = async () => {
      try {
        // Get current user
        const currentUser = authState.user
        if (!currentUser) {
          throw new Error('No user logged in')
        }

        // Use store to get week menu mapping (uses cache if available)
        const weekStartStr = formatDate(currentWeekStart.value)
        console.log('[WeeklyCartPage] Loading week data for week starting:', weekStartStr)
        
        // Get cached mapping or build it if needed
        const weekMenuMapping = await weeklyCartStore.getWeekMenuMapping(currentWeekStart.value)
        
        // Update local state with cached mapping
        weekMenus.value = { ...weekMenuMapping }
        console.log('[WeeklyCartPage] Week menus loaded from store:', weekMenus.value)

        // Fetch menu costs for each menu
        const weekDatesArray = weeklyCartService.getWeekDates(currentWeekStart.value)
        for (const date of weekDatesArray) {
          const dateStr = formatDate(date)
          const menu = weekMenus.value[dateStr]
          if (menu && menu.id) {
            try {
              const menuCost = await fetchMenuCost(menu.id)
              if (menuCost !== null) {
                weekMenus.value[dateStr] = { ...menu, cost: menuCost }
              }
            } catch (err) {
              console.error(`Error fetching cost for menu ${menu.id}:`, err)
            }
          }
        }

        // Load weekly ingredients after menus are loaded
        await loadWeeklyIngredients()
        
        // Load cart cost after cart is loaded
        await loadCartCost()
        
        console.log('[WeeklyCartPage] Final weekMenus:', weekMenus.value)

      } catch (err) {
        console.error('[WeeklyCartPage] Error loading week data:', err)
        // Error is handled by store
      }
    }

    const goToPreviousWeek = () => {
      const newWeekStart = new Date(currentWeekStart.value)
      newWeekStart.setUTCDate(newWeekStart.getUTCDate() - 7)
      currentWeekStart.value = newWeekStart
      // Watcher will handle loadWeekData()
    }

    const goToNextWeek = () => {
      const newWeekStart = new Date(currentWeekStart.value)
      newWeekStart.setUTCDate(newWeekStart.getUTCDate() + 7)
      currentWeekStart.value = newWeekStart
      // Watcher will handle loadWeekData()
    }

    const goToCurrentWeek = () => {
      currentWeekStart.value = weeklyCartService.getWeekStart(new Date())
      // Watcher will handle loadWeekData()
    }

    const goToSelectedDate = () => {
      if (!goToDateValue.value) return
      const selected = new Date(goToDateValue.value)
      currentWeekStart.value = weeklyCartService.getWeekStart(selected)
      // Watcher will handle loadWeekData()
    }


    const addMenuToDate = (date) => {
      selectedDate.value = date
      showAddMenuModal.value = true
    }

    const confirmAddMenu = async () => {
      if (!selectedDate.value) return

      isAddingMenu.value = true
      const weekStart = weeklyCartService.formatDate(currentWeekStart.value)
      weeklyCartStore.clearError(weekStart)
      
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
          
          // Menu is automatically added to weekly cart when created (backend synchronization)
          // Cart is automatically created if one doesn't exist for this week
          // Invalidate cache so UI reflects the new menu
          weeklyCartStore.clearWeekMenuMapping(dateStr)
          
          closeAddMenuModal()
          // Refresh data - store will rebuild mapping with new menu
          await loadWeekData()
          // Refresh cart cost after adding menu
          await loadCartCost()
        } else {
          throw new Error('Failed to create menu')
        }
      } catch (err) {
        console.error('Error adding menu:', err)
        weeklyCartStore.setError(weekStart, err.message || 'Failed to add menu')
      } finally {
        isAddingMenu.value = false
      }
    }

    const removeMenuFromCart = (menu) => {
      // Check if the current user owns this menu
      if (menu.owner !== authState.user?.id) {
        // Use store's error handling
        const weekStart = weeklyCartService.formatDate(currentWeekStart.value)
        weeklyCartStore.setError(weekStart, 'You can only remove menus that you created')
        return
      }

      confirmModal.value = {
        title: 'Remove Menu',
        message: `Are you sure you want to remove "${menu.name}" from the cart?`,
        confirmText: 'Remove',
        action: async () => {
          try {
            await weeklyCartStore.removeMenuFromCart(menu.id)
            // Refresh data - store will rebuild mapping without this menu
            await loadWeekData()
            // Refresh cart cost after removing menu
            await loadCartCost()
          } catch (err) {
            console.error('Error removing menu:', err)
            // Error is handled by store
          }
        }
      }
      showConfirmModal.value = true
    }




    const viewMenu = (menu) => {
      // Emit event to navigate to MenuPage with menu ID
      console.log('viewMenu called with:', menu)
      console.log('Menu ID:', menu?.id)
      if (menu?.id) {
        emit('view-menu', menu.id)
      } else {
        console.error('Cannot view menu - invalid menu data:', menu)
      }
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
      weeklyIngredients,
      sortedIngredients,
      isLoadingIngredients,
      isAddingMenu,
      cartCost,
      cartCostLoading,
      cartCostError,
      showAddMenuModal,
      showConfirmModal,
      selectedDate,
      confirmModal,
      sortByMenu,
      sortByStore,
      
      // Computed
      dayNames,
      weekDates,
      totalQuantity,
      totalCost,
      ingredientCount,
      
      // Methods
      formatDate,
      formatWeekRange,
      getMenuForDate,
      formatQuantity,
      formatCost,
      loadWeeklyIngredients,
      applySorting,
      handleMenuSortChange,
      handleStoreSortChange,
      loadWeekData,
      goToPreviousWeek,
      goToNextWeek,
      goToCurrentWeek,
      goToSelectedDate,
      goToDateValue,
      addMenuToDate,
      confirmAddMenu,
      removeMenuFromCart,
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

.recipe-list {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0 0 0;
  color: var(--primary-color);
  font-size: 0.9rem;
}

.recipe-list li {
  margin: 0.1rem 0;
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
  font-size: 1.1rem;
}

.header-title,
.header-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.header-controls {
  align-items: flex-end;
}

.sorting-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.sort-label {
  font-weight: 600;
}

.sort-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.sort-toggle input[type="checkbox"] {
  cursor: pointer;
  width: 1.2rem;
  height: 1.2rem;
}

.sort-btn {
  padding: 0.5rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sort-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.sort-btn.active {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.sort-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  text-decoration: line-through;
}

.ingredient-item.menu-header, .ingredient-item.store-header {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  border-bottom: 3px solid var(--primary-color) !important;
  grid-column: 1 / -1;
  margin-top: 2rem;
  margin-bottom: 1rem;
  padding: 1rem 0 0.75rem 0 !important;
  transition: none !important;
  box-shadow: none !important;
}

.ingredient-item.menu-header:first-child, .ingredient-item.store-header:first-child {
  margin-top: 0;
}

.ingredient-item.menu-header h4, .ingredient-item.store-header h4 {
  color: var(--primary-color);
  font-weight: 700;
  font-size: 1.4rem;
  margin: 0;
  letter-spacing: 0.5px;
}

.ingredient-item.store-header {
  border-bottom-color: var(--secondary-color) !important;
}

.ingredient-item.store-header h4 {
  color: var(--secondary-color);
}

.menu-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 2rem;
  padding: 0.25rem 0;
  white-space: nowrap;
}

.menu-header-left {
  flex-shrink: 0;
}

.menu-header-day-date {
  color: #0072BB;
  font-weight: 600;
  font-size: 1.1rem;
  white-space: nowrap;
}

.menu-header-center {
  flex: 1;
  text-align: center;
  white-space: nowrap;
}

.menu-header-name-owner {
  color: #424242;
  font-weight: 600;
  font-size: 1.1rem;
  white-space: nowrap;
}

.menu-header-right {
  flex-shrink: 0;
}

.menu-header-cost {
  color: #ED2939;
  font-weight: 700;
  font-size: 1.1rem;
  white-space: nowrap;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.ingredient-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.ingredient-item:hover:not(.menu-header):not(.store-header) {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ingredient-info {
  margin-bottom: 0.75rem;
}

.ingredient-item.menu-header .ingredient-info {
  margin-bottom: 0;
  width: 100%;
}

.ingredient-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--primary-color);
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ingredient-cost {
  color: var(--secondary-color);
  font-weight: 700;
  font-size: 0.9rem;
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

.store-info {
  color: var(--primary-color);
  font-size: 0.9rem;
  font-weight: 500;
  margin-left: 0.5rem;
}

.ingredient-sources {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.source-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  align-items: center;
  background: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  font-size: 0.9rem;
  gap: 0.75rem;
  margin-left: 0.5rem;
  transition: background-color 0.2s ease;
}

.source-item:hover {
  background-color: #f8f9fa;
}

.source-menu {
  color: var(--primary-color);
  font-weight: 500;
  font-size: 0.75rem;
}

.source-date {
  color: var(--secondary-color);
  font-size: 0.75rem;
}

.source-quantity {
  color: #6c757d;
  font-size: 0.75rem;
  font-weight: 500;
}

.source-store {
  color: var(--primary-color);
  font-size: 0.75rem;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .ingredients-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .ingredients-grid {
    grid-template-columns: 1fr;
  }
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
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .source-menu,
  .source-date,
  .source-quantity,
  .source-store {
    width: 100%;
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

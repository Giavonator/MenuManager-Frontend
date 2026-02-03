<template>
  <div
    :class="[
      'weekly-cart-page',
      showPageHeaders ? 'page-container-with-header' : 'page-container-no-header'
    ]"
  >
    <!-- Header Section -->
    <div v-if="showPageHeaders" class="page-header-block">
      <div class="page-header-text">
        <h1 class="page-header-title">Weekly Cart</h1>
        <p class="page-header-description">
          View and manage your weekly menus. Each week has its own cart that's created automatically.
        </p>
      </div>
    </div>

    <!-- Week Navigation -->
    <div class="week-navigation">
      <button @click="goToPreviousWeek" class="nav-btn" :disabled="isLoading">
        <i class="arrow">←</i> Back
      </button>
      <span class="nav-edge-spacer" aria-hidden="true"></span>
      <h2 class="week-range">{{ formatWeekRange(currentWeekStart) }}</h2>
      <span class="nav-spacer" aria-hidden="true"></span>
      <button @click="goToCurrentWeek" class="current-week-btn today-btn" :disabled="isLoading">
        <svg class="today-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v13A2.5 2.5 0 0 1 19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12.5 8h-15v9.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V10Zm0-2V6.5a.5.5 0 0 0-.5-.5H18v1a1 1 0 1 1-2 0V6H8v1a1 1 0 1 1-2 0V6H4.5a.5.5 0 0 0-.5.5V8h15.5Z"/>
          <path d="M8 13.25a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Z"/>
        </svg>
        <span class="today-label">Today</span>
      </button>
      <div class="goto-date joined-control">
        <input
          type="date"
          v-model="goToDateValue"
          :disabled="isLoading"
          @change="goToSelectedDate"
          class="date-input joined-input"
        />
      </div>
      <span class="nav-edge-spacer" aria-hidden="true"></span>
      <button @click="goToNextWeek" class="nav-btn" :disabled="isLoading">
        Next <i class="arrow">→</i>
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
        </div>
      </div>
      
      <div v-if="instacartError" class="instacart-error">
        <p>{{ instacartError }}</p>
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
        <div v-if="!sortByMenu && !sortByStore" class="ingredients-summary">
          <div class="summary-text">
            <p><strong>Total Ingredients:</strong> {{ ingredientCount }}</p>
            <p><strong>Total Cost:</strong> {{ formatCost(totalCost) }}</p>
          </div>
          <button 
            @click="exportAllIngredientsToInstacart" 
            class="instacart-btn instacart-btn-all"
            :disabled="isExportingToInstacart || weeklyIngredients.length === 0"
          >
            <img src="/Instacart_brand_logo.png" alt="Instacart" class="instacart-logo" />
            {{ INSTACART_BUTTON_TEXT }}
          </button>
        </div>
        
        <div class="ingredients-grid">
          <div
            v-for="(ingredient, index) in sortedIngredients"
            :key="`${ingredient.name}-${ingredient.units}-${ingredient.store || ''}-${ingredient.menuId || ''}-${ingredient.date || ''}-${ingredient.isMenuHeader || ingredient.isStoreHeader ? 'header' : 'item'}-${index}`" 
               :class="['ingredient-item', { 'menu-header': ingredient.isMenuHeader, 'store-header': ingredient.isStoreHeader, 'unconfirmed-ingredient': !ingredient.isMenuHeader && !ingredient.isStoreHeader && ingredient.isConfirmed === false }]">
            <div class="ingredient-info">
              <h4 v-if="!ingredient.isMenuHeader && !ingredient.isStoreHeader">
                {{ ingredient.name }} <span class="ingredient-cost">{{ formatCost(ingredient.totalCost) }}</span>
              </h4>
              <h4 v-else-if="ingredient.isStoreHeader" class="store-header-title">
                {{ ingredient.name }}
                <button 
                  @click="exportStoreIngredientsToInstacart(ingredient.name)" 
                  class="instacart-btn instacart-btn-store"
                  :disabled="isExportingToInstacart"
                  :title="`Add ${ingredient.name} ingredients to Instacart`"
                >
                  <img src="/Instacart_brand_logo.png" alt="Instacart" class="instacart-logo" />
                  {{ INSTACART_BUTTON_TEXT }}
                </button>
              </h4>
              <div v-else-if="ingredient.isMenuHeader" class="menu-header-content">
                <div class="menu-header-left">
                  <span class="menu-header-day-date">{{ ingredient.dayName }} - {{ ingredient.date }}</span>
                </div>
                <div class="menu-header-center">
                  <span class="menu-header-name-owner">{{ ingredient.menuName }} - {{ ingredient.ownerName }}</span>
                  <button 
                    @click="exportMenuIngredientsToInstacart(ingredient)" 
                    class="instacart-btn instacart-btn-menu"
                    :disabled="isExportingToInstacart"
                    :title="`Add ${ingredient.menuName} ingredients to Instacart`"
                  >
                    <img src="/Instacart_brand_logo.png" alt="Instacart" class="instacart-logo" />
                    {{ INSTACART_BUTTON_TEXT }}
                  </button>
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
import { menuCollectionService } from '../services/menuCollectionService.js'
import { authState } from '../stores/authStore.js'
import { fetchCartCost, fetchMenuCost, formatCost } from '../utils/costUtils.js'
import { SHOW_PAGE_HEADERS } from '../constants/uiConfig.js'
import { createShoppingList } from '../services/instacartService.js'

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
    const showPageHeaders = SHOW_PAGE_HEADERS
    
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
    
    // Instacart button text constant
    const INSTACART_BUTTON_TEXT = 'Get Ingredients'
    
    // Instacart export state
    const isExportingToInstacart = ref(false)
    const instacartError = ref(null)

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
      // Prefer backend cartCost as authoritative source
      if (cartCost.value !== null && cartCost.value !== undefined) {
        return cartCost.value
      }
      // Fallback to frontend calculation
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

    const getMenuForDate = (date) => {
      const dateStr = formatDate(date)
      return weekMenus.value[dateStr] || null
    }


    const formatQuantity = (quantity) => {
      // Format quantity to show up to 2 decimal places, removing trailing zeros
      return parseFloat(quantity.toFixed(2))
    }

    const getBundleRoot = (response) => {
      const root = Array.isArray(response) ? response[0] : response
      if (!root || typeof root !== 'object') {
        return {}
      }
      return root
    }

    const buildSourcesByName = (menus) => {
      // Build a map of ingredient names to their source quantities from menus
      // Applies recipe scaling factors: ingredient quantity × recipe scalingFactor
      // Sums quantities across all recipes and menus
      const sources = new Map()

      if (!Array.isArray(menus)) return sources

      menus.forEach((menu) => {
        const menuId = menu?.menuId || menu?.id
        const menuName = menu?.name || menu?.menuName || (menuId ? `Menu ${menuId}` : 'Menu')
        const ownerName = menu?.ownerName || menu?.owner || menu?.ownerId || 'Unknown User'
        const date = menu?.date

        // Aggregate ingredients by name within this menu
        const menuIngredientsMap = new Map() // key: ingredient name, value: aggregated ingredient data

        const recipes = Array.isArray(menu?.recipes) ? menu.recipes : []
        recipes.forEach((recipe) => {
          // Get scaling factor from recipe, default to 1 if not present
          const scalingFactor = Number(recipe?.scalingFactor ?? 1)
          const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
          ingredients.forEach((ingredient) => {
            if (!ingredient?.name) return
            
            const ingredientName = ingredient.name
            const ingredientKey = `${ingredientName}::${ingredient.units || ''}`
            
            if (!menuIngredientsMap.has(ingredientKey)) {
              menuIngredientsMap.set(ingredientKey, {
                name: ingredientName,
                units: ingredient.units || '',
                quantity: 0
              })
            }
            
            const aggregated = menuIngredientsMap.get(ingredientKey)
            // Apply scaling factor: multiply ingredient quantity by recipe scaling factor
            aggregated.quantity += Number(ingredient.quantity ?? 0) * scalingFactor
          })
        })

        // Now add aggregated ingredients to sources map
        menuIngredientsMap.forEach((aggregatedIngredient) => {
          const ingredientName = aggregatedIngredient.name
          if (!sources.has(ingredientName)) {
            sources.set(ingredientName, [])
          }
          sources.get(ingredientName).push({
            menuId,
            menuName,
            ownerName,
            date,
            quantity: aggregatedIngredient.quantity,
            units: aggregatedIngredient.units
          })
        })
      })

      return sources
    }

    const buildWeeklyIngredientsFromBundle = (bundle) => {
      const aggregatedIngredients = Array.isArray(bundle?.aggregatedIngredients)
        ? bundle.aggregatedIngredients
        : []
      const optimalOrders = Array.isArray(bundle?.optimalPurchase?.atomicOrders)
        ? bundle.optimalPurchase.atomicOrders
        : []
      const menus = Array.isArray(bundle?.menus) ? bundle.menus : []

      const itemById = new Map()
      const purchaseOptionById = new Map()

      aggregatedIngredients.forEach((ingredient) => {
        const name = ingredient?.name || 'Unknown Item'
        const catalogItem = ingredient?.catalogItem || {}
        const itemId = catalogItem?.itemId || catalogItem?.id
        if (itemId) {
          itemById.set(itemId, { name })
        }
        const purchaseOptions = Array.isArray(catalogItem?.purchaseOptions) ? catalogItem.purchaseOptions : []
        purchaseOptions.forEach((option) => {
          const purchaseOptionId = option?.purchaseOptionId || option?.id
          if (!purchaseOptionId) return
          purchaseOptionById.set(purchaseOptionId, {
            ...option,
            itemId,
            name
          })
        })
      })

      const sourcesByName = buildSourcesByName(menus)
      const ingredientsMap = new Map()

      if (optimalOrders.length > 0) {
        // Process optimal orders and calculate costs correctly from the start
        // Uses scaled source quantities (from buildSourcesByName) and calculates:
        // packagesNeeded = Math.ceil(scaledQuantityNeeded / packageSize)
        // totalCost = packagesNeeded × packagePrice
        optimalOrders.forEach((order) => {
          const purchaseOptionId = order?.purchaseOptionId || order?.purchaseOption?.id
          const purchaseOption = purchaseOptionId ? purchaseOptionById.get(purchaseOptionId) : null
          const itemId = order?.itemId || purchaseOption?.itemId
          const itemName = itemById.get(itemId)?.name || purchaseOption?.name || 'Unknown Item'
          const store = purchaseOption?.store || order?.store || 'Unknown Store'
          const units = order?.units || purchaseOption?.units || ''

          // Get scaled source quantities (already includes scaling factors from buildSourcesByName)
          const sources = sourcesByName.get(itemName) || []
          const sourceTotalQuantity = sources.reduce((sum, source) => sum + (Number(source.quantity) || 0), 0)
          
          // Get package size and price from optimalOrder
          const packageSize = Number(order?.quantity ?? 0) // Package size (e.g., 18 eggs, 8 oz)
          const packagePrice = Number(order?.price ?? purchaseOption?.price ?? 0) // Package price
          
          // Calculate packages needed: ceil(scaled quantity needed / package size)
          // If no sources found, fallback to 1 package
          const packagesNeeded = sourceTotalQuantity > 0 && packageSize > 0
            ? Math.ceil(sourceTotalQuantity / packageSize)
            : (packageSize > 0 ? 1 : 0)
          
          // Calculate cost: packages needed × package price
          const totalCost = packagesNeeded * packagePrice
          
          // Use scaled source quantity, or fallback to package size if no sources
          const totalQuantity = sourceTotalQuantity > 0 ? sourceTotalQuantity : packageSize

          // Check if purchase option is confirmed (default to false if purchase option not found)
          const isConfirmed = purchaseOption ? (purchaseOption.confirmed === true) : false

          const key = `${itemName}::${store}::${units}`
          const baseEntry = ingredientsMap.get(key) || {
            name: itemName,
            units,
            totalQuantity: 0,
            totalCost: 0,
            store,
            sources: [],
            isConfirmed: true, // Default to confirmed, will be set to false if any option is unconfirmed
            packageQuantity: 0, // Store package size (e.g., 5 lbs, 18 eggs)
            packagePrice: 0 // Store package price (e.g., $15, $5.59)
          }

          // Accumulate quantities and costs (handles multiple optimalOrders for same ingredient)
          baseEntry.totalQuantity += totalQuantity
          baseEntry.totalCost += totalCost
          
          // Store package info for reference
          if (packageSize > 0 && packagePrice > 0) {
            baseEntry.packageQuantity = packageSize
            baseEntry.packagePrice = packagePrice
          }
          
          // If this purchase option is unconfirmed, mark the ingredient as unconfirmed
          if (!isConfirmed) {
            baseEntry.isConfirmed = false
          }

          // Attach sources if not already attached
          if (!baseEntry.sources.length && sources.length > 0) {
            baseEntry.sources = sources.map((source) => ({
              ...source,
              store: source.store || store
            }))
          }

          ingredientsMap.set(key, baseEntry)
        })
      } else {
        aggregatedIngredients.forEach((ingredient) => {
          const name = ingredient?.name || 'Unknown Item'
          const units = ingredient?.units || ''
          const totalQuantity = Number(ingredient?.totalQuantity ?? 0)
          const purchaseOptions = Array.isArray(ingredient?.catalogItem?.purchaseOptions)
            ? ingredient.catalogItem.purchaseOptions
            : []
          const fallbackOption = purchaseOptions[0]
          const store = fallbackOption?.store || 'Unknown Store'
          const totalCost = Number.isFinite(totalQuantity) && fallbackOption?.price ? Number(fallbackOption.price) * totalQuantity : 0

          // Check if fallback purchase option is confirmed (default to false if no option)
          const isConfirmed = fallbackOption ? (fallbackOption.confirmed === true) : false

          const key = `${name}::${store}::${units}`
          const baseEntry = ingredientsMap.get(key) || {
            name,
            units,
            totalQuantity: 0,
            totalCost: 0,
            store,
            sources: [],
            isConfirmed: true // Default to confirmed, will be set to false if any option is unconfirmed
          }

          baseEntry.totalQuantity += totalQuantity
          baseEntry.totalCost += totalCost
          // If this purchase option is unconfirmed, mark the ingredient as unconfirmed
          if (!isConfirmed) {
            baseEntry.isConfirmed = false
          }

          if (!baseEntry.sources.length && sourcesByName.has(name)) {
            baseEntry.sources = sourcesByName.get(name).map((source) => ({
              ...source,
              store: source.store || store
            }))
          }

          ingredientsMap.set(key, baseEntry)
        })
      }

      return Array.from(ingredientsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    }

    const applyBundleData = (bundle) => {
      const menus = Array.isArray(bundle?.menus) ? bundle.menus : []
      const menuMapping = {}

      menus.forEach((menu) => {
        const menuId = menu?.menuId || menu?.id
        const menuName = menu?.name || menu?.menuName || (menuId ? `Menu ${menuId}` : 'Menu')
        const owner = menu?.owner || menu?.ownerId || null
        const ownerName = menu?.ownerName || null
        const date = menu?.date

        const recipeNames = Array.isArray(menu?.recipes)
          ? menu.recipes
              .map((recipe) => recipe?.name || (recipe?.recipeId ? `Recipe ${recipe.recipeId}` : null))
              .filter(Boolean)
          : []

        if (date) {
          menuMapping[date] = {
            id: menuId,
            name: menuName,
            owner,
            ownerName,
            date,
            recipeNames
          }
        }
      })

      weekMenus.value = { ...menuMapping }
      weeklyIngredients.value = buildWeeklyIngredientsFromBundle(bundle)
      applySorting()
    }

    const loadMenuCosts = async () => {
      const weekDatesArray = weeklyCartService.getWeekDates(currentWeekStart.value)
      await Promise.all(
        weekDatesArray.map(async (date) => {
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
        })
      )
    }

    const loadWeeklyCartBundle = async () => {
      isLoadingIngredients.value = true
      weeklyIngredients.value = []

      const weekStartStr = formatDate(currentWeekStart.value)
      weeklyCartStore.clearError(weekStartStr)

      try {
        await weeklyCartStore.ensureCartLoaded(currentWeekStart.value)

        const cart = currentCart.value
        if (!cart || !cart.id) {
          weekMenus.value = {}
          weeklyIngredients.value = []
          applySorting()
          return
        }

        const cachedBundle = weeklyCartStore.getBundle(weekStartStr, cart.id)
        if (cachedBundle) {
          applyBundleData(cachedBundle)
          await loadMenuCosts()
          return
        }

        const response = await weeklyCartService.getWeeklyCartPageBundle(cart.id, weekStartStr)
        const bundleRoot = getBundleRoot(response)
        if (bundleRoot?.error) {
          throw new Error(bundleRoot.error)
        }
        weeklyCartStore.setBundle(weekStartStr, cart.id, bundleRoot)
        applyBundleData(bundleRoot)
        await loadMenuCosts()
      } catch (err) {
        console.error('[WeeklyCartPage] Error loading weekly cart bundle:', err)
        weeklyCartStore.setError(weekStartStr, err.message || 'Failed to load weekly cart')
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
      
      // Helper function to sort ingredients: unconfirmed first, then alphabetical
      const sortIngredients = (a, b) => {
        // Headers should maintain their position
        if (a.isMenuHeader || a.isStoreHeader || b.isMenuHeader || b.isStoreHeader) {
          return 0
        }
        // Unconfirmed ingredients come first
        const aConfirmed = a.isConfirmed !== false // Default to true if not set
        const bConfirmed = b.isConfirmed !== false
        if (aConfirmed !== bConfirmed) {
          return aConfirmed ? 1 : -1 // Unconfirmed (false) comes first
        }
        // If both have same confirmation status, sort alphabetically
        return a.name.localeCompare(b.name)
      }
      
      // Neither enabled: Show default aggregated view, sorted by unconfirmed first, then alphabetical
      if (!sortByStore.value && !sortByMenu.value) {
        sortedIngredients.value = [...weeklyIngredients.value].sort(sortIngredients)
        return
      }
      
      // Note: Both cannot be enabled at the same time due to mutual exclusivity
      // If both are somehow enabled, prioritize menu sorting
      if (sortByStore.value && sortByMenu.value) {
        sortByStore.value = false
      }
      
      if (sortByStore.value) {
        // Only store sorting: group ingredients by store and aggregate by ingredient name
        const storeSections = new Map()

        for (const ingredient of weeklyIngredients.value) {
          const store = ingredient.store || 'Unknown Store'

          if (!storeSections.has(store)) {
            storeSections.set(store, {
              storeName: store,
              ingredients: new Map() // Use Map to aggregate by ingredient name
            })
          }

          const section = storeSections.get(store)
          // Aggregate ingredients by name within each store section
          const ingredientKey = `${ingredient.name}::${ingredient.units || ''}`
          
          if (!section.ingredients.has(ingredientKey)) {
            section.ingredients.set(ingredientKey, {
              name: ingredient.name,
              units: ingredient.units || '',
              totalQuantity: 0,
              totalCost: 0,
              store: ingredient.store,
              isConfirmed: ingredient.isConfirmed !== false, // Default to true
              sources: []
            })
          }

          const aggregatedIngredient = section.ingredients.get(ingredientKey)
          aggregatedIngredient.totalQuantity += Number(ingredient.totalQuantity || 0)
          aggregatedIngredient.totalCost += Number(ingredient.totalCost || 0)
          // Preserve unconfirmed status if any ingredient is unconfirmed
          if (ingredient.isConfirmed === false) {
            aggregatedIngredient.isConfirmed = false
          }
          // Merge sources, aggregating by menu across all ingredients with the same name
          if (ingredient.sources && ingredient.sources.length > 0) {
            // Create or get source menu map for this aggregated ingredient
            if (!aggregatedIngredient._sourceMenuMap) {
              aggregatedIngredient._sourceMenuMap = new Map()
            }
            const sourceMenuMap = aggregatedIngredient._sourceMenuMap
            
            ingredient.sources.forEach(source => {
              const menuKey = `${source.menuId || ''}-${source.date || ''}`
              if (!sourceMenuMap.has(menuKey)) {
                sourceMenuMap.set(menuKey, {
                  menuId: source.menuId,
                  menuName: source.menuName,
                  ownerName: source.ownerName,
                  date: source.date,
                  quantity: 0,
                  units: source.units || ingredient.units,
                  store: source.store || ingredient.store
                })
              }
              const aggregatedSource = sourceMenuMap.get(menuKey)
              aggregatedSource.quantity += Number(source.quantity || 0)
            })
          }
        }

        // Convert ingredient Maps to arrays and finalize sources
        storeSections.forEach((section) => {
          section.ingredients.forEach((ingredient) => {
            // Convert source menu map to sources array
            if (ingredient._sourceMenuMap) {
              ingredient.sources = Array.from(ingredient._sourceMenuMap.values())
              delete ingredient._sourceMenuMap
            }
          })
          section.ingredients = Array.from(section.ingredients.values())
        })

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

            // Add ingredients for this store, sorted by unconfirmed first, then name
            section.ingredients
              .sort(sortIngredients)
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
                ingredients: new Map() // Use Map to aggregate by ingredient name
              })
            }

            const section = menuSections.get(sectionKey)
            const ingredientKey = `${ingredient.name}::${source.units || ingredient.units}::${source.store || ingredient.store || ''}`
            
            if (!section.ingredients.has(ingredientKey)) {
              section.ingredients.set(ingredientKey, {
                name: ingredient.name,
                units: source.units || ingredient.units,
                totalQuantity: 0,
                totalCost: 0,
                isConfirmed: ingredient.isConfirmed,
                store: source.store || ingredient.store || ingredient.store,
                sources: []
              })
            }

            const aggregatedIngredient = section.ingredients.get(ingredientKey)
            aggregatedIngredient.totalQuantity += Number(source.quantity || 0)
            // Calculate cost proportionally based on quantity
            const sourceQuantity = Number(source.quantity || 0)
            const totalSourceQuantity = ingredient.sources.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
            if (totalSourceQuantity > 0 && ingredient.totalCost) {
              aggregatedIngredient.totalCost += (ingredient.totalCost * sourceQuantity) / totalSourceQuantity
            }
            // Preserve unconfirmed status if any source is unconfirmed
            if (ingredient.isConfirmed === false) {
              aggregatedIngredient.isConfirmed = false
            }
            // Add source to sources array
            aggregatedIngredient.sources.push({
              menuId: section.menuId,
              menuName: section.menuName,
              ownerName: section.ownerName,
              date: section.date,
              quantity: source.quantity,
              units: source.units || ingredient.units,
              store: source.store || ingredient.store
            })
          }
        }

        // Convert ingredient Maps to arrays
        menuSections.forEach((section) => {
          section.ingredients = Array.from(section.ingredients.values())
        })

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
              menuId: section.menuId,
              cost: costStr,
              units: '',
              totalQuantity: 0,
              totalCost: 0,
              sources: [],
              isMenuHeader: true
            })

            section.ingredients
              .sort(sortIngredients)
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

        const weekStartStr = formatDate(currentWeekStart.value)
        console.log('[WeeklyCartPage] Loading week data for week starting:', weekStartStr)

        await loadWeeklyCartBundle()
        
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
      const today = new Date()
      currentWeekStart.value = weeklyCartService.getWeekStart(today)
      goToDateValue.value = weeklyCartService.formatDate(today)
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
          weeklyCartStore.clearBundle(weekStart)

          closeAddMenuModal()
            // Refresh data with updated bundle
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
            const weekStart = weeklyCartService.formatDate(currentWeekStart.value)
            weeklyCartStore.clearBundle(weekStart)
            // Refresh data with updated bundle
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

    // Instacart export methods
    const exportAllIngredientsToInstacart = async () => {
      if (isExportingToInstacart.value || weeklyIngredients.value.length === 0) return
      
      isExportingToInstacart.value = true
      instacartError.value = null
      
      try {
        // Filter out header items
        const ingredientsToExport = weeklyIngredients.value.filter(
          ing => !ing.isMenuHeader && !ing.isStoreHeader
        )
        
        if (ingredientsToExport.length === 0) {
          throw new Error('No ingredients available to export')
        }
        
        const weekStartStr = formatDate(currentWeekStart.value)
        const weekEnd = weeklyCartService.getWeekEnd(new Date(currentWeekStart.value))
        const weekEndStr = formatDate(weekEnd)
        const title = `Week of ${weekStartStr} - ${weekEndStr} - Shopping List`
        
        const instacartUrl = await createShoppingList(ingredientsToExport, {
          title,
          weekStart: weekStartStr
        })
        
        // Open Instacart link in new tab
        window.open(instacartUrl, '_blank', 'noopener,noreferrer')
      } catch (error) {
        console.error('Error exporting to Instacart:', error)
        instacartError.value = error.message || 'Failed to export to Instacart. Please try again.'
        // Show error for 5 seconds
        setTimeout(() => {
          instacartError.value = null
        }, 5000)
      } finally {
        isExportingToInstacart.value = false
      }
    }

    const exportStoreIngredientsToInstacart = async (storeName) => {
      if (isExportingToInstacart.value || !storeName) return
      
      isExportingToInstacart.value = true
      instacartError.value = null
      
      try {
        // Filter ingredients for this store
        const ingredientsToExport = weeklyIngredients.value.filter(
          ing => !ing.isMenuHeader && !ing.isStoreHeader && ing.store === storeName
        )
        
        if (ingredientsToExport.length === 0) {
          throw new Error(`No ingredients found for ${storeName}`)
        }
        
        const weekStartStr = formatDate(currentWeekStart.value)
        const weekEnd = weeklyCartService.getWeekEnd(new Date(currentWeekStart.value))
        const weekEndStr = formatDate(weekEnd)
        const title = `Week of ${weekStartStr} - ${weekEndStr} - ${storeName} - Shopping List`
        
        const instacartUrl = await createShoppingList(ingredientsToExport, {
          title,
          weekStart: weekStartStr
        })
        
        // Open Instacart link in new tab
        window.open(instacartUrl, '_blank', 'noopener,noreferrer')
      } catch (error) {
        console.error('Error exporting store to Instacart:', error)
        instacartError.value = error.message || 'Failed to export to Instacart. Please try again.'
        // Show error for 5 seconds
        setTimeout(() => {
          instacartError.value = null
        }, 5000)
      } finally {
        isExportingToInstacart.value = false
      }
    }

    const exportMenuIngredientsToInstacart = async (menuHeader) => {
      if (isExportingToInstacart.value || !menuHeader) return
      
      isExportingToInstacart.value = true
      instacartError.value = null
      
      try {
        // Find ingredients for this menu from sortedIngredients
        // Ingredients after the menu header until the next header belong to this menu
        const menuHeaderIndex = sortedIngredients.value.findIndex(
          ing => ing.isMenuHeader && 
                 ing.date === menuHeader.date && 
                 ing.menuName === menuHeader.menuName
        )
        
        if (menuHeaderIndex === -1) {
          throw new Error('Menu header not found')
        }
        
        // Collect ingredients until next header
        const ingredientsToExport = []
        for (let i = menuHeaderIndex + 1; i < sortedIngredients.value.length; i++) {
          const ing = sortedIngredients.value[i]
          if (ing.isMenuHeader || ing.isStoreHeader) {
            break
          }
          // Verify this ingredient belongs to this menu by checking sources
          // Match by menuId if available, otherwise by date
          if (ing.sources && ing.sources.some(source => {
            if (menuHeader.menuId && source.menuId) {
              return source.menuId === menuHeader.menuId
            }
            return source.date === menuHeader.date
          })) {
            ingredientsToExport.push(ing)
          }
        }
        
        if (ingredientsToExport.length === 0) {
          throw new Error(`No ingredients found for ${menuHeader.menuName}`)
        }
        
        const title = `${menuHeader.date} - ${menuHeader.menuName} - ${menuHeader.ownerName} Shopping List`
        const weekStartStr = formatDate(currentWeekStart.value)
        
        const instacartUrl = await createShoppingList(ingredientsToExport, {
          title,
          weekStart: weekStartStr
        })
        
        // Open Instacart link in new tab
        window.open(instacartUrl, '_blank', 'noopener,noreferrer')
      } catch (error) {
        console.error('Error exporting menu to Instacart:', error)
        instacartError.value = error.message || 'Failed to export to Instacart. Please try again.'
        // Show error for 5 seconds
        setTimeout(() => {
          instacartError.value = null
        }, 5000)
      } finally {
        isExportingToInstacart.value = false
      }
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
      showPageHeaders,
      cartCost,
      cartCostLoading,
      cartCostError,
      showAddMenuModal,
      showConfirmModal,
      selectedDate,
      confirmModal,
      sortByMenu,
      sortByStore,
      INSTACART_BUTTON_TEXT,
      isExportingToInstacart,
      instacartError,
      
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
      exportAllIngredientsToInstacart,
      exportStoreIngredientsToInstacart,
      exportMenuIngredientsToInstacart,
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

.weekly-cart-page.page-container-with-header {
  padding-top: 3rem;
}

.weekly-cart-page.page-container-no-header {
  padding-top: 2rem;
}

.week-navigation {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0;
  padding: 0.75rem;
  background: var(--primary-light);
  border-radius: 12px 12px 0 0;
  flex-wrap: nowrap;
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

.week-range {
  color: var(--primary-color);
  margin: 0;
  font-size: 1.5rem;
  white-space: nowrap;
}

.nav-spacer {
  flex: 2;
  min-width: 2rem;
}

.nav-edge-spacer {
  flex: 1;
  min-width: 1rem;
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

.joined-control {
  gap: 0;
  background: #fff;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  overflow: hidden;
}

.joined-input {
  border: none;
  border-radius: 0;
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

.week-navigation .nav-btn,
.week-navigation .current-week-btn,
.week-navigation .joined-control,
.week-navigation .joined-input {
  height: 40px;
}

.week-navigation .nav-btn,
.week-navigation .current-week-btn {
  padding-top: 0;
  padding-bottom: 0;
}

.week-navigation .joined-input {
  padding-top: 0;
  padding-bottom: 0;
  line-height: 1;
  font-size: 1rem;
}

.week-navigation .joined-control {
  display: inline-flex;
}

.joined-control .current-week-btn.joined-button {
  border-radius: 0 8px 8px 0;
}

.today-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.25rem 0.75rem;
  line-height: 1;
  white-space: nowrap;
}

.today-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.today-label {
  font-size: 0.8rem;
}

.current-week-btn:hover:not(:disabled) {
  background: var(--primary-color);
}

.refresh-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
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
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.day-headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--primary-color);
  color: white;
}

.day-header {
  padding: 0.4rem 0.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 1rem;
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
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.summary-text {
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

/* Instacart Export Styles */
.instacart-error {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #c33;
}

.instacart-error p {
  margin: 0;
  font-size: 0.95rem;
}

.instacart-btn {
  background: #003D29;
  color: #FAF1E5;
  border: none;
  border-radius: 23px;
  height: 46px;
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.instacart-btn:hover:not(:disabled) {
  background: #002a1d;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 61, 41, 0.3);
}

.instacart-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.instacart-logo {
  height: 22px;
  width: auto;
  display: block;
}

.instacart-btn-all {
  padding: 8px 18px;
  font-size: 0.9rem;
}

.instacart-btn-store {
  padding: 8px 18px;
  font-size: 0.9rem;
  margin-left: 1rem;
}

.instacart-btn-menu {
  padding: 8px 18px;
  font-size: 0.9rem;
  margin-left: 1rem;
}


.store-header-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.menu-header-center {
  flex: 1;
  text-align: center;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
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

.ingredient-item.unconfirmed-ingredient:not(.menu-header):not(.store-header) {
  background: #ffebee;
  border-color: #ef9a9a;
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

  .weekly-cart-page.page-container-with-header {
    padding-top: 2rem;
  }

  .weekly-cart-page.page-container-no-header {
    padding-top: 1rem;
  }

  .week-navigation {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }

  .nav-spacer {
    display: none;
  }

  .nav-edge-spacer {
    display: none;
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

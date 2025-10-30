<template>
  <div class="store-catalog-container">
    <div class="catalog-header">
      <h1>Store Catalog</h1>
      <p>Manage your ingredient catalog with purchase options and alternative names</p>
    </div>

    <!-- Search and Filter Section -->
    <div class="search-filter-section">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search items by name..."
          class="search-input"
          @input="filterItems"
        />
        <button @click="clearSearch" class="clear-search-btn" v-if="searchQuery">
          ✕
        </button>
      </div>
      <button @click="showAddItemModal = true" class="add-item-btn">
        + Add New Item
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading catalog...</p>
    </div>

    <!-- Error State -->
    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
      <button @click="clearError" class="close-error-btn">✕</button>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="success-banner">
      {{ successMessage }}
      <button @click="clearSuccess" class="close-success-btn">✕</button>
    </div>

    <!-- Items Grid -->
    <div v-if="!loading && paginatedItems.length > 0" class="items-grid">
      <div
        v-for="item in paginatedItems"
        :key="item.id"
        class="item-card"
      >
        <div class="item-header">
          <h3 class="item-primary-name">{{ item.primaryName }}</h3>
          <div class="item-actions">
            <button @click="editItem(item)" class="edit-btn">Edit</button>
          </div>
        </div>

        <!-- Alternative Names -->
        <div v-if="item.names.length > 1" class="item-names">
          <h4>Alternative Names:</h4>
          <div class="names-list">
            <span
              v-for="name in item.names.filter(name => name !== item.primaryName)"
              :key="name"
              class="name-tag"
            >
              {{ name }}
            </span>
          </div>
        </div>

        <!-- Purchase Options -->
        <div class="purchase-options">
          <h4>Purchase Options:</h4>
          <div v-if="item.purchaseOptions.length === 0" class="no-options">
            No purchase options available
          </div>
          <div v-else class="options-list">
            <div
              v-for="option in item.purchaseOptions"
              :key="option.id"
              class="purchase-option"
              :class="{ 'confirmed': option.confirmed }"
            >
              <div class="option-details">
                <span class="quantity">{{ option.quantity }}</span>
                <span class="units">{{ option.units }}</span>
                <span class="price">${{ option.price.toFixed(2) }}</span>
                <span class="store">{{ option.store }}</span>
              </div>
              <div class="option-actions">
                <button
                  v-if="!option.confirmed"
                  @click="confirmPurchaseOption(option.id)"
                  class="confirm-btn"
                >
                  Confirm
                </button>
                <span v-if="option.confirmed" class="confirmed-badge">✓ Confirmed</span>
                <button @click="editPurchaseOption(option)" class="edit-option-btn">
                  Edit
                </button>
                <button @click="removePurchaseOption(item.id, option.id)" class="remove-option-btn">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination Controls -->
    <div v-if="!loading && filteredItems.length > itemsPerPage" class="pagination-container">
      <div class="pagination-info">
        {{ paginationInfo }}
      </div>
      
      <div class="pagination-controls">
        <button 
          @click="goToFirstPage" 
          :disabled="!hasPreviousPage"
          class="pagination-btn"
          title="First page"
        >
          ⏮️
        </button>
        
        <button 
          @click="previousPage" 
          :disabled="!hasPreviousPage"
          class="pagination-btn"
          title="Previous page"
        >
          ◀️
        </button>
        
        <div class="page-numbers">
          <button
            v-for="page in Math.min(5, totalPagesComputed)"
            :key="page"
            @click="goToPage(page)"
            :class="['page-btn', { active: currentPage === page }]"
          >
            {{ page }}
          </button>
          
          <span v-if="totalPagesComputed > 5" class="page-ellipsis">...</span>
          
          <button
            v-if="totalPagesComputed > 5 && currentPage < totalPagesComputed - 2"
            @click="goToPage(totalPagesComputed)"
            :class="['page-btn', { active: currentPage === totalPagesComputed }]"
          >
            {{ totalPagesComputed }}
          </button>
        </div>
        
        <button 
          @click="nextPage" 
          :disabled="!hasNextPage"
          class="pagination-btn"
          title="Next page"
        >
          ▶️
        </button>
        
        <button 
          @click="goToLastPage" 
          :disabled="!hasNextPage"
          class="pagination-btn"
          title="Last page"
        >
          ⏭️
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredItems.length === 0" class="empty-state">
      <div v-if="searchQuery">
        <h3>No items found</h3>
        <p>No items match your search criteria.</p>
        <button @click="clearSearch" class="clear-search-btn">Clear Search</button>
      </div>
      <div v-else>
        <h3>No items in catalog</h3>
        <p>Start by adding your first item to the catalog.</p>
        <button @click="showAddItemModal = true" class="add-item-btn">
          + Add Your First Item
        </button>
      </div>
    </div>

    <!-- Add Item Modal -->
    <div v-if="showAddItemModal" class="modal-overlay" @click="closeAddItemModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Add New Item</h2>
          <button @click="closeAddItemModal" class="close-button">&times;</button>
        </div>
        
        <form @submit.prevent="handleAddItem" class="add-item-form">
          <div class="form-group">
            <label for="primaryName">Primary Name *</label>
            <input
              id="primaryName"
              v-model="newItemForm.primaryName"
              type="text"
              required
              :disabled="addItemLoading"
              placeholder="Enter the primary name for this item"
              class="form-input"
              :class="{ 'error': addItemErrors.primaryName }"
            />
            <span v-if="addItemErrors.primaryName" class="error-message">{{ addItemErrors.primaryName }}</span>
          </div>
          
          <button 
            type="submit" 
            :disabled="addItemLoading || !newItemForm.primaryName.trim()"
            class="submit-button"
            :class="{ 'loading': addItemLoading }"
          >
            <span v-if="addItemLoading" class="spinner"></span>
            {{ addItemLoading ? 'Adding Item...' : 'Add Item' }}
          </button>
          
          <div v-if="addItemErrorMessage" class="error-banner">
            {{ addItemErrorMessage }}
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Item Modal -->
    <div v-if="showEditItemModal" class="modal-overlay" @click="closeEditItemModal">
      <div class="modal-content large-modal" @click.stop>
        <div class="modal-header">
          <h2>Edit Item: {{ editingItem?.primaryName }}</h2>
          <div class="modal-header-actions">
            <button @click="deleteItem(editingItem)" class="delete-btn">Delete Item</button>
            <button @click="closeEditItemModal" class="close-button">&times;</button>
          </div>
        </div>
        
        <div class="edit-item-content">
          <!-- Alternative Names Section -->
          <div class="edit-section">
            <h3>Alternative Names</h3>
            <div class="names-management">
              <div class="add-name-form">
                <input
                  v-model="newName"
                  type="text"
                  placeholder="Add alternative name"
                  class="form-input"
                />
                <button @click="addAlternativeName" class="add-name-btn" :disabled="!newName.trim()">
                  Add Name
                </button>
              </div>
              <div class="names-list">
                <div
                  v-for="name in editingItem?.names || []"
                  :key="name"
                  class="name-item"
                >
                  <span class="name-text">
                    {{ name }}
                  </span>
                  <button
                    v-if="name !== editingItem?.primaryName"
                    @click="removeAlternativeName(name)"
                    class="remove-name-btn"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Purchase Options Section -->
          <div class="edit-section">
            <h3>Purchase Options</h3>
            <button @click="showAddPurchaseOptionModal = true" class="add-purchase-option-btn">
              + Add Purchase Option
            </button>
            
            <div class="purchase-options-list">
              <div
                v-for="option in editingItem?.purchaseOptions || []"
                :key="option.id"
                class="purchase-option-item"
                :class="{ 'confirmed': option.confirmed }"
              >
                <div class="option-info">
                  <span class="quantity">{{ option.quantity }}</span>
                  <span class="units">{{ option.units }}</span>
                  <span class="price">${{ option.price.toFixed(2) }}</span>
                  <span class="store">{{ option.store }}</span>
                </div>
                <div class="option-actions">
                  <button
                    v-if="!option.confirmed"
                    @click="confirmPurchaseOption(option.id)"
                    class="confirm-btn"
                  >
                    Confirm
                  </button>
                  <span v-if="option.confirmed" class="confirmed-badge">✓ Confirmed</span>
                  <button @click="editPurchaseOption(option)" class="edit-option-btn">
                    Edit
                  </button>
                  <button @click="removePurchaseOption(editingItem.id, option.id)" class="remove-option-btn">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Purchase Option Modal -->
    <div v-if="showAddPurchaseOptionModal" class="modal-overlay" @click="closeAddPurchaseOptionModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Add Purchase Option</h2>
          <button @click="closeAddPurchaseOptionModal" class="close-button">&times;</button>
        </div>
        
        <form @submit.prevent="handleAddPurchaseOption" class="add-purchase-option-form">
          <div class="form-group">
            <label for="quantity">Quantity *</label>
            <input
              id="quantity"
              v-model.number="newPurchaseOptionForm.quantity"
              type="number"
              step="0.01"
              min="0.01"
              required
              :disabled="addPurchaseOptionLoading"
              placeholder="Enter quantity"
              class="form-input"
              :class="{ 'error': addPurchaseOptionErrors.quantity }"
            />
            <span v-if="addPurchaseOptionErrors.quantity" class="error-message">{{ addPurchaseOptionErrors.quantity }}</span>
          </div>
          
          <div class="form-group">
            <label for="units">Units *</label>
            <select
              id="units"
              v-model="newPurchaseOptionForm.units"
              required
              :disabled="addPurchaseOptionLoading"
              class="form-input"
              :class="{ 'error': addPurchaseOptionErrors.units }"
            >
              <option value="">Select units...</option>
              <option 
                v-for="unit in SUPPORTED_UNITS" 
                :key="unit.value" 
                :value="unit.value"
              >
                {{ unit.label }}
              </option>
            </select>
            <span v-if="addPurchaseOptionErrors.units" class="error-message">{{ addPurchaseOptionErrors.units }}</span>
          </div>
          
          <div class="form-group">
            <label for="price">Price *</label>
            <input
              id="price"
              v-model.number="newPurchaseOptionForm.price"
              type="number"
              step="0.01"
              min="0"
              required
              :disabled="addPurchaseOptionLoading"
              placeholder="Enter price"
              class="form-input"
              :class="{ 'error': addPurchaseOptionErrors.price }"
            />
            <span v-if="addPurchaseOptionErrors.price" class="error-message">{{ addPurchaseOptionErrors.price }}</span>
          </div>
          
          <div class="form-group">
            <label for="store">Store *</label>
            <select
              id="store"
              v-model="newPurchaseOptionForm.store"
              required
              :disabled="addPurchaseOptionLoading"
              class="form-input"
              :class="{ 'error': addPurchaseOptionErrors.store }"
            >
              <option value="">Select store...</option>
              <option 
                v-for="store in SUPPORTED_STORES" 
                :key="store" 
                :value="store"
              >
                {{ store }}
              </option>
            </select>
            <span v-if="addPurchaseOptionErrors.store" class="error-message">{{ addPurchaseOptionErrors.store }}</span>
          </div>
          
          <button 
            type="submit" 
            :disabled="addPurchaseOptionLoading || !isAddPurchaseOptionFormValid"
            class="submit-button"
            :class="{ 'loading': addPurchaseOptionLoading }"
          >
            <span v-if="addPurchaseOptionLoading" class="spinner"></span>
            {{ addPurchaseOptionLoading ? 'Adding Option...' : 'Add Purchase Option' }}
          </button>
          
          <div v-if="addPurchaseOptionErrorMessage" class="error-banner">
            {{ addPurchaseOptionErrorMessage }}
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Purchase Option Modal -->
    <div v-if="showEditPurchaseOptionModal" class="modal-overlay" @click="closeEditPurchaseOptionModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit Purchase Option</h2>
          <button @click="closeEditPurchaseOptionModal" class="close-button">&times;</button>
        </div>
        
        <form @submit.prevent="handleUpdatePurchaseOption" class="edit-purchase-option-form">
          <div class="form-group">
            <label for="edit-quantity">Quantity *</label>
            <input
              id="edit-quantity"
              v-model.number="editingPurchaseOptionForm.quantity"
              type="number"
              step="0.01"
              min="0.01"
              required
              :disabled="updatePurchaseOptionLoading"
              class="form-input"
              :class="{ 'error': updatePurchaseOptionErrors.quantity }"
            />
            <span v-if="updatePurchaseOptionErrors.quantity" class="error-message">{{ updatePurchaseOptionErrors.quantity }}</span>
          </div>
          
          <div class="form-group">
            <label for="edit-units">Units *</label>
            <select
              id="edit-units"
              v-model="editingPurchaseOptionForm.units"
              required
              :disabled="updatePurchaseOptionLoading"
              class="form-input"
              :class="{ 'error': updatePurchaseOptionErrors.units }"
            >
              <option value="">Select units...</option>
              <option 
                v-for="unit in SUPPORTED_UNITS" 
                :key="unit.value" 
                :value="unit.value"
              >
                {{ unit.label }}
              </option>
            </select>
            <span v-if="updatePurchaseOptionErrors.units" class="error-message">{{ updatePurchaseOptionErrors.units }}</span>
          </div>
          
          <div class="form-group">
            <label for="edit-price">Price *</label>
            <input
              id="edit-price"
              v-model.number="editingPurchaseOptionForm.price"
              type="number"
              step="0.01"
              min="0"
              required
              :disabled="updatePurchaseOptionLoading"
              class="form-input"
              :class="{ 'error': updatePurchaseOptionErrors.price }"
            />
            <span v-if="updatePurchaseOptionErrors.price" class="error-message">{{ updatePurchaseOptionErrors.price }}</span>
          </div>
          
          <div class="form-group">
            <label for="edit-store">Store *</label>
            <select
              id="edit-store"
              v-model="editingPurchaseOptionForm.store"
              required
              :disabled="updatePurchaseOptionLoading"
              class="form-input"
              :class="{ 'error': updatePurchaseOptionErrors.store }"
            >
              <option value="">Select store...</option>
              <option 
                v-for="store in SUPPORTED_STORES" 
                :key="store" 
                :value="store"
              >
                {{ store }}
              </option>
            </select>
            <span v-if="updatePurchaseOptionErrors.store" class="error-message">{{ updatePurchaseOptionErrors.store }}</span>
          </div>
          
          <button 
            type="submit" 
            :disabled="updatePurchaseOptionLoading || !isEditPurchaseOptionFormValid"
            class="submit-button"
            :class="{ 'loading': updatePurchaseOptionLoading }"
          >
            <span v-if="updatePurchaseOptionLoading" class="spinner"></span>
            {{ updatePurchaseOptionLoading ? 'Updating...' : 'Update Purchase Option' }}
          </button>
          
          <div v-if="updatePurchaseOptionErrorMessage" class="error-banner">
            {{ updatePurchaseOptionErrorMessage }}
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Confirm Delete</h2>
          <button @click="closeDeleteModal" class="close-button">&times;</button>
        </div>
        
        <div class="delete-confirmation">
          <p>Are you sure you want to delete <strong>{{ itemToDelete?.primaryName }}</strong>?</p>
          <p class="warning-text">This will also delete all associated purchase options and cannot be undone.</p>
          
          <div class="confirmation-actions">
            <button @click="closeDeleteModal" class="cancel-btn">Cancel</button>
            <button @click="handleDeleteItem" class="delete-confirm-btn" :disabled="deleteItemLoading">
              <span v-if="deleteItemLoading" class="spinner"></span>
              {{ deleteItemLoading ? 'Deleting...' : 'Delete Item' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { storeCatalogService } from '../services/storeCatalogService.js'
import { SUPPORTED_STORES, SUPPORTED_UNITS } from '../constants/storeCatalogConstants.js'

export default {
  name: 'StoreCatalogPage',
  setup() {
    // State
    const loading = ref(false)
    const errorMessage = ref('')
    const successMessage = ref('')
    const searchQuery = ref('')
    const items = ref([])
    const filteredItems = ref([])
    
    // Pagination state
    const currentPage = ref(1)
    const itemsPerPage = ref(15)
    const totalPages = ref(1)

    // Modal states
    const showAddItemModal = ref(false)
    const showEditItemModal = ref(false)
    const showAddPurchaseOptionModal = ref(false)
    const showEditPurchaseOptionModal = ref(false)
    const showDeleteModal = ref(false)

    // Form states
    const newItemForm = reactive({
      primaryName: ''
    })

    const newPurchaseOptionForm = reactive({
      quantity: '',
      units: '',
      price: '',
      store: ''
    })

    const editingPurchaseOptionForm = reactive({
      quantity: '',
      units: '',
      price: '',
      store: ''
    })

    // Error states
    const addItemErrors = reactive({})
    const addItemErrorMessage = ref('')
    const addItemLoading = ref(false)

    const addPurchaseOptionErrors = reactive({})
    const addPurchaseOptionErrorMessage = ref('')
    const addPurchaseOptionLoading = ref(false)

    const updatePurchaseOptionErrors = reactive({})
    const updatePurchaseOptionErrorMessage = ref('')
    const updatePurchaseOptionLoading = ref(false)

    const deleteItemLoading = ref(false)

    // Editing states
    const editingItem = ref(null)
    const editingPurchaseOption = ref(null)
    const itemToDelete = ref(null)
    const newName = ref('')

    // Computed properties
    const isAddPurchaseOptionFormValid = computed(() => {
      return newPurchaseOptionForm.quantity > 0 &&
             newPurchaseOptionForm.units.trim() &&
             newPurchaseOptionForm.price >= 0 &&
             newPurchaseOptionForm.store.trim()
    })

    const isEditPurchaseOptionFormValid = computed(() => {
      return editingPurchaseOptionForm.quantity > 0 &&
             editingPurchaseOptionForm.units.trim() &&
             editingPurchaseOptionForm.price >= 0 &&
             editingPurchaseOptionForm.store.trim()
    })

    // Pagination computed properties
    const paginatedItems = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredItems.value.slice(start, end)
    })

    const totalPagesComputed = computed(() => {
      return Math.ceil(filteredItems.value.length / itemsPerPage.value)
    })

    const hasNextPage = computed(() => {
      return currentPage.value < totalPagesComputed.value
    })

    const hasPreviousPage = computed(() => {
      return currentPage.value > 1
    })

    const paginationInfo = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value + 1
      const end = Math.min(currentPage.value * itemsPerPage.value, filteredItems.value.length)
      return `${start}-${end} of ${filteredItems.value.length} items`
    })

    // Methods
    const clearError = () => {
      errorMessage.value = ''
    }

    const clearSuccess = () => {
      successMessage.value = ''
    }

    const clearSearch = () => {
      searchQuery.value = ''
      filterItems()
    }

    // Pagination navigation functions
    const goToPage = (page) => {
      if (page >= 1 && page <= totalPagesComputed.value) {
        currentPage.value = page
      }
    }

    const nextPage = () => {
      if (hasNextPage.value) {
        currentPage.value++
      }
    }

    const previousPage = () => {
      if (hasPreviousPage.value) {
        currentPage.value--
      }
    }

    const goToFirstPage = () => {
      currentPage.value = 1
    }

    const goToLastPage = () => {
      currentPage.value = totalPagesComputed.value
    }

    const filterItems = () => {
      if (!searchQuery.value.trim()) {
        filteredItems.value = items.value
      } else {
        const query = searchQuery.value.toLowerCase()
        filteredItems.value = items.value.filter(item => {
          return item.primaryName.toLowerCase().includes(query) ||
                 item.names.some(name => name.toLowerCase().includes(query))
        })
      }
      
      // Reset to first page when filtering
      currentPage.value = 1
    }

    const loadItems = async () => {
      loading.value = true
      clearError()

      try {
        const response = await storeCatalogService.getAllItems()
        const itemIds = response[0]?.items || []

        // Load detailed information for each item
        const itemsWithDetails = await Promise.all(
          itemIds.map(async (itemId) => {
            try {
              const [namesResponse, purchaseOptionsResponse] = await Promise.all([
                storeCatalogService.getItemNames(itemId),
                storeCatalogService.getItemPurchaseOptions(itemId)
              ])

              const names = namesResponse[0]?.names || []
              const purchaseOptionIds = purchaseOptionsResponse[0]?.purchaseOptions || []

              // Load purchase option details
              const purchaseOptions = await Promise.all(
                purchaseOptionIds.map(async (optionId) => {
                  try {
                    const detailsResponse = await storeCatalogService.getPurchaseOptionDetails(optionId)
                    return {
                      id: optionId,
                      ...detailsResponse[0]
                    }
                  } catch (error) {
                    console.error(`Error loading purchase option ${optionId}:`, error)
                    return null
                  }
                })
              )

              return {
                id: itemId,
                primaryName: names[0] || 'Unknown',
                names: names,
                purchaseOptions: purchaseOptions.filter(option => option !== null)
              }
            } catch (error) {
              console.error(`Error loading item ${itemId}:`, error)
              return null
            }
          })
        )

        items.value = itemsWithDetails.filter(item => item !== null)
        filteredItems.value = items.value
      } catch (error) {
        console.error('Error loading items:', error)
        errorMessage.value = error.message || 'Failed to load items'
      } finally {
        loading.value = false
      }
    }

    const handleAddItem = async () => {
      addItemLoading.value = true
      clearAddItemErrors()

      try {
        const response = await storeCatalogService.createItem(newItemForm.primaryName.trim())
        
        if (response.item) {
          // Add the new item to the local items array instead of reloading everything
          const newItem = {
            id: response.item,
            primaryName: newItemForm.primaryName.trim(),
            names: [newItemForm.primaryName.trim()],
            purchaseOptions: []
          }
          
          items.value.unshift(newItem) // Add to beginning of array
          filterItems() // Update filtered items and reset pagination
          
          successMessage.value = 'Item added successfully!'
          closeAddItemModal()
        } else {
          throw new Error('Invalid response from server')
        }
      } catch (error) {
        console.error('Add item error:', error)
        addItemErrorMessage.value = error.message || 'Failed to add item'
      } finally {
        addItemLoading.value = false
      }
    }

    const handleAddPurchaseOption = async () => {
      addPurchaseOptionLoading.value = true
      clearAddPurchaseOptionErrors()

      try {
        const response = await storeCatalogService.addPurchaseOption(
          editingItem.value.id,
          newPurchaseOptionForm.quantity,
          newPurchaseOptionForm.units.trim(),
          newPurchaseOptionForm.price,
          newPurchaseOptionForm.store.trim()
        )
        
        if (response.purchaseOption) {
          successMessage.value = 'Purchase option added successfully!'
          closeAddPurchaseOptionModal()
          await loadItems()
        } else {
          throw new Error('Invalid response from server')
        }
      } catch (error) {
        console.error('Add purchase option error:', error)
        addPurchaseOptionErrorMessage.value = error.message || 'Failed to add purchase option'
      } finally {
        addPurchaseOptionLoading.value = false
      }
    }

    const handleUpdatePurchaseOption = async () => {
      updatePurchaseOptionLoading.value = true
      clearUpdatePurchaseOptionErrors()

      try {
        // Update each field separately as per API specification
        await Promise.all([
          storeCatalogService.updatePurchaseOptionQuantity(editingPurchaseOption.value.id, editingPurchaseOptionForm.quantity),
          storeCatalogService.updatePurchaseOptionUnits(editingPurchaseOption.value.id, editingPurchaseOptionForm.units.trim()),
          storeCatalogService.updatePurchaseOptionPrice(editingPurchaseOption.value.id, editingPurchaseOptionForm.price),
          storeCatalogService.updatePurchaseOptionStore(editingPurchaseOption.value.id, editingPurchaseOptionForm.store.trim())
        ])
        
        successMessage.value = 'Purchase option updated successfully!'
        closeEditPurchaseOptionModal()
        await loadItems()
      } catch (error) {
        console.error('Update purchase option error:', error)
        updatePurchaseOptionErrorMessage.value = error.message || 'Failed to update purchase option'
      } finally {
        updatePurchaseOptionLoading.value = false
      }
    }

    const handleDeleteItem = async () => {
      deleteItemLoading.value = true

      try {
        const response = await storeCatalogService.deleteItem(itemToDelete.value.id)
        
        if (response.success) {
          successMessage.value = 'Item deleted successfully!'
          closeDeleteModal()
          await loadItems()
        } else {
          throw new Error('Invalid response from server')
        }
      } catch (error) {
        console.error('Delete item error:', error)
        errorMessage.value = error.message || 'Failed to delete item'
      } finally {
        deleteItemLoading.value = false
      }
    }

    const addAlternativeName = async () => {
      if (!newName.value.trim()) return

      try {
        await storeCatalogService.addItemName(editingItem.value.id, newName.value.trim())
        successMessage.value = 'Alternative name added successfully!'
        newName.value = ''
        await loadItems()
      } catch (error) {
        console.error('Add alternative name error:', error)
        errorMessage.value = error.message || 'Failed to add alternative name'
      }
    }

    const removeAlternativeName = async (name) => {
      try {
        await storeCatalogService.removeItemName(editingItem.value.id, name)
        successMessage.value = 'Alternative name removed successfully!'
        await loadItems()
      } catch (error) {
        console.error('Remove alternative name error:', error)
        errorMessage.value = error.message || 'Failed to remove alternative name'
      }
    }

    const confirmPurchaseOption = async (purchaseOptionId) => {
      try {
        await storeCatalogService.confirmPurchaseOption(purchaseOptionId)
        successMessage.value = 'Purchase option confirmed!'
        await loadItems()
      } catch (error) {
        console.error('Confirm purchase option error:', error)
        errorMessage.value = error.message || 'Failed to confirm purchase option'
      }
    }

    const removePurchaseOption = async (itemId, purchaseOptionId) => {
      try {
        await storeCatalogService.removePurchaseOption(itemId, purchaseOptionId)
        successMessage.value = 'Purchase option removed successfully!'
        await loadItems()
      } catch (error) {
        console.error('Remove purchase option error:', error)
        errorMessage.value = error.message || 'Failed to remove purchase option'
      }
    }


    // Modal handlers
    const closeAddItemModal = () => {
      showAddItemModal.value = false
      newItemForm.primaryName = ''
      clearAddItemErrors()
    }

    const closeEditItemModal = () => {
      showEditItemModal.value = false
      editingItem.value = null
      newName.value = ''
    }

    const closeAddPurchaseOptionModal = () => {
      showAddPurchaseOptionModal.value = false
      Object.assign(newPurchaseOptionForm, {
        quantity: '',
        units: '',
        price: '',
        store: ''
      })
      clearAddPurchaseOptionErrors()
    }

    const closeEditPurchaseOptionModal = () => {
      showEditPurchaseOptionModal.value = false
      editingPurchaseOption.value = null
      clearUpdatePurchaseOptionErrors()
    }

    const closeDeleteModal = () => {
      showDeleteModal.value = false
      itemToDelete.value = null
    }

    const editItem = (item) => {
      editingItem.value = item
      showEditItemModal.value = true
    }

    const editPurchaseOption = (option) => {
      editingPurchaseOption.value = option
      Object.assign(editingPurchaseOptionForm, {
        quantity: option.quantity,
        units: option.units,
        price: option.price,
        store: option.store
      })
      showEditPurchaseOptionModal.value = true
    }

    const deleteItem = (item) => {
      itemToDelete.value = item
      showDeleteModal.value = true
    }

    // Error clearing functions
    const clearAddItemErrors = () => {
      Object.keys(addItemErrors).forEach(key => {
        addItemErrors[key] = ''
      })
      addItemErrorMessage.value = ''
    }

    const clearAddPurchaseOptionErrors = () => {
      Object.keys(addPurchaseOptionErrors).forEach(key => {
        addPurchaseOptionErrors[key] = ''
      })
      addPurchaseOptionErrorMessage.value = ''
    }

    const clearUpdatePurchaseOptionErrors = () => {
      Object.keys(updatePurchaseOptionErrors).forEach(key => {
        updatePurchaseOptionErrors[key] = ''
      })
      updatePurchaseOptionErrorMessage.value = ''
    }

    // Lifecycle
    onMounted(() => {
      loadItems()
    })

    return {
      // State
      loading,
      errorMessage,
      successMessage,
      searchQuery,
      items,
      filteredItems,
      
      // Pagination state
      currentPage,
      itemsPerPage,
      totalPages,

      // Modal states
      showAddItemModal,
      showEditItemModal,
      showAddPurchaseOptionModal,
      showEditPurchaseOptionModal,
      showDeleteModal,

      // Form states
      newItemForm,
      newPurchaseOptionForm,
      editingPurchaseOptionForm,

      // Error states
      addItemErrors,
      addItemErrorMessage,
      addItemLoading,
      addPurchaseOptionErrors,
      addPurchaseOptionErrorMessage,
      addPurchaseOptionLoading,
      updatePurchaseOptionErrors,
      updatePurchaseOptionErrorMessage,
      updatePurchaseOptionLoading,
      deleteItemLoading,

      // Editing states
      editingItem,
      editingPurchaseOption,
      itemToDelete,
      newName,

      // Constants
      SUPPORTED_STORES,
      SUPPORTED_UNITS,

      // Computed
      isAddPurchaseOptionFormValid,
      isEditPurchaseOptionFormValid,
      paginatedItems,
      totalPagesComputed,
      hasNextPage,
      hasPreviousPage,
      paginationInfo,

      // Methods
      clearError,
      clearSuccess,
      clearSearch,
      filterItems,
      loadItems,
      
      // Pagination navigation
      goToPage,
      nextPage,
      previousPage,
      goToFirstPage,
      goToLastPage,
      handleAddItem,
      handleAddPurchaseOption,
      handleUpdatePurchaseOption,
      handleDeleteItem,
      addAlternativeName,
      removeAlternativeName,
      confirmPurchaseOption,
      removePurchaseOption,

      // Modal handlers
      closeAddItemModal,
      closeEditItemModal,
      closeAddPurchaseOptionModal,
      closeEditPurchaseOptionModal,
      closeDeleteModal,
      editItem,
      editPurchaseOption,
      deleteItem
    }
  }
}
</script>

<style scoped>
.store-catalog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.catalog-header {
  text-align: center;
  margin-bottom: 2rem;
}

.catalog-header h1 {
  color: var(--primary-color);
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 600;
}

.catalog-header p {
  color: var(--secondary-color);
  margin: 0;
  font-size: 1.1rem;
}

.search-filter-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
}


.search-box {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #fafbfc;
  color: var(--primary-color);
}

.search-input:focus {
  outline: none;
  border-color: var(--secondary-color);
  background: var(--white);
  box-shadow: 0 0 0 3px var(--secondary-light);
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--secondary-color);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn:hover {
  background: var(--primary-light);
}

.add-item-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: var(--white);
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.add-item-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--primary-dark);
}


/* Pagination Styles */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2rem 0;
  padding: 1rem;
  background: var(--white);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pagination-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn {
  background: var(--white);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: var(--white);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0 0.5rem;
}

.page-btn {
  background: var(--white);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-weight: 500;
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.page-btn.active {
  background: var(--primary-color);
  color: var(--white);
  border-color: var(--primary-color);
  font-weight: 600;
}

.page-ellipsis {
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0 0.5rem;
}

.loading-container {
  text-align: center;
  padding: 3rem;
}

.loading-container .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid transparent;
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-banner, .success-banner {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-banner {
  background: var(--error-light);
  color: var(--accent-red);
  border: 1px solid var(--accent-red);
}

.success-banner {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.close-error-btn, .close-success-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.item-card {
  background: var(--white);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.item-primary-name {
  color: var(--primary-color);
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.item-actions {
  display: flex;
}

.edit-btn, .delete-btn {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.edit-btn {
  background: var(--white);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.edit-btn:hover {
  background: #f8f9fa;
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.delete-btn {
  background: #DC2626;
  color: var(--white);
}

.delete-btn:hover {
  background: #B91C1C;
  color: var(--white);
}

.item-names h4, .purchase-options h4 {
  color: var(--primary-color);
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.names-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.name-tag {
  background: var(--primary-light);
  color: var(--primary-color);
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
}


.purchase-options {
  margin-top: 1rem;
}

.no-options {
  color: var(--secondary-color);
  font-style: italic;
  padding: 1rem;
  text-align: center;
  background: var(--primary-light);
  border-radius: 8px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.purchase-option {
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.purchase-option.confirmed {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.option-details {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.quantity, .units, .price, .store {
  font-weight: 500;
}

.quantity {
  color: var(--primary-color);
  font-size: 1.1rem;
}

.units {
  color: var(--secondary-color);
}

.price {
  color: #16a34a;
  font-weight: 600;
}

.store {
  color: var(--primary-color);
}

.confirmed-badge {
  background: #87CEEB;
  color: var(--white);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.option-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.confirm-btn, .edit-option-btn, .remove-option-btn {
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-btn {
  background: #87CEEB;
  color: var(--white);
}

.confirm-btn:hover {
  background: #6BB6FF;
}

.edit-option-btn {
  background: var(--white);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.edit-option-btn:hover {
  background: #f8f9fa;
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.remove-option-btn {
  background: #FCA5A5;
  color: #DC2626;
}

.remove-option-btn:hover {
  background: #F87171;
  color: var(--white);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--secondary-color);
}

.empty-state h3 {
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.empty-state p {
  margin-bottom: 2rem;
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background: var(--white);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.large-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid #e1e8ed;
}

.modal-header h2 {
  color: var(--primary-color);
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--secondary-color);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: var(--primary-light);
  color: var(--primary-color);
}

/* Form Styles */
.add-item-form, .add-purchase-option-form, .edit-purchase-option-form {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--primary-color);
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input {
  padding: 0.875rem 1rem;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #fafbfc;
  color: var(--primary-color);
}

.form-input:focus {
  outline: none;
  border-color: var(--secondary-color);
  background: var(--white);
  box-shadow: 0 0 0 3px var(--secondary-light);
}

.form-input.error {
  border-color: var(--accent-red);
  background: var(--error-light);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Select dropdown styling */
select.form-input {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
  appearance: none;
  cursor: pointer;
}

select.form-input:focus {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%230557a3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
}

select.form-input:disabled {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%9ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  cursor: not-allowed;
}

.error-message {
  color: var(--accent-red);
  font-size: 0.875rem;
  font-weight: 500;
}

.submit-button {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: var(--white);
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--primary-dark);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.submit-button.loading {
  background: #95a5a6;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Edit Item Content */
.edit-item-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.edit-section h3 {
  color: var(--primary-color);
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.names-management {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-name-form {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.add-name-form .form-input {
  flex: 1;
}

.add-name-btn {
  background: var(--secondary-color);
  color: var(--white);
  border: none;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.add-name-btn:hover:not(:disabled) {
  background: var(--primary-color);
}

.add-name-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.name-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--primary-light);
  padding: 0.75rem 1rem;
  border-radius: 8px;
}

.name-text {
  color: var(--primary-color);
  font-weight: 500;
}


.remove-name-btn {
  background: var(--error-light);
  color: var(--accent-red);
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.3s ease;
}

.remove-name-btn:hover {
  background: var(--accent-red);
  color: var(--white);
}

.add-purchase-option-btn {
  background: var(--secondary-color);
  color: var(--white);
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
}

.add-purchase-option-btn:hover {
  background: var(--primary-color);
}

.purchase-options-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.purchase-option-item {
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 1rem;
}

.purchase-option-item.confirmed {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.option-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

/* Delete Confirmation */
.delete-confirmation {
  padding: 2rem;
  text-align: center;
}

.delete-confirmation p {
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.warning-text {
  color: var(--accent-red);
  font-weight: 500;
  font-size: 0.9rem;
}

.confirmation-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.cancel-btn, .delete-confirm-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancel-btn {
  background: var(--primary-light);
  color: var(--primary-color);
}

.cancel-btn:hover {
  background: var(--secondary-light);
}

.delete-confirm-btn {
  background: #DC2626;
  color: var(--white);
}

.delete-confirm-btn:hover:not(:disabled) {
  background: #B91C1C;
}

.delete-confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .items-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .store-catalog-container {
    padding: 1rem;
  }
  
  .catalog-header h1 {
    font-size: 2rem;
  }
  
  .search-filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .items-grid {
    grid-template-columns: 1fr;
  }
  
  .item-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .item-actions {
    justify-content: flex-end;
  }
  
  .option-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .option-actions {
    justify-content: flex-start;
  }
  
  .modal-content {
    margin: 1rem;
    max-width: calc(100vw - 2rem);
  }
  
  .modal-header,
  .add-item-form,
  .add-purchase-option-form,
  .edit-purchase-option-form,
  .edit-item-content,
  .delete-confirmation {
    padding: 1.5rem;
  }
  
  .add-name-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .confirmation-actions {
    flex-direction: column;
  }
}
</style>

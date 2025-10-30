<template>
  <div class="menu-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading menu...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-message">
        <h3>Error</h3>
        <p>{{ error }}</p>
        <button @click="loadMenu" class="retry-btn">Retry</button>
      </div>
    </div>

    <!-- Menu Content -->
    <div v-else-if="menu" class="menu-content">
      <!-- Menu Header -->
      <div class="menu-header">
        <div class="menu-info">
          <div class="menu-title-section">
            <button @click="goBack" class="back-btn">← Back to Menus</button>
            <h1 class="menu-title">{{ menu.name }}</h1>
          </div>
          <div class="menu-meta">
            <span class="menu-date">{{ formatDate(menu.date) }}</span>
            <span class="menu-owner">Owner: {{ ownerUsername || menu.owner }}</span>
          </div>
        </div>
        
        <div class="menu-actions">
          <button 
            v-if="isOwner && !isEditing" 
            @click="enterEditMode" 
            class="edit-btn"
          >
            Edit Menu
          </button>
          <div v-if="isEditing" class="edit-actions">
            <button @click="saveChanges" class="save-btn" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
            <button @click="cancelEdit" class="cancel-btn">Cancel</button>
          </div>
        </div>
      </div>


      <!-- Menu Form (Edit Mode) -->
      <div v-if="isEditing" class="menu-form">
        <div class="form-group">
          <label for="menu-name">Menu Name</label>
          <input 
            id="menu-name"
            v-model="editForm.name" 
            type="text" 
            class="form-input"
            :class="{ 'error': formErrors.name }"
          />
          <span v-if="formErrors.name" class="error-message">{{ formErrors.name }}</span>
        </div>
        
        <div class="form-group">
          <label for="menu-date">Menu Date</label>
          <input 
            id="menu-date"
            v-model="editForm.date" 
            type="date" 
            class="form-input"
            :class="{ 'error': formErrors.date }"
          />
          <span v-if="formErrors.date" class="error-message">{{ formErrors.date }}</span>
        </div>
      </div>

      <!-- Recipes Section -->
      <div class="recipes-section">
        <div class="section-header">
          <h2>Recipes</h2>
          <button 
            v-if="isEditing" 
            @click="showAddRecipeModal = true" 
            class="add-recipe-btn"
          >
            Add Recipe
          </button>
        </div>

        <!-- Recipes List -->
        <div v-if="recipes.length > 0" class="recipes-list">
          <div 
            v-for="recipe in recipes" 
            :key="recipe.id" 
            class="recipe-card"
          >
            <div class="recipe-header">
              <div class="recipe-title-section">
                <h3 class="recipe-name">{{ recipe.name }}</h3>
                <div class="recipe-meta">
                  <span class="scaling-factor">Scaling: {{ recipe.scalingFactor }}x</span>
                  <span class="serving-quantity">{{ recipe.servingQuantity }} servings</span>
                  <span class="dish-type">{{ recipe.dishType }}</span>
                </div>
              </div>
              <div v-if="isEditing" class="recipe-actions">
                <button @click="editRecipe(recipe)" class="edit-recipe-btn">Edit</button>
                <button @click="changeScaling(recipe)" class="scaling-btn">Change Scaling</button>
                <button @click="removeRecipe(recipe)" class="remove-recipe-btn">Remove</button>
              </div>
            </div>

            <!-- Recipe Details -->
            <div class="recipe-details">
              <!-- Ingredients -->
              <div class="ingredients-section">
                <h4>Ingredients</h4>
                <ul class="ingredients-list">
                  <li 
                    v-for="ingredient in recipe.ingredients" 
                    :key="ingredient.name"
                    class="ingredient-item"
                  >
                    <span class="ingredient-quantity">{{ ingredient.quantity * recipe.scalingFactor }}</span>
                    <span class="ingredient-units">{{ ingredient.units }}</span>
                    <span class="ingredient-name">{{ ingredient.name }}</span>
                  </li>
                </ul>
              </div>

              <!-- Instructions -->
              <div v-if="recipe.instructions" class="instructions-section">
                <h4>Instructions</h4>
                <p class="instructions-text">{{ recipe.instructions }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <p>No recipes in this menu yet.</p>
          <button 
            v-if="isEditing" 
            @click="showAddRecipeModal = true" 
            class="add-first-recipe-btn"
          >
            Add Your First Recipe
          </button>
        </div>
      </div>
    </div>

    <!-- Add Recipe Modal -->
    <div v-if="showAddRecipeModal" class="modal-overlay" @click="closeAddRecipeModal">
      <div class="modal-content large-modal" @click.stop>
        <div class="modal-header">
          <h3>Add Recipe to Menu</h3>
          <button @click="closeAddRecipeModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="add-recipe-tabs">
            <button 
              @click="addRecipeMode = 'existing'" 
              :class="{ active: addRecipeMode === 'existing' }"
              class="tab-btn"
            >
              Use Existing Recipe
            </button>
            <button 
              @click="addRecipeMode = 'new'" 
              :class="{ active: addRecipeMode === 'new' }"
              class="tab-btn"
            >
              Create New Recipe
            </button>
          </div>

          <!-- Existing Recipe Selection -->
          <div v-if="addRecipeMode === 'existing'" class="existing-recipe-section">
            <div class="form-group">
              <label for="recipe-select">Select Recipe</label>
              <select 
                id="recipe-select"
                v-model="selectedRecipeId" 
                class="form-select"
              >
                <option value="">Choose a recipe...</option>
                <option 
                  v-for="recipe in availableRecipes" 
                  :key="recipe.id" 
                  :value="recipe.id"
                >
                  {{ recipe.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="scaling-factor">Scaling Factor</label>
              <input 
                id="scaling-factor"
                v-model.number="scalingFactor" 
                type="number" 
                step="0.1" 
                min="0.1"
                class="form-input"
              />
            </div>
          </div>

          <!-- New Recipe Creation -->
          <div v-if="addRecipeMode === 'new'" class="new-recipe-section">
            <div class="recipe-form-grid">
              <div class="form-group">
                <label for="new-recipe-name">Recipe Name</label>
                <input 
                  id="new-recipe-name"
                  v-model="newRecipe.name" 
                  type="text" 
                  class="form-input"
                  :class="{ 'error': newRecipeErrors.name }"
                />
                <span v-if="newRecipeErrors.name" class="error-message">{{ newRecipeErrors.name }}</span>
              </div>
              
              <div class="form-group">
                <label for="dish-type">Dish Type</label>
                <input 
                  id="dish-type"
                  v-model="newRecipe.dishType" 
                  type="text" 
                  class="form-input"
                  placeholder="e.g., Main Course, Dessert, Appetizer"
                />
              </div>
              
              <div class="form-group">
                <label for="serving-quantity">Serving Quantity</label>
                <input 
                  id="serving-quantity"
                  v-model.number="newRecipe.servingQuantity" 
                  type="number" 
                  min="1"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="scaling-factor-new">Scaling Factor</label>
                <input 
                  id="scaling-factor-new"
                  v-model.number="scalingFactor" 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  class="form-input"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="instructions">Instructions</label>
              <textarea 
                id="instructions"
                v-model="newRecipe.instructions" 
                class="form-textarea"
                rows="4"
                placeholder="Enter cooking instructions..."
              ></textarea>
            </div>

            <!-- Ingredients Management -->
            <div class="ingredients-management">
              <h4>Ingredients</h4>
              
              <!-- Initial Add Ingredient Button -->
              <div v-if="!showIngredientForm" class="add-ingredient-initial">
                <button @click="showIngredientForm = true" class="add-new-ingredient-btn">
                  + Add New Ingredient
                </button>
              </div>
              
              <!-- Ingredient Form -->
              <div v-if="showIngredientForm" class="add-ingredient-form">
                <input 
                  v-model="newIngredient.name" 
                  type="text" 
                  placeholder="Ingredient name"
                  class="form-input ingredient-name-input"
                />
                <input 
                  v-model.number="newIngredient.quantity" 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  placeholder="Quantity"
                  class="form-input ingredient-quantity-input"
                />
                <input 
                  v-model="newIngredient.units" 
                  type="text" 
                  placeholder="Units"
                  class="form-input ingredient-units-input"
                />
                <button 
                  @click="addIngredient" 
                  class="add-ingredient-btn"
                  :disabled="!newIngredient.name || !newIngredient.quantity || !newIngredient.units"
                >
                  Add Ingredient
                </button>
                <button @click="cancelAddIngredient" class="cancel-ingredient-btn">
                  Cancel
                </button>
              </div>
              
              <div v-if="newRecipe.ingredients.length > 0" class="ingredients-list">
                <div 
                  v-for="(ingredient, index) in newRecipe.ingredients" 
                  :key="index"
                  class="ingredient-item"
                >
                  <span class="ingredient-quantity">{{ ingredient.quantity }}</span>
                  <span class="ingredient-units">{{ ingredient.units }}</span>
                  <span class="ingredient-name">{{ ingredient.name }}</span>
                  <button @click="removeIngredient(index)" class="remove-ingredient-btn">&times;</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeAddRecipeModal" class="cancel-btn">Cancel</button>
          <button 
            @click="addRecipeToMenu" 
            class="add-btn"
            :disabled="isAddingRecipe"
          >
            {{ isAddingRecipe ? 'Adding...' : 'Add Recipe' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Recipe Modal -->
    <div v-if="showEditRecipeModal" class="modal-overlay" @click="closeEditRecipeModal">
      <div class="modal-content large-modal" @click.stop>
        <div class="modal-header">
          <h3>Edit Recipe: {{ editingRecipe?.name }}</h3>
          <button @click="closeEditRecipeModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="edit-recipe-name">Recipe Name</label>
            <input 
              id="edit-recipe-name"
              v-model="editRecipeForm.name" 
              type="text" 
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label for="edit-dish-type">Dish Type</label>
            <input 
              id="edit-dish-type"
              v-model="editRecipeForm.dishType" 
              type="text" 
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label for="edit-serving-quantity">Serving Quantity</label>
            <input 
              id="edit-serving-quantity"
              v-model.number="editRecipeForm.servingQuantity" 
              type="number" 
              min="1"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label for="edit-instructions">Instructions</label>
            <textarea 
              id="edit-instructions"
              v-model="editRecipeForm.instructions" 
              class="form-textarea"
              rows="4"
            ></textarea>
          </div>

          <!-- Edit Ingredients -->
          <div class="ingredients-management">
            <h4>Ingredients</h4>
            
            <!-- Initial Add Ingredient Button -->
            <div v-if="!showEditIngredientForm" class="add-ingredient-initial">
              <button @click="showEditIngredientForm = true" class="add-new-ingredient-btn">
                + Add New Ingredient
              </button>
            </div>
            
            <!-- Ingredient Form -->
            <div v-if="showEditIngredientForm" class="add-ingredient-form">
              <input 
                v-model="newIngredient.name" 
                type="text" 
                placeholder="Ingredient name"
                class="form-input ingredient-name-input"
              />
              <input 
                v-model.number="newIngredient.quantity" 
                type="number" 
                step="0.1" 
                min="0.1"
                placeholder="Quantity"
                class="form-input ingredient-quantity-input"
              />
              <input 
                v-model="newIngredient.units" 
                type="text" 
                placeholder="Units"
                class="form-input ingredient-units-input"
              />
              <button 
                @click="addIngredientToEdit" 
                class="add-ingredient-btn"
                :disabled="!newIngredient.name || !newIngredient.quantity || !newIngredient.units"
              >
                Add Ingredient
              </button>
              <button @click="cancelAddIngredientToEdit" class="cancel-ingredient-btn">
                Cancel
              </button>
            </div>
            
            <div v-if="editRecipeForm.ingredients.length > 0" class="ingredients-list">
              <div 
                v-for="(ingredient, index) in editRecipeForm.ingredients" 
                :key="index"
                class="ingredient-item"
              >
                <input 
                  v-model.number="ingredient.quantity" 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  class="form-input small-input"
                />
                <input 
                  v-model="ingredient.units" 
                  type="text" 
                  class="form-input small-input"
                />
                <input 
                  v-model="ingredient.name" 
                  type="text" 
                  class="form-input"
                />
                <button @click="removeIngredientFromEdit(index)" class="remove-ingredient-btn">&times;</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeEditRecipeModal" class="cancel-btn">Cancel</button>
          <button 
            @click="saveRecipeChanges" 
            class="save-btn"
            :disabled="isSavingRecipe"
          >
            {{ isSavingRecipe ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Scaling Factor Modal -->
    <div v-if="showScalingModal" class="modal-overlay" @click="closeScalingModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Change Scaling Factor</h3>
          <button @click="closeScalingModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="new-scaling-factor">New Scaling Factor</label>
            <input 
              id="new-scaling-factor"
              v-model.number="newScalingFactor" 
              type="number" 
              step="0.1" 
              min="0.1"
              class="form-input"
            />
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeScalingModal" class="cancel-btn">Cancel</button>
          <button 
            @click="updateScalingFactor" 
            class="save-btn"
            :disabled="isUpdatingScaling"
          >
            {{ isUpdatingScaling ? 'Updating...' : 'Update Scaling' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { cookBookService } from '../services/cookBookService.js'
import { authStore } from '../stores/authStore.js'
import { authService } from '../services/authService.js'
import { weeklyCartService } from '../services/weeklyCartService.js'

export default {
  name: 'MenuPage',
  props: {
    menuId: {
      type: String,
      required: true
    }
  },
  emits: ['back-to-menus'],
  setup(props, { emit }) {
    // Reactive state
    const isLoading = ref(false)
    const isSaving = ref(false)
    const isAddingRecipe = ref(false)
    const isSavingRecipe = ref(false)
    const isUpdatingScaling = ref(false)
    const error = ref(null)
    
    const menu = ref(null)
    const recipes = ref([])
    const availableRecipes = ref([])
    const ownerUsername = ref('')
    
    const isEditing = ref(false)
    const editForm = reactive({
      name: '',
      date: ''
    })
    const formErrors = reactive({})
    
    // Modal states
    const showAddRecipeModal = ref(false)
    const showEditRecipeModal = ref(false)
    const showScalingModal = ref(false)
    const addRecipeMode = ref('existing')
    const selectedRecipeId = ref('')
    const scalingFactor = ref(1)
    const newScalingFactor = ref(1)
    const editingRecipe = ref(null)
    const showIngredientForm = ref(false)
    const showEditIngredientForm = ref(false)
    
    // Recipe forms
    const newRecipe = reactive({
      name: '',
      dishType: '',
      servingQuantity: 1,
      instructions: '',
      ingredients: []
    })
    const newRecipeErrors = reactive({})
    const editRecipeForm = reactive({
      name: '',
      dishType: '',
      servingQuantity: 1,
      instructions: '',
      ingredients: []
    })
    const newIngredient = reactive({
      name: '',
      quantity: 1,
      units: ''
    })
    
    // Computed properties
    const currentUser = computed(() => authStore.user)
    const isOwner = computed(() => menu.value && currentUser.value && menu.value.owner === currentUser.value.id)
    
    // Methods
    const loadMenu = async () => {
      isLoading.value = true
      error.value = null
      
      try {
        // Load menu details
        const menuResponse = await menuCollectionService.getMenuDetails(props.menuId)
        if (menuResponse && menuResponse.length > 0) {
          menu.value = menuResponse[0]
          editForm.name = menu.value.name
          editForm.date = formatDateForInput(menu.value.date)
          
          // Load owner username
          if (menu.value.owner) {
            ownerUsername.value = await authService.getUsername(menu.value.owner)
          }
        }
        
        // Load recipes in menu
        const recipesResponse = await menuCollectionService.getRecipesInMenu(props.menuId)
        console.log('Recipes response:', recipesResponse)
        
        if (recipesResponse && recipesResponse.length > 0) {
          const menuRecipes = recipesResponse[0].menuRecipes || {}
          console.log('Menu recipes:', menuRecipes)
          
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
          
          recipes.value = await Promise.all(recipePromises)
        } else {
          recipes.value = []
        }
        
        // Load available recipes for adding
        if (currentUser.value) {
          const availableResponse = await cookBookService.getRecipesOwnedByUser(currentUser.value.id)
          if (availableResponse && availableResponse.length > 0) {
            availableRecipes.value = availableResponse.map(recipe => ({
              id: recipe.recipe,
              name: recipe.name
            }))
          }
        }
        
      } catch (err) {
        console.error('Error loading menu:', err)
        error.value = err.message || 'Failed to load menu'
      } finally {
        isLoading.value = false
      }
    }
    
    const enterEditMode = () => {
      isEditing.value = true
      editForm.name = menu.value.name
      // Ensure date is in YYYY-MM-DD format for HTML date input
      editForm.date = formatDateForInput(menu.value.date)
    }
    
    const cancelEdit = () => {
      isEditing.value = false
      editForm.name = menu.value.name
      editForm.date = formatDateForInput(menu.value.date)
      clearFormErrors()
    }
    
    const saveChanges = async () => {
      if (!validateMenuForm()) return
      
      isSaving.value = true
      
      try {
        const updates = {}
        
        // Check if name has changed
        if (editForm.name !== menu.value.name) {
          updates.name = editForm.name
        }
        
        // Check if date has changed - compare formatted dates
        const currentFormattedDate = formatDateForInput(menu.value.date)
        if (editForm.date !== currentFormattedDate) {
          // Convert date string to Date object for the API
          updates.date = new Date(editForm.date)
          console.log('Date change detected:', {
            original: menu.value.date,
            originalFormatted: currentFormattedDate,
            new: editForm.date,
            newAsDate: updates.date
          })
        }
        
        if (Object.keys(updates).length > 0) {
          console.log('Saving updates:', updates)
          await menuCollectionService.updateMenu(props.menuId, updates)
          
          // If date changed, re-sync Weekly Cart: remove from old, add to new
          if (updates.date) {
            try {
              await weeklyCartService.removeMenuFromCart(props.menuId)
            } catch (removeErr) {
              console.error('Warning: removing menu from previous cart failed (continuing):', removeErr)
            }
            try {
              await weeklyCartService.addMenuToCart(props.menuId, editForm.date)
            } catch (addErr) {
              console.error('Error syncing updated menu to Weekly Cart:', addErr)
            }
          }
          
          // Reload menu data to ensure we have the latest from the server
          await loadMenu()
        }
        
        isEditing.value = false
      } catch (err) {
        console.error('Error saving menu:', err)
        error.value = err.message || 'Failed to save menu changes'
      } finally {
        isSaving.value = false
      }
    }
    
    const validateMenuForm = () => {
      clearFormErrors()
      let isValid = true
      
      if (!editForm.name.trim()) {
        formErrors.name = 'Menu name is required'
        isValid = false
      }
      
      if (!editForm.date) {
        formErrors.date = 'Menu date is required'
        isValid = false
      }
      
      return isValid
    }
    
    const clearFormErrors = () => {
      Object.keys(formErrors).forEach(key => delete formErrors[key])
      Object.keys(newRecipeErrors).forEach(key => delete newRecipeErrors[key])
    }
    
    const addRecipeToMenu = async () => {
      if (addRecipeMode.value === 'existing') {
        if (!selectedRecipeId.value || !scalingFactor.value) {
          error.value = 'Please select a recipe and enter a scaling factor'
          return
        }
      } else {
        if (!validateNewRecipe()) return
      }
      
      isAddingRecipe.value = true
      
      try {
        let recipeId = selectedRecipeId.value
        
        if (addRecipeMode.value === 'new') {
          // Create new recipe
          const createResponse = await cookBookService.createRecipe(newRecipe.name, currentUser.value.id)
          recipeId = createResponse.recipe
          
          // Update recipe details
          const updates = {}
          if (newRecipe.dishType) updates.dishType = newRecipe.dishType
          if (newRecipe.servingQuantity) updates.servingQuantity = newRecipe.servingQuantity
          if (newRecipe.instructions) updates.instructions = newRecipe.instructions
          
          if (Object.keys(updates).length > 0) {
            await cookBookService.updateRecipe(recipeId, updates)
          }
          
          // Add ingredients
          for (const ingredient of newRecipe.ingredients) {
            await cookBookService.addRecipeIngredient(
              recipeId,
              ingredient.name,
              ingredient.quantity,
              ingredient.units
            )
          }
        }
        
        // Add recipe to menu
        await menuCollectionService.addRecipe(props.menuId, recipeId, scalingFactor.value)
        
        // Reload menu to show updated recipes
        await loadMenu()
        
        // Reset form and close modal
        resetAddRecipeForm()
        showAddRecipeModal.value = false
        
      } catch (err) {
        console.error('Error adding recipe:', err)
        error.value = err.message || 'Failed to add recipe to menu'
      } finally {
        isAddingRecipe.value = false
      }
    }
    
    const validateNewRecipe = () => {
      clearFormErrors()
      let isValid = true
      
      if (!newRecipe.name.trim()) {
        newRecipeErrors.name = 'Recipe name is required'
        isValid = false
      }
      
      return isValid
    }
    
    const resetAddRecipeForm = () => {
      selectedRecipeId.value = ''
      scalingFactor.value = 1
      newRecipe.name = ''
      newRecipe.dishType = ''
      newRecipe.servingQuantity = 1
      newRecipe.instructions = ''
      newRecipe.ingredients = []
      newIngredient.name = ''
      newIngredient.quantity = 1
      newIngredient.units = ''
      addRecipeMode.value = 'existing'
    }
    
    const addIngredient = () => {
      if (newIngredient.name && newIngredient.quantity && newIngredient.units) {
        newRecipe.ingredients.push({ ...newIngredient })
        newIngredient.name = ''
        newIngredient.quantity = 1
        newIngredient.units = ''
        showIngredientForm.value = false
      }
    }
    
    const cancelAddIngredient = () => {
      showIngredientForm.value = false
      newIngredient.name = ''
      newIngredient.quantity = 1
      newIngredient.units = ''
    }
    
    const removeIngredient = (index) => {
      newRecipe.ingredients.splice(index, 1)
    }
    
    const editRecipe = (recipe) => {
      editingRecipe.value = recipe
      editRecipeForm.name = recipe.name
      editRecipeForm.dishType = recipe.dishType
      editRecipeForm.servingQuantity = recipe.servingQuantity
      editRecipeForm.instructions = recipe.instructions
      editRecipeForm.ingredients = [...recipe.ingredients]
      showEditRecipeModal.value = true
    }
    
    const addIngredientToEdit = () => {
      if (newIngredient.name && newIngredient.quantity && newIngredient.units) {
        editRecipeForm.ingredients.push({ ...newIngredient })
        newIngredient.name = ''
        newIngredient.quantity = 1
        newIngredient.units = ''
        showEditIngredientForm.value = false
      }
    }
    
    const cancelAddIngredientToEdit = () => {
      showEditIngredientForm.value = false
      newIngredient.name = ''
      newIngredient.quantity = 1
      newIngredient.units = ''
    }
    
    const removeIngredientFromEdit = (index) => {
      editRecipeForm.ingredients.splice(index, 1)
    }
    
    const saveRecipeChanges = async () => {
      isSavingRecipe.value = true
      
      try {
        const recipeId = editingRecipe.value.id
        
        // Update recipe details
        const updates = {}
        if (editRecipeForm.name !== editingRecipe.value.name) updates.name = editRecipeForm.name
        if (editRecipeForm.dishType !== editingRecipe.value.dishType) updates.dishType = editRecipeForm.dishType
        if (editRecipeForm.servingQuantity !== editingRecipe.value.servingQuantity) updates.servingQuantity = editRecipeForm.servingQuantity
        if (editRecipeForm.instructions !== editingRecipe.value.instructions) updates.instructions = editRecipeForm.instructions
        
        if (Object.keys(updates).length > 0) {
          await cookBookService.updateRecipe(recipeId, updates)
        }
        
        // Update ingredients (simplified - remove all and re-add)
        // In a real app, you'd want to be more sophisticated about this
        const currentIngredients = editingRecipe.value.ingredients
        const newIngredients = editRecipeForm.ingredients
        
        // Remove ingredients that are no longer in the list
        for (const ingredient of currentIngredients) {
          if (!newIngredients.find(ing => ing.name === ingredient.name)) {
            await cookBookService.removeRecipeIngredient(recipeId, ingredient.name)
          }
        }
        
        // Add or update ingredients
        for (const ingredient of newIngredients) {
          const existingIngredient = currentIngredients.find(ing => ing.name === ingredient.name)
          if (existingIngredient) {
            if (existingIngredient.quantity !== ingredient.quantity || existingIngredient.units !== ingredient.units) {
              await cookBookService.updateRecipeIngredient(recipeId, ingredient.name, ingredient.quantity, ingredient.units)
            }
          } else {
            await cookBookService.addRecipeIngredient(recipeId, ingredient.name, ingredient.quantity, ingredient.units)
          }
        }
        
        // Reload menu to show updated recipes
        await loadMenu()
        
        showEditRecipeModal.value = false
        
      } catch (err) {
        console.error('Error saving recipe:', err)
        error.value = err.message || 'Failed to save recipe changes'
      } finally {
        isSavingRecipe.value = false
      }
    }
    
    const changeScaling = (recipe) => {
      editingRecipe.value = recipe
      newScalingFactor.value = recipe.scalingFactor
      showScalingModal.value = true
    }
    
    const updateScalingFactor = async () => {
      isUpdatingScaling.value = true
      
      try {
        await menuCollectionService.changeRecipeScaling(
          props.menuId,
          editingRecipe.value.id,
          newScalingFactor.value
        )
        
        // Reload menu to show updated scaling
        await loadMenu()
        
        showScalingModal.value = false
        
      } catch (err) {
        console.error('Error updating scaling:', err)
        error.value = err.message || 'Failed to update scaling factor'
      } finally {
        isUpdatingScaling.value = false
      }
    }
    
    const removeRecipe = async (recipe) => {
      if (!confirm(`Are you sure you want to remove "${recipe.name}" from this menu?`)) {
        return
      }
      
      try {
        await menuCollectionService.removeRecipe(props.menuId, recipe.id)
        await loadMenu()
      } catch (err) {
        console.error('Error removing recipe:', err)
        error.value = err.message || 'Failed to remove recipe from menu'
      }
    }
    
    const closeAddRecipeModal = () => {
      showAddRecipeModal.value = false
      resetAddRecipeForm()
    }
    
    const closeEditRecipeModal = () => {
      showEditRecipeModal.value = false
      editingRecipe.value = null
    }
    
    const closeScalingModal = () => {
      showScalingModal.value = false
      editingRecipe.value = null
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return ''
      
      try {
        // Normalize to UTC to avoid timezone shifts
        const date = dateString.includes('T')
          ? new Date(dateString)
          : new Date(`${dateString}T00:00:00Z`)

        const formatted = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        })
        
        // Debug logging to help verify the fix
        console.log(`Date formatting: "${dateString}" -> "${formatted}" (${date.toDateString()})`)
        
        return formatted
      } catch (error) {
        console.error('Error formatting date:', dateString, error)
        return dateString // Return original string if formatting fails
      }
    }
    
    const formatDateForInput = (dateString) => {
      if (!dateString) return ''
      
      try {
        // If it's already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          return dateString
        }
        // Normalize to UTC
        const date = dateString.includes('T')
          ? new Date(dateString)
          : new Date(`${dateString}T00:00:00Z`)

        // Format as YYYY-MM-DD in UTC for HTML date input
        const year = date.getUTCFullYear()
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
        const day = date.getUTCDate().toString().padStart(2, '0')
        const formatted = `${year}-${month}-${day}`
        
        console.log(`Date input formatting: "${dateString}" -> "${formatted}"`)
        
        return formatted
      } catch (error) {
        console.error('Error formatting date for input:', dateString, error)
        return dateString // Return original string if formatting fails
      }
    }
    
    const goBack = () => {
      emit('back-to-menus')
    }
    
    // Lifecycle
    onMounted(() => {
      loadMenu()
    })
    
    // Watch for menuId changes
    watch(() => props.menuId, () => {
      if (props.menuId) {
        loadMenu()
      }
    })
    
    return {
      // State
      isLoading,
      isSaving,
      isAddingRecipe,
      isSavingRecipe,
      isUpdatingScaling,
      error,
      menu,
      recipes,
      availableRecipes,
      ownerUsername,
      isEditing,
      editForm,
      formErrors,
      showAddRecipeModal,
      showEditRecipeModal,
      showScalingModal,
      addRecipeMode,
      selectedRecipeId,
      scalingFactor,
      newScalingFactor,
      editingRecipe,
      newRecipe,
      newRecipeErrors,
      editRecipeForm,
      newIngredient,
      currentUser,
      isOwner,
      
      // Methods
      loadMenu,
      enterEditMode,
      cancelEdit,
      saveChanges,
      addRecipeToMenu,
      addIngredient,
      cancelAddIngredient,
      removeIngredient,
      editRecipe,
      addIngredientToEdit,
      cancelAddIngredientToEdit,
      removeIngredientFromEdit,
      saveRecipeChanges,
      changeScaling,
      updateScalingFactor,
      removeRecipe,
      closeAddRecipeModal,
      closeEditRecipeModal,
      closeScalingModal,
      formatDate,
      goBack
    }
  }
}
</script>

<style scoped>
.menu-page {
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

/* Menu Header */
.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--primary-light);
}

.menu-title-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.back-btn {
  background: none;
  border: none;
  color: var(--secondary-color);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem 0;
  text-align: left;
  transition: color 0.3s ease;
  align-self: flex-start;
}

.back-btn:hover {
  color: var(--primary-color);
}

.menu-info h1 {
  color: var(--primary-color);
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
}

.menu-meta {
  display: flex;
  gap: 2rem;
  color: var(--secondary-color);
  font-size: 1.1rem;
}

.menu-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.edit-btn, .save-btn, .cancel-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.edit-btn {
  background: var(--primary-color);
  color: white;
}

.edit-btn:hover {
  background: var(--secondary-color);
}

.save-btn {
  background: #87CEEB;
  color: #2c3e50;
  font-size: 1.1rem;
  padding: 1rem 2rem;
  font-weight: 600;
  border: 2px solid #5DADE2;
  box-shadow: 0 4px 8px rgba(135, 206, 235, 0.3);
}

.save-btn:hover:not(:disabled) {
  background: #5DADE2;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(135, 206, 235, 0.4);
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cancel-btn {
  background: #FFB6C1;
  color: #8B0000;
  font-size: 1.1rem;
  padding: 1rem 2rem;
  font-weight: 600;
  border: 2px solid #FF69B4;
  box-shadow: 0 4px 8px rgba(255, 182, 193, 0.3);
}

.cancel-btn:hover {
  background: #FF69B4;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(255, 182, 193, 0.4);
}

/* Edit Mode Indicator */
.edit-mode-indicator {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #856404;
}

.edit-icon {
  font-size: 1.2rem;
}

/* Menu Form */
.menu-form {
  background: var(--primary-light);
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.recipe-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group label {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

.form-input, .form-select, .form-textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.form-input.error {
  border-color: #dc3545;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

/* Recipes Section */
.recipes-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  color: var(--primary-color);
  margin: 0;
  font-size: 2rem;
}

.add-recipe-btn, .add-first-recipe-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-recipe-btn:hover, .add-first-recipe-btn:hover {
  background: var(--secondary-color);
}

/* Recipe Cards */
.recipes-list {
  display: grid;
  gap: 2rem;
}

.recipe-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.recipe-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.recipe-title-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
}

.recipe-title-section .recipe-meta {
  justify-content: flex-start;
}

.recipe-name {
  color: var(--primary-color);
  margin: 0;
  font-size: 1.5rem;
  flex: 1;
  min-width: 200px;
}

.recipe-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.recipe-meta span {
  background: var(--primary-light);
  color: var(--primary-color);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.recipe-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.edit-recipe-btn, .scaling-btn, .remove-recipe-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.edit-recipe-btn {
  background: #002395;
  color: white;
  border: 1px solid #001f7a;
}

.scaling-btn {
  background: #ffffff;
  color: #333333;
  border: 1px solid #cccccc;
}

.remove-recipe-btn {
  background: #ed2939;
  color: white;
  border: 1px solid #d21e2e;
}

.edit-recipe-btn:hover {
  background: #001f7a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 35, 149, 0.3);
}

.scaling-btn:hover {
  background: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.remove-recipe-btn:hover {
  background: #d21e2e;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(237, 41, 57, 0.3);
}

/* Recipe Details */
.recipe-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.ingredients-section h4, .instructions-section h4 {
  color: var(--secondary-color);
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
}

.ingredients-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ingredient-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.ingredient-item:last-child {
  border-bottom: none;
}

.ingredient-quantity {
  font-weight: 600;
  color: var(--primary-color);
  min-width: 60px;
}

.ingredient-units {
  color: var(--secondary-color);
  min-width: 40px;
}

.ingredient-name {
  flex: 1;
}

.instructions-text {
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.empty-state p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

/* Modals */
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
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.large-modal {
  max-width: 1000px;
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

.add-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-btn:hover:not(:disabled) {
  background: var(--secondary-color);
}

.add-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* Tabs */
.add-recipe-tabs {
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
}

.tab-btn {
  background: none;
  border: none;
  padding: 1rem 2rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
  color: #666;
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-btn:hover {
  color: var(--primary-color);
}

/* Ingredients Management */
.ingredients-management {
  margin-top: 2rem;
}

.ingredients-management h4 {
  color: var(--primary-color);
  margin: 0 0 1rem 0;
}

.add-ingredient-initial {
  margin-bottom: 1rem;
}

.add-new-ingredient-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(23, 162, 184, 0.3);
}

.add-new-ingredient-btn:hover {
  background: #138496;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(23, 162, 184, 0.4);
}

.add-ingredient-form {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto auto;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: end;
}

.ingredient-name-input {
  grid-column: 1;
}

.ingredient-quantity-input {
  grid-column: 2;
}

.ingredient-units-input {
  grid-column: 3;
}

.add-ingredient-btn {
  grid-column: 4;
  background: #17a2b8;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(23, 162, 184, 0.3);
}

.add-ingredient-btn:hover:not(:disabled) {
  background: #138496;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(23, 162, 184, 0.4);
}

.add-ingredient-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.6;
}

.cancel-ingredient-btn {
  grid-column: 5;
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  transition: all 0.3s ease;
}

.cancel-ingredient-btn:hover {
  background: #5a6268;
}

.remove-ingredient-btn {
  background: #dc3545;
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.remove-ingredient-btn:hover {
  background: #c82333;
}

.small-input {
  padding: 0.5rem;
  font-size: 0.9rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .menu-page {
    padding: 1rem;
  }
  
  .menu-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .menu-form {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .recipe-details {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .recipe-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .recipe-title-section {
    margin-bottom: 1rem;
  }
  
  .recipe-title-section .recipe-meta {
    justify-content: flex-start;
  }
  
  .recipe-actions {
    justify-content: stretch;
  }
  
  .recipe-actions button {
    flex: 1;
  }
  
  .add-ingredient-form {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .ingredient-name-input,
  .ingredient-quantity-input,
  .ingredient-units-input {
    grid-column: 1;
  }
  
  .add-ingredient-btn {
    grid-column: 1;
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
  
  .recipe-form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>

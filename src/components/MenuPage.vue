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
        <button @click="retryLoadMenu" class="retry-btn">Retry</button>
      </div>
    </div>

    <!-- Fallback: No menu data available -->
    <div v-else-if="!menu && !isLoading" class="error-container">
      <div class="error-message">
        <h3>Menu Not Found</h3>
        <p>Unable to load menu data. Please try again.</p>
        <button @click="retryLoadMenu" class="retry-btn">Retry</button>
      </div>
    </div>

    <!-- Menu Content -->
    <div v-else-if="menu" class="menu-content">
      <!-- Menu Header -->
      <div class="menu-header">
        <button @click="goBack" class="back-btn">← Back to Menus</button>
        <div class="menu-title-row">
          <h1 class="menu-title">{{ menu.name }}</h1>
          <div class="menu-actions">
            <button 
              v-if="canEditMenu && !isEditing" 
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
              <button @click="deleteMenu" class="delete-btn" :disabled="isSaving">Delete Menu</button>
            </div>
          </div>
        </div>
        <div class="menu-meta">
          <span class="menu-date">{{ formatDate(menu.date) }}</span>
          <span class="menu-owner">Owner: {{ ownerUsername || menu.owner }}</span>
          <span class="menu-cost" v-if="menuCost !== null || menuCostLoading">
            <span v-if="menuCostLoading">Loading cost...</span>
            <span v-else-if="menuCost !== null" class="menu-cost-with-tooltip">
              Cost: {{ formatCost(menuCost) }}
              <span class="tooltip-container">
                <span class="tooltip-icon">?</span>
                <span class="tooltip-text">Recipe base costs are calculated with a scaling factor of 1 and is independent of any Menu/WeeklyCart that the recipe is in. Therefore, the summation of recipe costs will most likely not reflect the cost of the menu.</span>
              </span>
            </span>
            <span v-else-if="menuCostError">Cost unavailable</span>
          </span>
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
            v-if="canEditRecipes" 
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
                <div class="recipe-title-row">
                  <button
                    type="button"
                    class="recipe-toggle-btn"
                    :aria-expanded="isRecipeExpanded(recipe.id)"
                    :aria-controls="`recipe-details-${recipe.id}`"
                    @click="toggleRecipeExpanded(recipe.id)"
                  >
                    <svg
                      class="recipe-toggle-icon"
                      :class="{ 'is-expanded': isRecipeExpanded(recipe.id) }"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="sr-only">Toggle recipe details</span>
                  </button>
                  <h3 class="recipe-name">{{ recipe.name }}</h3>
                </div>
                <div class="recipe-meta">
                  <span class="scaling-factor">Scaling: {{ recipe.scalingFactor }}x</span>
                  <span class="serving-quantity">{{ recipe.servingQuantity }} servings</span>
                  <span v-if="recipe.dishType" class="dish-type">{{ recipe.dishType }}</span>
                  <span class="recipe-cost" v-if="recipeCosts[recipe.id] !== undefined || recipeCostsLoading[recipe.id]">
                    <span v-if="recipeCostsLoading[recipe.id]">Loading cost...</span>
                    <span v-else-if="recipeCosts[recipe.id] !== null">Base Cost: {{ formatCost(recipeCosts[recipe.id]) }}</span>
                    <span v-else>Cost unavailable</span>
                  </span>
                </div>
              </div>
              <div v-if="canEditRecipes" class="recipe-actions">
                <button 
                  v-if="!isRecipeShowingActions(recipe.id)"
                  @click="toggleRecipeActions(recipe.id)" 
                  class="edit-recipe-btn"
                >
                  Edit Recipe
                </button>
                <div v-else class="recipe-action-buttons">
                  <button @click="editRecipe(recipe)" class="edit-recipe-btn">Edit</button>
                  <button @click="changeScaling(recipe)" class="scaling-btn">Change Scaling</button>
                  <button @click="removeRecipe(recipe)" class="remove-recipe-btn">Remove</button>
                  <button @click="toggleRecipeActions(recipe.id)" class="cancel-edit-btn">Cancel</button>
                </div>
              </div>
            </div>

            <!-- Recipe Details -->
            <div
              class="recipe-details"
              :id="`recipe-details-${recipe.id}`"
              v-show="isRecipeExpanded(recipe.id)"
            >
              <!-- Ingredients -->
              <div class="ingredients-section">
                <h4>Ingredients</h4>
                <ul class="ingredients-list">
                  <li 
                    v-for="ingredient in recipe.ingredients" 
                    :key="ingredient.name"
                    class="ingredient-item"
                  >
                    <span class="ingredient-name">{{ ingredient.name }}</span>
                    <span class="ingredient-quantity">{{ ingredient.quantity }}</span>
                    <span class="ingredient-units">{{ ingredient.units }}</span>
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
            v-if="canEditRecipes" 
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
        <div class="modal-header add-recipe-header">
          <div class="add-recipe-header-main">
            <h3 class="add-recipe-title">Add Recipe to Menu</h3>
            <div class="add-recipe-header-tabs prominent-tabs">
              <button 
                @click="addRecipeMode = 'new'" 
                :class="{ active: addRecipeMode === 'new' }"
                class="tab-btn prominent"
              >
                Create New Recipe
              </button>
              <button 
                @click="addRecipeMode = 'existing'" 
                :class="{ active: addRecipeMode === 'existing' }"
                class="tab-btn prominent"
              >
                Use Existing Recipe
              </button>
            </div>
          </div>
          <button @click="closeAddRecipeModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          

          <!-- Existing Recipe Selection -->
          <div v-if="addRecipeMode === 'existing'" class="existing-recipe-section">
            <div class="form-group">
              <label for="recipe-select">Select Recipe</label>
              <select 
                id="recipe-select"
                v-model="selectedRecipeId" 
                class="form-select modern-select"
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
            
            <p class="recipe-reuse-info-note">Reusing a recipe is a direct copy, therefore, if you modify the recipe in this menu it will modify it in every other menu this recipe is used (including cost calculations). In most cases this shouldn't matter, but should be kept in mind when planning menus.</p>
            
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
            
            <p class="scaling-summary" v-if="scalingFactor && scalingFactor > 0">
              When a Scaling Factor of X is applied, the Menu will calculate ingredient purchases by multiplying each ingredient quantity specified in the recipe by X. For example, with a Scaling Factor of 3, the Menu will purchase enough ingredients to cover 3 times the recipe's base serving requirements. The scaling factor directly affects the total cost calculations for this menu.
            </p>
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
            
            <div class="instructions-ingredients-grid">
              <div class="form-group">
                <label for="instructions">Instructions</label>
                <textarea 
                  id="instructions"
                  v-model="newRecipe.instructions" 
                  class="form-textarea"
                  rows="12"
                  placeholder="Enter cooking instructions..."
                ></textarea>
              </div>

              <!-- Ingredients Management -->
              <div class="ingredients-management">
                <h4>Ingredients</h4>
                
                <!-- Initial Add Ingredient Button -->
                <div v-if="!showIngredientForm" class="add-ingredient-initial">
                  <button type="button" @click="openAddIngredientForm" class="add-new-ingredient-btn neutral">
                    + Add New Ingredient
                  </button>
                </div>
                
                <!-- Ingredient Form -->
                <div v-if="showIngredientForm" class="add-ingredient-form">
                  <div class="ingredient-search-container" style="position: relative;">
                    <input 
                      ref="ingredientSearchInputRef"
                      v-model="ingredientSearchQuery" 
                      type="text" 
                      placeholder="Search ingredient catalog..."
                      class="form-input ingredient-name-input"
                      @input="handleIngredientSearchInput"
                      @focus="showIngredientDropdown = true"
                      @blur="handleIngredientSearchBlur"
                    />
                    <div v-if="showIngredientDropdown && filteredCatalogItems.length > 0" class="ingredient-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <div 
                        v-for="item in filteredCatalogItems" 
                        :key="item.id"
                        @mousedown.prevent="selectCatalogItem(item)"
                        class="ingredient-dropdown-item"
                        style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;"
                        @mouseenter="$event.target.style.backgroundColor = '#f0f0f0'"
                        @mouseleave="$event.target.style.backgroundColor = 'white'"
                      >
                        {{ item.name }}
                      </div>
                    </div>
                    <div v-if="showIngredientDropdown && ingredientSearchQuery && filteredCatalogItems.length === 0 && catalogState.isLoaded" class="ingredient-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 12px; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      No ingredients found
                    </div>
                  </div>
                  <input 
                    v-model.number="newIngredient.quantity" 
                    type="number" 
                    step="0.1" 
                    min="0.1"
                    placeholder="Quantity"
                    class="form-input ingredient-quantity-input"
                  />
                  <select 
                    v-model="newIngredient.units"
                    class="form-select ingredient-units-input modern-select"
                    :disabled="!selectedCatalogItem || availableUnits.length === 0"
                  >
                    <option value="">
                      {{
                        availableUnits.length === 0 && selectedCatalogItem
                          ? 'No units available'
                          : availableUnitsHeaderLabel
                      }}
                    </option>
                    <option
                      v-for="u in availableUnits"
                      :key="u"
                      :value="u"
                    >
                      {{ u }}
                    </option>
                  </select>
                <button 
                  type="button"
                  @click="addIngredient" 
                  class="add-ingredient-btn add-ingredient-primary"
                  :disabled="!selectedCatalogItem || newIngredient.quantity <= 0 || !newIngredient.units?.trim()"
                >
                  Add
                </button>
                  <button type="button" @click="cancelAddIngredient" class="cancel-ingredient-btn add-ingredient-danger">
                    Cancel
                  </button>
                </div>
                
                <div v-if="newRecipe.ingredients.length > 0" class="ingredients-list">
                  <div 
                    v-for="(ingredient, index) in newRecipe.ingredients" 
                    :key="index"
                    class="ingredient-item"
                  >
                    <span class="ingredient-name">{{ ingredient.name }}</span>
                    <span class="ingredient-quantity">{{ ingredient.quantity }}</span>
                    <span class="ingredient-units">{{ ingredient.units }}</span>
                    <button @click="removeIngredient(index)" class="remove-ingredient-btn">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer add-recipe-footer">
          <button 
            @click="addRecipeToMenu" 
            class="add-btn"
            :disabled="isAddingRecipe"
          >
            {{ isAddingRecipe ? 'Adding...' : 'Add Recipe' }}
          </button>
          <button @click="closeAddRecipeModal" class="cancel-btn">Cancel</button>
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
          
          <div class="instructions-ingredients-grid">
            <div class="form-group">
              <label for="edit-instructions">Instructions</label>
              <textarea 
                id="edit-instructions"
                v-model="editRecipeForm.instructions" 
                class="form-textarea"
                rows="12"
              ></textarea>
            </div>

            <!-- Edit Ingredients -->
            <div class="ingredients-management">
              <h4>Ingredients</h4>
              
              <!-- Initial Add Ingredient Button -->
              <div v-if="!showEditIngredientForm && editingIngredientIndex === null" class="add-ingredient-initial">
                <button type="button" @click="openEditIngredientForm" class="add-new-ingredient-btn neutral">
                  + Add New Ingredient
                </button>
              </div>
              
              <!-- Add New Ingredient Form -->
                <div v-if="showEditIngredientForm && editingIngredientIndex === null" class="add-ingredient-form">
                  <div class="ingredient-search-container" style="position: relative;">
                    <input 
                      ref="editIngredientSearchInputRef"
                      v-model="ingredientSearchQuery" 
                      type="text" 
                      placeholder="Search ingredient catalog..."
                      class="form-input ingredient-name-input"
                      @input="handleIngredientSearchInput"
                      @focus="showIngredientDropdown = true"
                      @blur="handleIngredientSearchBlur"
                    />
                    <div v-if="showIngredientDropdown && filteredCatalogItems.length > 0" class="ingredient-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <div 
                        v-for="item in filteredCatalogItems" 
                        :key="item.id"
                        @mousedown.prevent="selectCatalogItem(item)"
                        class="ingredient-dropdown-item"
                        style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;"
                        @mouseenter="$event.target.style.backgroundColor = '#f0f0f0'"
                        @mouseleave="$event.target.style.backgroundColor = 'white'"
                      >
                        {{ item.name }}
                      </div>
                    </div>
                    <div v-if="showIngredientDropdown && ingredientSearchQuery && filteredCatalogItems.length === 0 && catalogState.isLoaded" class="ingredient-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 12px; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      No ingredients found
                    </div>
                  </div>
                <input 
                  v-model.number="newIngredient.quantity" 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  placeholder="Quantity"
                  class="form-input ingredient-quantity-input"
                />
                <select 
                  v-model="newIngredient.units"
                  class="form-select ingredient-units-input modern-select"
                  :disabled="!selectedCatalogItem || availableUnits.length === 0"
                >
                  <option value="">
                    {{
                      availableUnits.length === 0 && selectedCatalogItem
                        ? 'No units available'
                        : availableUnitsHeaderLabel
                    }}
                  </option>
                  <option
                    v-for="u in availableUnits"
                    :key="u"
                    :value="u"
                  >
                    {{ u }}
                  </option>
                </select>
                <button 
                  type="button"
                  @click="addIngredientToEdit" 
                  class="add-ingredient-btn add-ingredient-primary"
                  :disabled="!selectedCatalogItem || newIngredient.quantity <= 0 || !newIngredient.units?.trim()"
                >
                  Add
                </button>
                <button type="button" @click="cancelAddIngredientToEdit" class="cancel-ingredient-btn add-ingredient-danger">
                  Cancel
                </button>
              </div>
              
              <div v-if="editRecipeForm.ingredients.length > 0" class="ingredients-list">
                <div 
                  v-for="(ingredient, index) in editRecipeForm.ingredients" 
                  :key="index"
                  class="ingredient-item"
                >
                  <!-- Read-only display when not editing this ingredient -->
                  <template v-if="editingIngredientIndex !== index">
                    <span class="ingredient-name">{{ ingredient.name }}</span>
                    <span class="ingredient-quantity">{{ ingredient.quantity }}</span>
                    <span class="ingredient-units">{{ ingredient.units }}</span>
                    <button @click="startEditIngredient(index)" class="edit-ingredient-btn">Edit</button>
                    <button @click="removeIngredientFromEdit(index)" class="remove-ingredient-btn">Remove</button>
                  </template>
                  
                  <!-- Edit form when editing this ingredient -->
                  <div v-if="editingIngredientIndex === index" class="add-ingredient-form">
                    <div class="ingredient-search-container" style="position: relative;">
                      <input 
                        ref="editIngredientSearchInputRef"
                        v-model="ingredientSearchQuery" 
                        type="text" 
                        placeholder="Search ingredient catalog..."
                        class="form-input ingredient-name-input"
                        @input="handleIngredientSearchInput"
                        @focus="showIngredientDropdown = true"
                        @blur="handleIngredientSearchBlur"
                      />
                      <div v-if="showIngredientDropdown && filteredCatalogItems.length > 0" class="ingredient-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div 
                          v-for="item in filteredCatalogItems" 
                          :key="item.id"
                          @mousedown.prevent="selectCatalogItem(item)"
                          class="ingredient-dropdown-item"
                          style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;"
                          @mouseenter="$event.target.style.backgroundColor = '#f0f0f0'"
                          @mouseleave="$event.target.style.backgroundColor = 'white'"
                        >
                          {{ item.name }}
                        </div>
                      </div>
                      <div v-if="showIngredientDropdown && ingredientSearchQuery && filteredCatalogItems.length === 0 && catalogState.isLoaded" class="ingredient-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 12px; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        No ingredients found
                      </div>
                    </div>
                <input 
                      v-model.number="newIngredient.quantity" 
                      type="number" 
                      step="0.1" 
                      min="0.1"
                      placeholder="Quantity"
                      class="form-input ingredient-quantity-input"
                    />
                <select 
                  v-model="newIngredient.units" 
                  class="form-select ingredient-units-input modern-select"
                  :disabled="!selectedCatalogItem || availableUnits.length === 0"
                >
                  <option value="">
                    {{
                      availableUnits.length === 0 && selectedCatalogItem
                        ? 'No units available'
                        : availableUnitsHeaderLabel
                    }}
                  </option>
                  <option
                    v-for="u in availableUnits"
                    :key="u"
                    :value="u"
                  >
                    {{ u }}
                  </option>
                </select>
                    <button 
                      type="button"
                      @click="saveEditedIngredient" 
                      class="add-ingredient-btn add-ingredient-primary"
                      :disabled="!selectedCatalogItem || newIngredient.quantity <= 0 || !newIngredient.units?.trim()"
                    >
                      Save
                    </button>
                    <button type="button" @click="cancelEditIngredient" class="cancel-ingredient-btn add-ingredient-danger">
                      Cancel
                    </button>
                  </div>
                </div>
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
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { menuCollectionService } from '../services/menuCollectionService.js'
import { cookBookService } from '../services/cookBookService.js'
import { authStore } from '../stores/authStore.js'
import { authService } from '../services/authService.js'
import { weeklyCartService } from '../services/weeklyCartService.js'
import { weeklyCartStore } from '../stores/weeklyCartStore.js'
import { menuDetailStore, menuDetailState } from '../stores/menuDetailStore.js'
import { catalogStore, catalogState } from '../stores/catalogStore.js'
import { fetchMenuCost, fetchRecipeCost, formatCost } from '../utils/costUtils.js'
import { ALLOWED_UNITS_BY_CATEGORY, getUnitCategory } from '../constants/storeCatalogConstants.js'

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
    console.log(`[MenuPage] ========== setup() CALLED ==========`)
    console.log(`[MenuPage] setup - menuId prop: ${props.menuId}`)
    console.log(`[MenuPage] setup - menuDetailState.menus keys: [${Object.keys(menuDetailState.menus).join(', ')}]`)
    console.log(`[MenuPage] setup - menuDetailState.menus[${props.menuId}] exists: ${!!menuDetailState.menus[props.menuId]}`)
    
    // Local refs for menu data - updated by watchers for reliable reactivity
    const menu = ref(null)
    const recipes = ref([])
    const ownerUsername = ref('')
    
    console.log(`[MenuPage] setup - Initialized local refs:`, {
      menu: menu.value,
      recipesCount: recipes.value.length,
      ownerUsername: ownerUsername.value
    })
    
    // Use menu detail store reactive state for loading and error
    const isLoading = computed(() => {
      const result = menuDetailState.loading[props.menuId] || false
      console.log(`[MenuPage] isLoading computed - menuId: ${props.menuId}, returning: ${result}, state.loading[${props.menuId}]: ${menuDetailState.loading[props.menuId]}`)
      return result
    })
    const isSaving = ref(false)
    const isAddingRecipe = ref(false)
    const isSavingRecipe = ref(false)
    const isUpdatingScaling = ref(false)
    const error = computed(() => {
      const result = menuDetailState.errors[props.menuId] || null
      console.log(`[MenuPage] error computed - menuId: ${props.menuId}, returning: ${result}, state.errors[${props.menuId}]: ${menuDetailState.errors[props.menuId]}`)
      return result
    })
    
    // Cost state
    const menuCost = ref(null)
    const menuCostLoading = ref(false)
    const menuCostError = ref(null)
    const recipeCosts = ref({}) // recipeId -> cost
    const recipeCostsLoading = ref({}) // recipeId -> boolean
    
    const availableRecipes = ref([])
    
    // Function to update local refs from store
    // Always syncs from store state, ensuring reactive updates
    const updateMenuData = () => {
      console.log(`[MenuPage] updateMenuData ENTRY - menuId: ${props.menuId}`)
      console.log(`[MenuPage] updateMenuData - Accessing menuDetailState.menus[${props.menuId}]`)
      console.log(`[MenuPage] updateMenuData - menuDetailState.menus keys: [${Object.keys(menuDetailState.menus).join(', ')}]`)
      const menuData = menuDetailState.menus[props.menuId]
      console.log(`[MenuPage] updateMenuData - menuData exists: ${!!menuData}`)
      console.log(`[MenuPage] updateMenuData - menuData:`, menuData)
      
      if (menuData) {
        console.log(`[MenuPage] updateMenuData - menuData.menuDetails exists: ${!!menuData.menuDetails}`)
        console.log(`[MenuPage] updateMenuData - menuData.recipes is array: ${Array.isArray(menuData.recipes)}`)
        console.log(`[MenuPage] updateMenuData - menuData.ownerUsername: ${menuData.ownerUsername}`)
      }
      
      if (menuData && menuData.menuDetails) {
        console.log('[MenuPage] Updating menu data from store for menuId:', props.menuId)
        console.log('[MenuPage] updateMenuData - Before assignment, local refs:', {
          menu: menu.value ? 'exists' : 'null',
          recipesCount: recipes.value.length,
          ownerUsername: ownerUsername.value
        })
        menu.value = menuData.menuDetails
        recipes.value = Array.isArray(menuData.recipes) ? menuData.recipes : []
        ownerUsername.value = menuData.ownerUsername || ''
        console.log('[MenuPage] Menu data updated:', { 
          menu: menu.value ? 'exists' : 'null', 
          menuName: menu.value?.name,
          recipesCount: recipes.value.length, 
          ownerUsername: ownerUsername.value 
        })
        console.log('[MenuPage] updateMenuData - After assignment, local refs:', {
          menu: menu.value ? 'exists' : 'null',
          menuName: menu.value?.name,
          recipesCount: recipes.value.length,
          ownerUsername: ownerUsername.value
        })
      } else {
        console.log('[MenuPage] No menu data in store for menuId:', props.menuId)
        console.log('[MenuPage] updateMenuData - Checking if should clear local refs')
        console.log('[MenuPage] updateMenuData - isLoading:', isLoading.value)
        
        // Only clear menu if we're certain it doesn't exist and we're not loading
        // This prevents clearing menu during initial load or when data might be loading
        if (!isLoading.value) {
          console.log('[MenuPage] updateMenuData - Clearing local refs (not loading)')
          menu.value = null
          recipes.value = []
          ownerUsername.value = ''
          console.log('[MenuPage] updateMenuData - After clearing, local refs:', {
            menu: menu.value,
            recipesCount: recipes.value.length,
            ownerUsername: ownerUsername.value
          })
        } else {
          console.log('[MenuPage] updateMenuData - Skipping clear (menu is loading)')
        }
      }
      console.log(`[MenuPage] updateMenuData EXIT - menuId: ${props.menuId}`)
    }
    
    // Date formatting helper functions
    // Must be defined before watchers that use them (especially with immediate: true)
    const formatDate = (dateValue) => {
      if (!dateValue) return ''
      
      try {
        const normalized = dateValue instanceof Date
          ? dateValue.toISOString()
          : dateValue
        // Normalize to UTC to avoid timezone shifts
        const date = normalized.includes('T')
          ? new Date(normalized)
          : new Date(`${normalized}T00:00:00Z`)

        const formatted = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        })
        
        // Debug logging to help verify the fix
        console.log(`Date formatting: "${normalized}" -> "${formatted}" (${date.toDateString()})`)
        
        return formatted
      } catch (error) {
        console.error('Error formatting date:', dateValue, error)
        return dateValue // Return original value if formatting fails
      }
    }
    
    const formatDateForInput = (dateValue) => {
      if (!dateValue) return ''
      
      try {
        const normalized = dateValue instanceof Date
          ? dateValue.toISOString()
          : dateValue
        // If it's already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
          return normalized
        }
        // Normalize to UTC
        const date = normalized.includes('T')
          ? new Date(normalized)
          : new Date(`${normalized}T00:00:00Z`)

        // Format as YYYY-MM-DD in UTC for HTML date input
        const year = date.getUTCFullYear()
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
        const day = date.getUTCDate().toString().padStart(2, '0')
        const formatted = `${year}-${month}-${day}`
        
        console.log(`Date input formatting: "${normalized}" -> "${formatted}"`)
        
        return formatted
      } catch (error) {
        console.error('Error formatting date for input:', dateValue, error)
        return dateValue // Return original value if formatting fails
      }
    }

    const normalizeMenuDateToYmd = (value) => {
      if (!value) return ''
      try {
        if (value instanceof Date) {
          return value.toISOString().split('T')[0]
        }
        if (typeof value === 'string') {
          if (value.includes('T')) {
            return new Date(value).toISOString().split('T')[0]
          }
          return value
        }
        return ''
      } catch (error) {
        console.error('Error normalizing menu date:', value, error)
        return ''
      }
    }
    
    // Watch for menu data changes - simpler approach
    // Watch the menus object and loading state separately for better reactivity
    watch(
      () => menuDetailState.menus[props.menuId],
      (menuData, oldMenuData) => {
        console.log('[MenuPage] ========== Menu data watcher TRIGGERED ==========')
        console.log('[MenuPage] Menu data watcher - menuId:', props.menuId)
        console.log('[MenuPage] Menu data watcher - menuData exists:', !!menuData)
        console.log('[MenuPage] Menu data watcher - oldMenuData exists:', !!oldMenuData)
        console.log('[MenuPage] Menu data watcher - menuData:', menuData)
        console.log('[MenuPage] Menu data watcher - menuData.menuDetails exists:', !!(menuData && menuData.menuDetails))
        console.log('[MenuPage] Menu data watcher - menuDetailState.menus keys: [', Object.keys(menuDetailState.menus).join(', '), ']')
        console.log('[MenuPage] Menu data watcher - Current local refs before update:', {
          menu: menu.value ? 'exists' : 'null',
          recipesCount: recipes.value.length,
          ownerUsername: ownerUsername.value
        })
        
        if (menuData && menuData.menuDetails) {
          console.log('[MenuPage] Menu data watcher - Calling updateMenuData...')
          updateMenuData()
          console.log('[MenuPage] Menu data watcher - updateMenuData completed')
          // Load costs when menu data is available - defer to nextTick to ensure reactivity has settled
          nextTick(() => {
            // Only load costs if menu is actually set and not loading
            if (menu.value && !isLoading.value) {
              try {
                // Load menu cost - catch errors to prevent breaking menu display
                loadMenuCost().catch(err => {
                  console.error('Error in loadMenuCost (non-blocking):', err)
                })
                // Only load recipe costs if we have recipes
                if (recipes.value && recipes.value.length > 0) {
                  loadAllRecipeCosts().catch(err => {
                    console.error('Error in loadAllRecipeCosts (non-blocking):', err)
                  })
                }
              } catch (err) {
                console.error('Error loading costs (non-blocking):', err)
              }
            }
          })
        } else {
          console.log('[MenuPage] Menu data watcher - Not calling updateMenuData (no valid menuData)')
          // Clear cost state when menu data is unavailable
          // Only clear if we're not loading (to avoid clearing during initial load)
          if (!isLoading.value) {
            menuCost.value = null
            recipeCosts.value = {}
            menuCostLoading.value = false
          }
        }
        console.log('[MenuPage] ========== Menu data watcher END ==========')
      },
      { immediate: true, deep: true }
    )
    
    // Watch loading state to update when loading completes
    watch(
      () => menuDetailState.loading[props.menuId],
      (loading, oldLoading) => {
        console.log('[MenuPage] ========== Loading watcher TRIGGERED ==========')
        console.log('[MenuPage] Loading watcher - menuId:', props.menuId)
        console.log('[MenuPage] Loading watcher - loading:', loading)
        console.log('[MenuPage] Loading watcher - oldLoading:', oldLoading)
        console.log(`[MenuPage] Loading watcher - Transition: loading ${oldLoading} -> ${loading}`)
        console.log(`[MenuPage] Loading watcher - Condition check: oldLoading (${oldLoading}) && !loading (${!loading}) = ${oldLoading && !loading}`)
        console.log(`[MenuPage] Loading watcher - menuDetailState.menus[${props.menuId}] exists:`, !!menuDetailState.menus[props.menuId])
        console.log('[MenuPage] Loading watcher - Current local refs:', {
          menu: menu.value ? 'exists' : 'null',
          recipesCount: recipes.value.length,
          ownerUsername: ownerUsername.value
        })
        
        // When loading completes, update menu data
        if (oldLoading && !loading) {
          console.log('[MenuPage] Loading watcher - Loading completed, calling updateMenuData...')
          updateMenuData()
          console.log('[MenuPage] Loading watcher - updateMenuData completed')
          // Load costs after loading completes and menu data is updated
          nextTick(() => {
            if (menu.value && !isLoading.value) {
              try {
                loadMenuCost().catch(err => {
                  console.error('Error in loadMenuCost after loading completes (non-blocking):', err)
                })
                if (recipes.value && recipes.value.length > 0) {
                  loadAllRecipeCosts().catch(err => {
                    console.error('Error in loadAllRecipeCosts after loading completes (non-blocking):', err)
                  })
                }
              } catch (err) {
                console.error('Error loading costs after loading completes (non-blocking):', err)
              }
            }
          })
        } else {
          console.log('[MenuPage] Loading watcher - Not calling updateMenuData')
        }
        console.log('[MenuPage] ========== Loading watcher END ==========')
      },
      { immediate: true }
    )
    
    // Watch menuId prop changes to clear cost state when navigating to a different menu
    watch(
      () => props.menuId,
      (newMenuId, oldMenuId) => {
        if (newMenuId !== oldMenuId && oldMenuId) {
          console.log('[MenuPage] MenuId changed, clearing cost state')
          // Clear cost state when menuId changes
          menuCost.value = null
          recipeCosts.value = {}
          menuCostLoading.value = false
          menuCostError.value = null
          // Clear all recipe cost loading states
          Object.keys(recipeCostsLoading.value).forEach(key => {
            delete recipeCostsLoading.value[key]
          })
        }
      }
    )
    
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
    const addRecipeMode = ref('new')
    const selectedRecipeId = ref('')
    const scalingFactor = ref(1)
    const newScalingFactor = ref(1)
    const editingRecipe = ref(null)
    
    // Track which recipes are showing their edit actions
    const recipesShowingActions = ref(new Set())
    const expandedRecipes = ref(new Set())
const showIngredientForm = ref(false)
const showEditIngredientForm = ref(false)
const editingIngredientIndex = ref(null) // Track which ingredient is being edited (null = adding new, number = editing existing)
    
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
    const unitOptions = [
      'g','kg','mg','lb','oz','ml','l','tsp','tbsp','cup','pint','quart','gallon','piece','pack','can'
    ]
    const newIngredient = reactive({
      name: '',
      quantity: 1,
      units: ''
    })
    
    // Catalog search state for ingredients
    const selectedCatalogItem = ref(null)
    const ingredientSearchQuery = ref('')
    const showIngredientDropdown = ref(false)
    const ingredientSearchInputRef = ref(null)
    const editIngredientSearchInputRef = ref(null)
    
    // Admin status (cached in auth store)
    const isAdmin = computed(() => authStore.isAdmin)
    
    // Computed properties
    const currentUser = computed(() => authStore.user)
    const route = useRoute()
    const isOwner = computed(() => menu.value && currentUser.value && menu.value.owner === currentUser.value.id)
    
    // Permission computed properties
    const canEditMenu = computed(() => isOwner.value || isAdmin.value)
    const canEditRecipes = computed(() => isOwner.value || isAdmin.value)
    
    // Computed properties for ingredient catalog search
    const filteredCatalogItems = computed(() => {
      if (!ingredientSearchQuery.value || !catalogState.items.length) {
        return []
      }
      const query = ingredientSearchQuery.value.toLowerCase().trim()
      if (!query) {
        return []
      }
      return catalogState.items.filter(item => 
        item.name.toLowerCase().includes(query)
      ).slice(0, 10) // Limit to 10 results for performance
    })
    
    const availableUnits = computed(() => {
      const item = selectedCatalogItem.value

      if (!item || !Array.isArray(item.purchaseOptions) || item.purchaseOptions.length === 0) {
        return []
      }

      // Determine which unit categories are used by this item's purchase options
      const categories = new Set()

      item.purchaseOptions.forEach((po) => {
        if (!po || !po.units) return
        const category = getUnitCategory(po.units)
        if (category) {
          categories.add(category)
        }
      })

      if (categories.size === 0) {
        // No recognizable categories from the purchase options -> no units available
        return []
      }

      // Union of all allowed units across the detected categories
      const unitsSet = new Set()

      categories.forEach((category) => {
        const unitsForCategory = ALLOWED_UNITS_BY_CATEGORY[category] || []
        unitsForCategory.forEach((u) => unitsSet.add(u))
      })

      // The templates and validation expect an array of simple unit strings
      return Array.from(unitsSet).sort()
    })

    const UNIT_CATEGORY_LABELS = {
      volume: 'Volume Units',
      weight: 'Weight Units',
      count: 'Countable Units'
    }

    const availableUnitsHeaderLabel = computed(() => {
      const item = selectedCatalogItem.value

      if (!item || !Array.isArray(item.purchaseOptions) || item.purchaseOptions.length === 0) {
        return 'Select units'
      }

      const categories = new Set()

      item.purchaseOptions.forEach((po) => {
        if (!po || !po.units) return
        const category = getUnitCategory(po.units)
        if (category) {
          categories.add(category)
        }
      })

      if (categories.size === 1) {
        const category = Array.from(categories)[0]
        return UNIT_CATEGORY_LABELS[category] || 'Units'
      }

      if (categories.size > 1) {
        return 'Units'
      }

      return 'Select units'
    })
    
    // Watch for menu data changes to update edit form
    watch(() => menu.value, (newMenu) => {
      if (newMenu) {
        editForm.name = newMenu.name
        editForm.date = formatDateForInput(newMenu.date)
      }
    }, { immediate: true })
    
    // Watch for add recipe modal to ensure catalog is loaded
    watch(() => showAddRecipeModal.value, (isOpen) => {
      if (isOpen) {
        catalogStore.ensureLoaded()
      }
    })
    
    // Load available recipes for adding (user-specific, not cached)
    const loadAvailableRecipes = async () => {
      if (currentUser.value) {
        try {
          const availableResponse = await cookBookService.getRecipesOwnedByUser(currentUser.value.id)
          if (availableResponse && availableResponse.length > 0) {
            availableRecipes.value = availableResponse.map(recipe => ({
              id: recipe.recipe,
              name: recipe.name
            }))
          }
        } catch (err) {
          console.error('Error loading available recipes:', err)
        }
      }
    }
    
    // Cost loading functions
    const loadMenuCost = async () => {
      // Guard: don't load if menuId is missing or menu is not set
      if (!props.menuId || !menu.value) {
        return
      }
      
      // Guard: don't load if already loading or if menu is still loading
      if (menuCostLoading.value || isLoading.value) {
        return
      }
      
      menuCostLoading.value = true
      menuCostError.value = null
      
      try {
        const cost = await fetchMenuCost(props.menuId)
        // Double-check menu still exists before setting cost (in case component unmounted)
        if (menu.value && props.menuId) {
          menuCost.value = cost
        }
      } catch (err) {
        // Log error but don't throw - cost loading should never break menu display
        console.error('Error loading menu cost (non-blocking):', err)
        menuCostError.value = err.message || 'Failed to load menu cost'
        // Only set to null if menu still exists
        if (menu.value && props.menuId) {
          menuCost.value = null
        }
      } finally {
        // Only update loading state if menu still exists
        if (menu.value && props.menuId) {
          menuCostLoading.value = false
        }
      }
    }
    
    const loadRecipeCost = async (recipeId) => {
      // Guard: don't load if recipeId is missing or recipes don't exist
      if (!recipeId || !recipes.value || recipes.value.length === 0) {
        return
      }
      
      // Guard: check if recipe still exists in recipes array
      const recipeExists = recipes.value.some(r => r.id === recipeId)
      if (!recipeExists) {
        return
      }
      
      recipeCostsLoading.value[recipeId] = true
      
      try {
        const cost = await fetchRecipeCost(recipeId)
        // Double-check recipe still exists before setting cost
        if (recipes.value.some(r => r.id === recipeId)) {
          recipeCosts.value[recipeId] = cost
        }
      } catch (err) {
        // Log error but don't throw - cost loading should never break menu display
        console.error(`Error loading recipe cost for ${recipeId} (non-blocking):`, err)
        // Only set to null if recipe still exists
        if (recipes.value.some(r => r.id === recipeId)) {
          recipeCosts.value[recipeId] = null
        }
      } finally {
        // Only update loading state if recipe still exists
        if (recipes.value.some(r => r.id === recipeId)) {
          recipeCostsLoading.value[recipeId] = false
        }
      }
    }
    
    const loadAllRecipeCosts = async () => {
      // Guard: don't load if recipes don't exist or menu is loading
      if (!recipes.value || recipes.value.length === 0 || isLoading.value) {
        if (!recipes.value || recipes.value.length === 0) {
          recipeCosts.value = {}
        }
        return
      }
      
      try {
        // Load costs for all recipes in parallel, but catch individual errors
        const costPromises = recipes.value.map(recipe => 
          loadRecipeCost(recipe.id).catch(err => {
            console.error(`Error loading cost for recipe ${recipe.id} (non-blocking):`, err)
          })
        )
        await Promise.all(costPromises)
      } catch (err) {
        // This should never happen since we catch in loadRecipeCost, but just in case
        console.error('Unexpected error in loadAllRecipeCosts (non-blocking):', err)
      }
    }
    
    // Methods
    const retryLoadMenu = async () => {
      console.log(`[MenuPage] retryLoadMenu called - menuId: ${props.menuId}`)
      console.log(`[MenuPage] retryLoadMenu - Before refresh, store state:`, {
        menuInStore: !!menuDetailState.menus[props.menuId],
        isLoading: isLoading.value,
        error: error.value
      })
      await menuDetailStore.refreshMenu(props.menuId)
      console.log(`[MenuPage] retryLoadMenu - After refresh, store state:`, {
        menuInStore: !!menuDetailState.menus[props.menuId],
        isLoading: isLoading.value,
        error: error.value
      })
      console.log(`[MenuPage] retryLoadMenu - Calling updateMenuData...`)
      updateMenuData()
      console.log(`[MenuPage] retryLoadMenu - updateMenuData completed`)
    }
    
    const enterEditMode = () => {
      isEditing.value = true
      if (menu.value) {
        editForm.name = menu.value.name
        // Ensure date is in YYYY-MM-DD format for HTML date input
        editForm.date = formatDateForInput(menu.value.date)
      }
    }
    
    const cancelEdit = () => {
      isEditing.value = false
      const currentMenu = menu.value
      if (currentMenu) {
        editForm.name = currentMenu.name
        editForm.date = formatDateForInput(currentMenu.date)
      }
      clearFormErrors()
    }
    
    const deleteMenu = async () => {
      if (!menu.value) return
      
      if (!confirm(`Are you sure you want to delete the menu "${menu.value.name}"? This action cannot be undone.`)) {
        return
      }
      
      isSaving.value = true
      
      try {
        // Delete the menu using the API
        await menuCollectionService.deleteMenu(props.menuId)
        
        // Menu is automatically removed from weekly cart when deleted (backend synchronization)
        // Invalidate cache so UI reflects the menu removal
        if (menu.value?.date) {
          const menuDateStr = normalizeMenuDateToYmd(menu.value.date)
          weeklyCartStore.clearWeekMenuMapping(menuDateStr)
        }
        
        // Remove from cache
        menuDetailStore.clearMenu(props.menuId)
        
        // Navigate back to menus page
        emit('back-to-menus')
      } catch (err) {
        console.error('Error deleting menu:', err)
        error.value = err.message || 'Failed to delete menu'
        isSaving.value = false
      }
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
          // Send ISO date string to keep cache consistent with backend payloads
          updates.date = `${editForm.date}T00:00:00.000Z`
          console.log('Date change detected:', {
            original: menu.value.date,
            originalFormatted: currentFormattedDate,
            new: editForm.date,
            newAsIso: updates.date
          })
        }
        
        if (Object.keys(updates).length > 0) {
          console.log('Saving updates:', updates)
          await menuCollectionService.updateMenu(props.menuId, updates)
          
          // Update cache
          const cacheUpdates = { ...updates }
          if (cacheUpdates.date instanceof Date) {
            cacheUpdates.date = cacheUpdates.date.toISOString()
          }
          menuDetailStore.updateMenu(props.menuId, cacheUpdates)
          
          // Menu is automatically moved between weekly carts when date changes (backend synchronization)
          // Invalidate cache for both old and new dates so UI reflects the change
          if (updates.date) {
            // Invalidate old date cache
            if (menu.value?.date) {
              const oldDateStr = normalizeMenuDateToYmd(menu.value.date)
              weeklyCartStore.clearWeekMenuMapping(oldDateStr)
            }
            // Invalidate new date cache
            const newDateStr = editForm.date
            weeklyCartStore.clearWeekMenuMapping(newDateStr)
          }
        }
        
        isEditing.value = false
      } catch (err) {
        console.error('Error saving menu:', err)
        menuDetailStore.setError(props.menuId, err.message || 'Failed to save menu changes')
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
          menuDetailStore.setError(props.menuId, 'Please select a recipe and enter a scaling factor')
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
          
          // Validate that recipe was created successfully
          if (!createResponse || !createResponse.recipe) {
            throw new Error('Failed to create recipe: Invalid response from server')
          }
          
          recipeId = createResponse.recipe
          
          // Validate that recipeId is a valid non-empty string
          if (!recipeId || typeof recipeId !== 'string' || recipeId.trim() === '') {
            throw new Error('Failed to create recipe: Invalid recipe ID returned from server')
          }
          
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
        
        // Final validation: ensure recipeId is valid before proceeding
        if (!recipeId || typeof recipeId !== 'string' || recipeId.trim() === '') {
          throw new Error('Invalid recipe ID: Cannot add recipe to menu without a valid recipe ID')
        }
        
        // Add recipe to menu
        await menuCollectionService.addRecipe(props.menuId, recipeId, scalingFactor.value)
        
        // Update cache
        await menuDetailStore.addRecipe(props.menuId, recipeId, scalingFactor.value)
        
        // Refresh costs after adding recipe - use nextTick and error handling
        nextTick(() => {
          if (menu.value && !isLoading.value) {
            loadMenuCost().catch(err => {
              console.error('Error refreshing menu cost after adding recipe (non-blocking):', err)
            })
            loadRecipeCost(recipeId).catch(err => {
              console.error('Error refreshing recipe cost after adding recipe (non-blocking):', err)
            })
          }
        })
        
        // Reset form and close modal
        resetAddRecipeForm()
        showAddRecipeModal.value = false
        
      } catch (err) {
        console.error('Error adding recipe:', err)
        menuDetailStore.setError(props.menuId, err.message || 'Failed to add recipe to menu')
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
      clearIngredientSelection()
      newIngredient.quantity = 1
      showIngredientForm.value = false
      addRecipeMode.value = 'new'
    }
    
    function openAddIngredientForm() {
      console.log('Opening add ingredient form')
      showIngredientForm.value = true
      newIngredient.name = ''
      newIngredient.quantity = 1
      newIngredient.units = ''
      selectedCatalogItem.value = null
      ingredientSearchQuery.value = ''
      showIngredientDropdown.value = false
      // Ensure catalog is loaded
      catalogStore.ensureLoaded()
      nextTick(() => {
        console.log('Focusing add ingredient input')
        ingredientSearchInputRef.value?.focus()
      })
    }

    const selectCatalogItem = (item) => {
      selectedCatalogItem.value = item
      newIngredient.name = item.name
      ingredientSearchQuery.value = item.name
      showIngredientDropdown.value = false
      // Reset units if current unit is not in available units
      if (availableUnits.value.length > 0 && !availableUnits.value.includes(newIngredient.units)) {
        newIngredient.units = availableUnits.value[0]
      }
    }
    
    const clearIngredientSelection = () => {
      selectedCatalogItem.value = null
      newIngredient.name = ''
      ingredientSearchQuery.value = ''
      newIngredient.units = ''
      showIngredientDropdown.value = false
    }
    
    const handleIngredientSearchInput = () => {
      // Clear selection if user starts typing a different search
      if (selectedCatalogItem.value && ingredientSearchQuery.value !== selectedCatalogItem.value.name) {
        selectedCatalogItem.value = null
        newIngredient.units = ''
      }
      showIngredientDropdown.value = true
    }
    
    const handleIngredientSearchBlur = () => {
      // Delay closing to allow click events on dropdown items to fire first
      setTimeout(() => {
        showIngredientDropdown.value = false
      }, 200)
    }
    
    function addIngredient() {
      console.log('Attempting to add ingredient', JSON.stringify(newIngredient))
      const name = (newIngredient.name || '').trim()
      const units = (newIngredient.units || '').trim()
      const qty = Number(newIngredient.quantity)
      
      // Validation: require catalog item selection and valid units
      if (!selectedCatalogItem.value) {
        console.log('Ingredient validation failed: No catalog item selected')
        return
      }
      if (!name || !units || qty <= 0) {
        console.log('Ingredient validation failed', { name, units, qty })
        return
      }
      // Validate that units are from available units
      if (availableUnits.value.length > 0 && !availableUnits.value.includes(units)) {
        console.log('Ingredient validation failed: Invalid units', { units, availableUnits: availableUnits.value })
        return
      }
      
      console.log('Adding ingredient to newRecipe list')
      newRecipe.ingredients.push({ name, units, quantity: qty })
      clearIngredientSelection()
      newIngredient.quantity = 1
      showIngredientForm.value = false
    }

    function cancelAddIngredient() {
      console.log('Cancelling add ingredient form')
      showIngredientForm.value = false
      clearIngredientSelection()
      newIngredient.quantity = 1
    }
    
    const removeIngredient = (index) => {
      newRecipe.ingredients.splice(index, 1)
    }
    
    const toggleRecipeActions = (recipeId) => {
      const newSet = new Set(recipesShowingActions.value)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      recipesShowingActions.value = newSet
    }
    
    const isRecipeShowingActions = (recipeId) => {
      return recipesShowingActions.value.has(recipeId)
    }

    const toggleRecipeExpanded = (recipeId) => {
      const nextExpanded = new Set(expandedRecipes.value)
      if (nextExpanded.has(recipeId)) {
        nextExpanded.delete(recipeId)
      } else {
        nextExpanded.add(recipeId)
      }
      expandedRecipes.value = nextExpanded
    }

    const isRecipeExpanded = (recipeId) => {
      return expandedRecipes.value.has(recipeId)
    }

    watch(recipes, (nextRecipes) => {
      const nextIds = new Set((nextRecipes || []).map(recipe => recipe.id))
      const pruned = new Set(
        [...expandedRecipes.value].filter(recipeId => nextIds.has(recipeId))
      )
      if (pruned.size !== expandedRecipes.value.size) {
        expandedRecipes.value = pruned
      }
    })
    
    const editRecipe = (recipe) => {
      editingRecipe.value = recipe
      editRecipeForm.name = recipe.name
      editRecipeForm.dishType = recipe.dishType
      editRecipeForm.servingQuantity = recipe.servingQuantity
      editRecipeForm.instructions = recipe.instructions
      editRecipeForm.ingredients = [...recipe.ingredients]
      // Reset ingredient editing state
      editingIngredientIndex.value = null
      showEditIngredientForm.value = false
      clearIngredientSelection()
      showEditRecipeModal.value = true
      // Hide recipe actions when opening edit modal
      const newSet = new Set(recipesShowingActions.value)
      newSet.delete(recipe.id)
      recipesShowingActions.value = newSet
      // Ensure catalog is loaded when editing recipe
      catalogStore.ensureLoaded()
    }
    
    function addIngredientToEdit() {
      console.log('Attempting to add ingredient to edit list', JSON.stringify(newIngredient))
      const name = (newIngredient.name || '').trim()
      const units = (newIngredient.units || '').trim()
      const qty = Number(newIngredient.quantity)
      
      // Validation: require catalog item selection and valid units
      if (!selectedCatalogItem.value) {
        console.log('Edit ingredient validation failed: No catalog item selected')
        return
      }
      if (!name || !units || qty <= 0) {
        console.log('Edit ingredient validation failed', { name, units, qty })
        return
      }
      // Validate that units are from available units
      if (availableUnits.value.length > 0 && !availableUnits.value.includes(units)) {
        console.log('Edit ingredient validation failed: Invalid units', { units, availableUnits: availableUnits.value })
        return
      }
      
      console.log('Adding ingredient to editRecipeForm ingredients')
      editRecipeForm.ingredients.push({ name, units, quantity: qty })
      clearIngredientSelection()
      newIngredient.quantity = 1
      showEditIngredientForm.value = false
    }

    function openEditIngredientForm() {
      console.log('Opening edit ingredient form for new ingredient')
      // Close any existing ingredient edit if open
      editingIngredientIndex.value = null
      showEditIngredientForm.value = true
      clearIngredientSelection()
      newIngredient.quantity = 1
      // Ensure catalog is loaded
      catalogStore.ensureLoaded()
      nextTick(() => {
        console.log('Focusing edit ingredient input')
        editIngredientSearchInputRef.value?.focus()
      })
    }
    
    const startEditIngredient = (index) => {
      console.log('Starting to edit ingredient at index', index)
      // Close "Add New Ingredient" form if open
      showEditIngredientForm.value = false
      editingIngredientIndex.value = index
      const ingredient = editRecipeForm.ingredients[index]
      
      // Pre-populate form with current ingredient data
      newIngredient.name = ingredient.name
      newIngredient.quantity = ingredient.quantity
      newIngredient.units = ingredient.units
      
      // Try to find matching catalog item by name
      const matchingItem = catalogState.items.find(item => 
        item.name.toLowerCase() === ingredient.name.toLowerCase()
      )
      
      if (matchingItem) {
        selectedCatalogItem.value = matchingItem
        ingredientSearchQuery.value = matchingItem.name
        // Reset units if current unit is not in available units
        if (availableUnits.value.length > 0 && !availableUnits.value.includes(newIngredient.units)) {
          newIngredient.units = availableUnits.value[0]
        }
      } else {
        // If not found in catalog, clear selection but keep the search query
        selectedCatalogItem.value = null
        ingredientSearchQuery.value = ingredient.name
      }
      
      showIngredientDropdown.value = false
      
      // Ensure catalog is loaded
      catalogStore.ensureLoaded()
      
      nextTick(() => {
        editIngredientSearchInputRef.value?.focus()
      })
    }
    
    const saveEditedIngredient = () => {
      console.log('Saving edited ingredient at index', editingIngredientIndex.value)
      const name = (newIngredient.name || '').trim()
      const units = (newIngredient.units || '').trim()
      const qty = Number(newIngredient.quantity)
      
      // Validation: require catalog item selection and valid units
      if (!selectedCatalogItem.value) {
        console.log('Edit ingredient validation failed: No catalog item selected')
        return
      }
      if (!name || !units || qty <= 0) {
        console.log('Edit ingredient validation failed', { name, units, qty })
        return
      }
      // Validate that units are from available units
      if (availableUnits.value.length > 0 && !availableUnits.value.includes(units)) {
        console.log('Edit ingredient validation failed: Invalid units', { units, availableUnits: availableUnits.value })
        return
      }
      
      // Update the ingredient at the specific index
      if (editingIngredientIndex.value !== null && editingIngredientIndex.value >= 0 && editingIngredientIndex.value < editRecipeForm.ingredients.length) {
        editRecipeForm.ingredients[editingIngredientIndex.value] = {
          name,
          units,
          quantity: qty
        }
        console.log('Updated ingredient at index', editingIngredientIndex.value)
      }
      
      // Clear edit state
      cancelEditIngredient()
    }
    
    const cancelEditIngredient = () => {
      console.log('Cancelling ingredient edit')
      editingIngredientIndex.value = null
      clearIngredientSelection()
      newIngredient.quantity = 1
    }

    function cancelAddIngredientToEdit() {
      console.log('Cancelling edit ingredient form')
      showEditIngredientForm.value = false
      editingIngredientIndex.value = null
      clearIngredientSelection()
      newIngredient.quantity = 1
    }
    
    const removeIngredientFromEdit = (index) => {
      // If removing the ingredient being edited, cancel the edit first
      if (editingIngredientIndex.value === index) {
        cancelEditIngredient()
      }
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
        
        // Update cache
        menuDetailStore.updateRecipe(props.menuId, recipeId, updates)
        menuDetailStore.updateRecipeIngredients(props.menuId, recipeId, newIngredients)
        
        // Refresh costs after recipe changes (ingredients may affect cost) - use nextTick and error handling
        nextTick(() => {
          if (menu.value && !isLoading.value) {
            loadMenuCost().catch(err => {
              console.error('Error refreshing menu cost after recipe changes (non-blocking):', err)
            })
            loadRecipeCost(recipeId).catch(err => {
              console.error('Error refreshing recipe cost after recipe changes (non-blocking):', err)
            })
          }
        })
        
        showEditRecipeModal.value = false
        
      } catch (err) {
        console.error('Error saving recipe:', err)
        menuDetailStore.setError(props.menuId, err.message || 'Failed to save recipe changes')
      } finally {
        isSavingRecipe.value = false
      }
    }
    
    const changeScaling = (recipe) => {
      editingRecipe.value = recipe
      newScalingFactor.value = recipe.scalingFactor
      showScalingModal.value = true
      // Hide recipe actions when opening scaling modal
      const newSet = new Set(recipesShowingActions.value)
      newSet.delete(recipe.id)
      recipesShowingActions.value = newSet
    }
    
    const updateScalingFactor = async () => {
      isUpdatingScaling.value = true
      
      try {
        await menuCollectionService.changeRecipeScaling(
          props.menuId,
          editingRecipe.value.id,
          newScalingFactor.value
        )
        
        // Update cache
        menuDetailStore.updateRecipeScaling(props.menuId, editingRecipe.value.id, newScalingFactor.value)
        
        // Refresh costs after scaling change - use nextTick and error handling
        nextTick(() => {
          if (menu.value && !isLoading.value) {
            loadMenuCost().catch(err => {
              console.error('Error refreshing menu cost after scaling change (non-blocking):', err)
            })
          }
        })
        
        showScalingModal.value = false
        
      } catch (err) {
        console.error('Error updating scaling:', err)
        menuDetailStore.setError(props.menuId, err.message || 'Failed to update scaling factor')
      } finally {
        isUpdatingScaling.value = false
      }
    }
    
    const removeRecipe = async (recipe) => {
      if (!confirm(`Are you sure you want to remove "${recipe.name}" from this menu?`)) {
        return
      }
      
      // Hide recipe actions before removing
      const newSet = new Set(recipesShowingActions.value)
      newSet.delete(recipe.id)
      recipesShowingActions.value = newSet
      
      try {
        await menuCollectionService.removeRecipe(props.menuId, recipe.id)
        
        // Update cache
        menuDetailStore.removeRecipe(props.menuId, recipe.id)
        
        // Remove recipe cost from state
        delete recipeCosts.value[recipe.id]
        delete recipeCostsLoading.value[recipe.id]
        
        // Refresh menu cost after removing recipe - use nextTick and error handling
        nextTick(() => {
          if (menu.value && !isLoading.value) {
            loadMenuCost().catch(err => {
              console.error('Error refreshing menu cost after removing recipe (non-blocking):', err)
            })
          }
        })
      } catch (err) {
        console.error('Error removing recipe:', err)
        menuDetailStore.setError(props.menuId, err.message || 'Failed to remove recipe from menu')
      }
    }
    
    const closeAddRecipeModal = () => {
      showAddRecipeModal.value = false
      resetAddRecipeForm()
    }
    
    const closeEditRecipeModal = () => {
      showEditRecipeModal.value = false
      editingRecipe.value = null
      editingIngredientIndex.value = null
      showEditIngredientForm.value = false
      clearIngredientSelection()
    }
    
    const closeScalingModal = () => {
      showScalingModal.value = false
      editingRecipe.value = null
    }
    
    const goBack = () => {
      emit('back-to-menus')
    }
    
    // Lifecycle - mount
    onMounted(async () => {
      console.log('[MenuPage] ========== onMounted START ==========')
      console.log('[MenuPage] onMounted - menuId:', props.menuId)
      console.log('[MenuPage] onMounted - Initial local refs:', {
        menu: menu.value ? 'exists' : 'null',
        recipesCount: recipes.value.length,
        ownerUsername: ownerUsername.value
      })
      console.log('[MenuPage] onMounted - Initial store state:', {
        isLoading: isLoading.value,
        error: error.value,
        menuInStore: !!menuDetailState.menus[props.menuId]
      })
      console.log('[MenuPage] onMounted - menuDetailState.menus keys: [', Object.keys(menuDetailState.menus).join(', '), ']')
      
      try {
        // Always ensure menu is loaded (will use cache if available and valid)
        console.log('[MenuPage] onMounted - Calling ensureMenuLoaded...')
        await menuDetailStore.ensureMenuLoaded(props.menuId)
        console.log('[MenuPage] onMounted - ensureMenuLoaded completed')
        console.log('[MenuPage] onMounted - After ensureMenuLoaded, store state:', {
          isLoading: isLoading.value,
          error: error.value,
          menuInStore: !!menuDetailState.menus[props.menuId],
          menuData: menuDetailState.menus[props.menuId] ? 'exists' : 'null'
        })
        
        // Always sync from store state after loading (defensive update)
        console.log('[MenuPage] onMounted - Calling updateMenuData...')
        updateMenuData()
        console.log('[MenuPage] onMounted - updateMenuData completed')
        console.log('[MenuPage] Menu data after ensureMenuLoaded:', { 
          menu: menu.value ? 'exists' : 'null',
          menuName: menu.value?.name,
          recipesCount: recipes.value.length,
          ownerUsername: ownerUsername.value 
        })
        
        loadAvailableRecipes()
        
        // If navigated with ?edit=1, open directly in edit mode
        if (route?.query?.edit === '1' || route?.query?.edit === 'true') {
          enterEditMode()
        }
      } catch (error) {
        console.error('[MenuPage] Error in onMounted:', error)
        console.error('[MenuPage] onMounted ERROR - error details:', error)
        console.error('[MenuPage] onMounted ERROR - store state:', {
          isLoading: isLoading.value,
          error: error.value,
          menuInStore: !!menuDetailState.menus[props.menuId]
        })
        // Ensure local state reflects error state
        updateMenuData()
      }
      console.log('[MenuPage] ========== onMounted END ==========')
    })
    
    // Watch for menuId changes to load different menu
    watch(() => props.menuId, async (newMenuId, oldMenuId) => {
      console.log('[MenuPage] ========== menuId watcher TRIGGERED ==========')
      console.log('[MenuPage] menuId watcher - oldMenuId:', oldMenuId)
      console.log('[MenuPage] menuId watcher - newMenuId:', newMenuId)
      console.log(`[MenuPage] menuId watcher - Condition: newMenuId (${newMenuId}) && newMenuId !== oldMenuId (${newMenuId !== oldMenuId}) = ${newMenuId && newMenuId !== oldMenuId}`)
      
      if (newMenuId && newMenuId !== oldMenuId) {
        console.log('[MenuPage] menuId changed from', oldMenuId, 'to', newMenuId)
        console.log('[MenuPage] menuId watcher - Before reset, local refs:', {
          menu: menu.value ? 'exists' : 'null',
          recipesCount: recipes.value.length,
          ownerUsername: ownerUsername.value
        })
        console.log('[MenuPage] menuId watcher - Store state for old menu:', {
          oldMenuInStore: oldMenuId ? !!menuDetailState.menus[oldMenuId] : 'N/A',
          oldMenuLoading: oldMenuId ? menuDetailState.loading[oldMenuId] : 'N/A'
        })
        console.log('[MenuPage] menuId watcher - Store state for new menu:', {
          newMenuInStore: !!menuDetailState.menus[newMenuId],
          newMenuLoading: menuDetailState.loading[newMenuId]
        })
        
        try {
          // Reset local refs immediately when menuId changes
          console.log('[MenuPage] menuId watcher - Resetting local refs...')
          menu.value = null
          recipes.value = []
          ownerUsername.value = ''
          console.log('[MenuPage] menuId watcher - After reset, local refs:', {
            menu: menu.value,
            recipesCount: recipes.value.length,
            ownerUsername: ownerUsername.value
          })
          
          // Load new menu
          console.log('[MenuPage] menuId watcher - Calling ensureMenuLoaded for new menuId...')
          await menuDetailStore.ensureMenuLoaded(newMenuId)
          console.log('[MenuPage] menuId watcher - ensureMenuLoaded completed')
          console.log('[MenuPage] menuId watcher - After ensureMenuLoaded, store state:', {
            newMenuInStore: !!menuDetailState.menus[newMenuId],
            newMenuLoading: menuDetailState.loading[newMenuId],
            newMenuData: menuDetailState.menus[newMenuId] ? 'exists' : 'null'
          })
          
          // Sync from store
          console.log('[MenuPage] menuId watcher - Calling updateMenuData...')
          updateMenuData()
          console.log('[MenuPage] menuId watcher - updateMenuData completed')
          console.log('[MenuPage] menuId watcher - After updateMenuData, local refs:', {
            menu: menu.value ? 'exists' : 'null',
            menuName: menu.value?.name,
            recipesCount: recipes.value.length,
            ownerUsername: ownerUsername.value
          })
          
          loadAvailableRecipes()
        } catch (error) {
          console.error('[MenuPage] Error loading menu on menuId change:', error)
          console.error('[MenuPage] menuId watcher ERROR - error details:', error)
          console.error('[MenuPage] menuId watcher ERROR - store state:', {
            newMenuInStore: !!menuDetailState.menus[newMenuId],
            newMenuLoading: menuDetailState.loading[newMenuId],
            newMenuError: menuDetailState.errors[newMenuId]
          })
          updateMenuData()
        }
      } else {
        console.log('[MenuPage] menuId watcher - No change detected, skipping')
      }
      console.log('[MenuPage] ========== menuId watcher END ==========')
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
      showIngredientForm,
      showEditIngredientForm,
      editingIngredientIndex,
      addRecipeMode,
      selectedRecipeId,
      scalingFactor,
      newScalingFactor,
      editingRecipe,
      newRecipe,
      newRecipeErrors,
      editRecipeForm,
      newIngredient,
      unitOptions,
      currentUser,
      isOwner,
      isAdmin,
      canEditMenu,
      canEditRecipes,
      
      // Catalog search state
      selectedCatalogItem,
      ingredientSearchQuery,
      showIngredientDropdown,
      filteredCatalogItems,
      availableUnits,
      availableUnitsHeaderLabel,
      catalogState,
      ingredientSearchInputRef,
      editIngredientSearchInputRef,
      
      // Cost state
      menuCost,
      menuCostLoading,
      menuCostError,
      recipeCosts,
      recipeCostsLoading,
      
      // Methods
      retryLoadMenu,
      enterEditMode,
      cancelEdit,
      deleteMenu,
      saveChanges,
      addRecipeToMenu,
      addIngredient,
      openAddIngredientForm,
      cancelAddIngredient,
      removeIngredient,
      editRecipe,
      toggleRecipeActions,
      isRecipeShowingActions,
      toggleRecipeExpanded,
      isRecipeExpanded,
      addIngredientToEdit,
      cancelAddIngredientToEdit,
      removeIngredientFromEdit,
      openEditIngredientForm,
      startEditIngredient,
      saveEditedIngredient,
      cancelEditIngredient,
      saveRecipeChanges,
      changeScaling,
      selectCatalogItem,
      clearIngredientSelection,
      handleIngredientSearchInput,
      handleIngredientSearchBlur,
      updateScalingFactor,
      removeRecipe,
      closeAddRecipeModal,
      closeEditRecipeModal,
      closeScalingModal,
      formatDate,
      formatCost,
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
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--primary-light);
}

.menu-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .menu-title-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .menu-actions {
    width: 100%;
    justify-content: flex-start;
  }
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

.menu-title {
  color: var(--primary-color);
  margin: 0;
  font-size: 2.5rem;
  flex: 1;
}

.menu-meta {
  display: flex;
  gap: 2rem;
  color: var(--secondary-color);
  font-size: 1.1rem;
}

.menu-cost-with-tooltip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  vertical-align: baseline;
}

.tooltip-container {
  position: relative;
  display: inline-block;
  vertical-align: middle;
  line-height: 1;
}

.tooltip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  font-size: 0.875rem;
  font-weight: bold;
  cursor: help;
  transition: background-color 0.2s ease, transform 0.2s ease;
  line-height: 1;
  vertical-align: middle;
}

.tooltip-icon:hover {
  background-color: var(--secondary-color);
  transform: scale(1.1);
}

.tooltip-text {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  top: 125%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  text-align: left;
  padding: 1rem 1.25rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: normal;
  white-space: normal;
  width: 380px;
  z-index: 1000;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  line-height: 1.5;
}

.tooltip-text::before {
  content: "";
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-bottom-color: #333;
}

.tooltip-container:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

.menu-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.edit-actions {
  display: flex;
  gap: 1.5rem; /* extra separation between Save, Cancel, and Delete */
}

.edit-btn, .save-btn, .cancel-btn, .delete-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Prevent lingering box-shadows after click/focus */
.edit-btn:focus,
.save-btn:focus,
.cancel-btn:focus,
.delete-btn:focus,
.edit-btn:active,
.save-btn:active,
.cancel-btn:active,
.delete-btn:active {
  outline: none;
  box-shadow: none;
}

/* Keep accessible outline only when keyboard focusing */
.edit-btn:focus-visible,
.save-btn:focus-visible,
.cancel-btn:focus-visible,
.delete-btn:focus-visible {
  outline: 2px solid rgba(0,0,0,0.25);
  outline-offset: 2px;
}

.edit-btn {
  background: #002395;
  color: white;
  font-size: 1.1rem;
  padding: 1rem 2rem;
  font-weight: 600;
  border: 1px solid #001f7a;
}

.edit-btn:hover {
  background: #001f7a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 35, 149, 0.3);
}

.save-btn {
  /* French blue */
  background: #002395;
  color: #ffffff;
  font-size: 1.1rem;
  padding: 1rem 2rem;
  font-weight: 600;
  border: none; /* solid fill */
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
}

.save-btn:hover:not(:disabled) {
  background: #001f7a;
  box-shadow: none;
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cancel-btn {
  /* White */
  background: #ffffff;
  color: #000000;
  font-size: 1.1rem;
  padding: 1rem 2rem;
  font-weight: 600;
  border: 1px solid #cccccc;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
}

.cancel-btn:hover {
  background: #f5f5f5;
  color: #000000;
  box-shadow: none;
}

.delete-btn {
  /* French red */
  background: #ed2939;
  color: #ffffff;
  font-size: 1.1rem;
  padding: 1rem 2rem;
  font-weight: 600;
  border: none; /* solid fill */
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
}

.delete-btn:hover:not(:disabled) {
  background: #d21e2e;
  color: #ffffff;
  box-shadow: none;
}

.delete-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Remove any inner focus borders in Firefox */
button::-moz-focus-inner { border: 0; }

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

/* Recipe Reuse Info Note and Scaling Summary */
.recipe-reuse-info-note,
.scaling-summary {
  margin-bottom: 1rem;
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
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.section-header h2 {
  color: var(--primary-color);
  margin: 0;
  font-size: 2rem;
}

.add-recipe-btn, .add-first-recipe-btn {
  background: #002395;
  color: white;
  border: 1px solid #001f7a;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-recipe-btn:hover, .add-first-recipe-btn:hover {
  background: #001f7a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 35, 149, 0.3);
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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

.recipe-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.recipe-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--primary-color);
  cursor: pointer;
  transition: background 0.2s ease;
}

.recipe-toggle-btn:hover {
  background: var(--primary-light);
}

.recipe-toggle-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.recipe-toggle-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.recipe-toggle-icon.is-expanded {
  transform: rotate(180deg);
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

.recipe-meta > span {
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

.edit-recipe-btn, .scaling-btn, .remove-recipe-btn, .cancel-edit-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  margin-left: 0.5rem;
}

.recipe-action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.recipe-action-buttons > button:first-child {
  margin-left: 0;
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

.cancel-edit-btn {
  background: #6c757d;
  color: white;
  border: 1px solid #5a6268;
}

.cancel-edit-btn:hover {
  background: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.3);
}

/* Recipe Details */
.recipe-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.ingredients-section h4, .instructions-section h4 {
  color: var(--primary-color);
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.instructions-ingredients-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: start;
}

.ingredients-management h4,
.form-group label {
  color: var(--primary-color);
  font-weight: 600;
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

.ingredient-name {
  flex: 1;
  min-width: 150px;
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
/* Prominent tabs styling */
.prominent-tabs {
  background: #f7f9fc;
  border-radius: 10px;
  padding: 0.25rem;
  border: 1px solid #e3e8f0;
}
.tab-btn.prominent {
  padding: 0.85rem 1.25rem;
  font-weight: 600;
  color: #334155;
}
.tab-btn.prominent.active {
  background: #ffffff;
  border-radius: 8px;
  border-bottom-color: transparent;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  color: var(--primary-color);
}

/* Modernize select */
.modern-select {
  appearance: none;
  background: #ffffff url('data:image/svg+xml;utf8,<svg fill="%23666" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>') no-repeat right 0.75rem center/16px 16px;
  padding-right: 2.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border-radius: 8px;
}
.modern-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
}

/* Align Add left, Cancel right in add-recipe modal */
.add-recipe-footer {
  justify-content: space-between;
}
/* Add Recipe header layout */
.add-recipe-header {
  align-items: flex-start;
}
.add-recipe-header-main {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}
.add-recipe-title {
  font-size: 1.6rem;
  margin: 0;
}
.add-recipe-header-tabs {
  display: flex;
  gap: 0.5rem;
}


/* Match Add Recipe scale to Cancel */
.add-btn {
  font-size: 1.1rem;
  padding: 1rem 2rem;
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

.add-new-ingredient-btn.neutral {
  background: #d1d5db;
  color: #1f2937;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: none;
}

.add-new-ingredient-btn.neutral:hover {
  background: #9ca3af;
  transform: translateY(-1px);
}

.add-ingredient-form {
  display: grid;
  grid-template-columns: 2fr 0.75fr 0.75fr auto auto;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
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

.ingredient-units-input:disabled {
  background-color: #e9ecef !important;
  color: #6c757d !important;
  cursor: not-allowed;
  opacity: 0.7;
}

.ingredient-units-input:not(:disabled) {
  background-color: white;
  color: #000;
  transition: background-color 0.2s ease, color 0.2s ease;
}


.add-ingredient-btn {
  grid-column: 4;
  padding: 0.6rem 1.1rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
}

.add-ingredient-primary {
  background: var(--light-french-blue, #4A90E2);
  color: #ffffff;
}

.add-ingredient-primary:hover:not(:disabled) {
  background: #2f78d4;
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
  padding: 0.6rem 1.1rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
}

.add-ingredient-danger {
  background: var(--light-french-red, #FF6B6B);
  color: #ffffff;
}

.add-ingredient-danger:hover {
  background: #ff5252;
}

.edit-ingredient-btn {
  padding: 0.4rem 0.8rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.edit-ingredient-btn:hover {
  background: var(--secondary-color);
}

.remove-ingredient-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
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

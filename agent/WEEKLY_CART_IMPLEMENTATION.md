# Weekly Cart Implementation

## Overview
This document describes the implementation of the Weekly Cart page for the MenuManager Frontend application.

## Files Created/Modified

### New Files Created:
1. **`src/services/weeklyCartService.js`** - Service for WeeklyCart API integration
2. **`src/services/purchaseSystemService.js`** - Service for PurchaseSystem API integration  
3. **`src/components/WeeklyCartPage.vue`** - Main Weekly Cart page component

### Modified Files:
1. **`src/App.vue`** - Updated with navigation bar and Weekly Cart page integration

## Features Implemented

### Week Navigation
- ✅ Week selector with previous/next week navigation
- ✅ Display week range (Sunday to Saturday)
- ✅ "Go to Current Week" button
- ✅ Week calculation utilities

### Menu Display
- ✅ Grid layout: Su M Tu W Th F E (7 columns)
- ✅ Each day shows the menu for that date (from any user)
- ✅ "E" column shows the extra menu for miscellaneous items
- ✅ Empty days show "No Menu" placeholder
- ✅ Click to view individual menus
- ✅ Shows owner information for menus from other users
- ✅ Only allows removal of menus owned by current user

### Cart Management
- ✅ Automatic cart creation (carts are created automatically when needed)
- ✅ Add menus to existing carts
- ✅ Remove menus from carts
- ✅ View cart details and dates
- ✅ Navigate between weekly carts

### Extra Menu (E)
- ✅ Special CompositeOrder in PurchaseSystem
- ✅ Can add SelectOrders (individual items) directly
- ✅ Parent to the weekly CompositeOrder
- ✅ Same functionality as regular menus but for standalone items

### API Integration
- ✅ WeeklyCart: createCart, deleteCart, addMenuToCart, removeMenuFromCart, _getCartDates, _getMenusInCart, _getCartByDate
- ✅ PurchaseSystem: createCompositeOrder, addSelectOrderToCompositeOrder, removeSelectOrderFromCompositeOrder, createSelectOrder, createAtomicOrder, _getOrderByAssociateID

### UI/UX Features
- ✅ Large, clear week grid layout
- ✅ Prominent "E" column styling
- ✅ Week navigation controls
- ✅ Menu preview cards in each day
- ✅ Responsive design for mobile
- ✅ Loading states and error handling
- ✅ Confirmation dialogs for destructive actions

### Technical Implementation
- ✅ Vue 3 Composition API
- ✅ Service files for WeeklyCart and PurchaseSystem APIs
- ✅ Week calculation logic
- ✅ Existing authentication patterns
- ✅ Existing styling patterns
- ✅ Proper date handling and formatting

### Navigation Integration
- ✅ Added navigation to the main header in App.vue
- ✅ Simple navigation bar with links to all pages
- ✅ Conditional rendering based on current page
- ✅ Maintains existing header design
- ✅ Active page highlighting

## Navigation Structure
- Home
- Store Catalog (placeholder)
- Menus (placeholder)
- Weekly Cart (fully implemented)
- Logout (existing)

## API Endpoints Used

### WeeklyCart API
- `POST /api/WeeklyCart/createCart`
- `POST /api/WeeklyCart/deleteCart`
- `POST /api/WeeklyCart/addMenuToCart`
- `POST /api/WeeklyCart/removeMenuFromCart`
- `POST /api/WeeklyCart/_getCartDates`
- `POST /api/WeeklyCart/_getMenusInCart`
- `POST /api/WeeklyCart/_getCartByDate`

### PurchaseSystem API
- `POST /api/PurchaseSystem/createCompositeOrder`
- `POST /api/PurchaseSystem/addSelectOrderToCompositeOrder`
- `POST /api/PurchaseSystem/removeSelectOrderFromCompositeOrder`
- `POST /api/PurchaseSystem/createSelectOrder`
- `POST /api/PurchaseSystem/createAtomicOrder`
- `POST /api/PurchaseSystem/_getOrderByAssociateID`

## Usage Instructions

1. **Navigate to Weekly Cart**: Click on "Weekly Cart" in the navigation bar
2. **Week Navigation**: Use the Previous/Next Week buttons or "Go to Current Week"
3. **Add Menu**: Click "Add Menu" on any empty day to create a new menu (cart will be created automatically if needed)
4. **View Menu**: Click "View" on any existing menu to see details
5. **Remove Menu**: Click "Remove" on any menu to remove it from the cart
6. **Extra Menu**: Use the "E" column to manage miscellaneous items
7. **View Cart Info**: Use the "View Cart Details" button to see cart information
8. **Weekly Shopping List**: View aggregated ingredients at the bottom of the page

## Future Enhancements

1. **Menu Details Modal**: Implement detailed menu viewing/editing
2. **Item Management**: Add functionality to manage items in the Extra menu
3. **MenuCollection Integration**: Connect with actual MenuCollection API
4. **Recipe Integration**: Connect with CookBook API for recipe management
5. **Purchase Optimization**: Implement cost calculation and optimization features

## Testing

The implementation includes:
- Error handling for API failures
- Loading states during operations
- Confirmation dialogs for destructive actions
- Responsive design for mobile devices
- Proper date formatting and week calculations with UTC timezone handling
- Fixed date calculation issues (2025-10-30 now correctly shows as Thursday)
- Multi-user menu support (shows menus from all users)
- Owner-based access control (only owners can remove their menus)

## Dependencies

- Vue 3 Composition API
- Axios for HTTP requests
- Existing authentication store
- CSS custom properties for theming

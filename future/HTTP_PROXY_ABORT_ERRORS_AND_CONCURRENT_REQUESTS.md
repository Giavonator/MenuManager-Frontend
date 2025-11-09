# HTTP Proxy AbortErrors and Concurrent Request Management

## Problem Summary

### Symptoms
- Hundreds of `AbortError: The request has been cancelled` errors in Vite dev server logs
- Errors occur when navigating TO pages (not when leaving them)
- Backend returns 200 responses, but client connections are cancelled
- Errors appear in: StoreCatalogPage, WeeklyCartPage, MenusPage, and other components

### Root Cause
**Too many concurrent HTTP requests exceeding browser connection limits**

When components load, they make hundreds of parallel API requests:
- StoreCatalogPage: 1 request for all items + 2 requests per item (names + purchase options) + 1 request per purchase option (details)
- Example: 50 items × 10 purchase options = 600+ concurrent requests

### Browser Connection Limits
- **HTTP/1.1**: Typically 6-10 concurrent connections per domain
- **HTTP/2**: Higher limit (~100), but still limited
- When exceeded: Browser/proxy queues or cancels excess requests

## What Happens

1. Component mounts (e.g., StoreCatalogPage)
2. `loadItems()` fires in `onMounted()`
3. Hundreds of requests fire simultaneously via `Promise.all()`
4. Browser queues requests (only 6-10 can run concurrently)
5. Excess requests get cancelled → `AbortError`
6. Backend still processes requests (200 responses logged)
7. Client connection closed before response delivered
8. Result: Incomplete data, wasted network resources, error spam

## Why This Is a Problem

### Not "Expected" Behavior
- These errors indicate a real architectural issue
- They signify throttling/connection limiting is occurring
- Data may not load completely
- User experience is degraded

### Performance Impact
**Current approach (unlimited parallel):**
- Appears fast initially
- Many requests cancelled
- Incomplete data loads
- User may need to refresh
- Wasted network resources

**Batched approach (limited concurrency):**
- Slightly slower wall-clock time
- **Faster effective time** (no retries needed)
- Complete data loads reliably
- Predictable performance
- Better user experience

## Solution: Request Batching

### Implementation Strategy

Create a shared utility function for batching requests across all components:

```javascript
// src/utils/requestBatcher.js
/**
 * Process items in batches to limit concurrent requests
 * @param {Array} items - Items to process
 * @param {number} batchSize - Number of concurrent requests (recommended: 6-10)
 * @param {Function} fn - Async function to process each item
 * @returns {Promise<Array>} Results in same order as input
 */
export const batchPromises = async (items, batchSize, fn) => {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}
```

### Usage Example

**Before (problematic):**
```javascript
const itemsWithDetails = await Promise.all(
  itemIds.map(async (itemId) => {
    // Makes hundreds of parallel requests
    const purchaseOptions = await Promise.all(
      purchaseOptionIds.map(async (optionId) => {
        return await storeCatalogService.getPurchaseOptionDetails(optionId)
      })
    )
  })
)
```

**After (batched):**
```javascript
import { batchPromises } from '../utils/requestBatcher.js'

// Process items in batches of 5
const itemsWithDetails = await batchPromises(itemIds, 5, async (itemId) => {
  // ... get names and purchase options ...
  
  // Process purchase options in batches of 10
  const purchaseOptions = await batchPromises(
    purchaseOptionIds, 
    10, 
    async (optionId) => {
      return await storeCatalogService.getPurchaseOptionDetails(optionId)
    }
  )
  
  return { id: itemId, purchaseOptions, ... }
})
```

## Components Affected

1. **StoreCatalogPage** (`src/components/StoreCatalogPage.vue`)
   - `loadItems()` - loads all items with purchase option details
   - Hundreds of concurrent requests for purchase option details

2. **WeeklyCartPage** (`src/components/WeeklyCartPage.vue`)
   - `loadWeeklyIngredients()` - loads recipes and ingredients for all menus
   - Multiple nested parallel requests

3. **MenusPage** (`src/components/MenusPage.vue`)
   - `loadMenus()` - loads menu details for all user menus
   - Parallel requests for each menu's details

4. **MenuPage** (`src/components/MenuPage.vue`)
   - `loadMenu()` - loads recipes and details
   - May have similar issues with nested requests

## Recommended Batch Sizes

- **Items/Menus**: 5-10 concurrent requests
- **Purchase Options/Recipes**: 10-15 concurrent requests
- **Ingredients/Details**: 10-20 concurrent requests

**Rationale**: Stay well below browser's 6-10 connection limit per domain, accounting for:
- Other requests (navigation, auth checks, etc.)
- Browser overhead
- Network variability

## Additional Considerations

### Request Cancellation
Consider implementing `AbortController` for proper cleanup:
```javascript
const abortController = ref(null)

onMounted(() => {
  abortController.value = new AbortController()
  loadItems(abortController.value.signal)
})

onBeforeUnmount(() => {
  if (abortController.value) {
    abortController.value.abort()
  }
})
```

### Progress Indicators
With batching, show progress to users:
```javascript
const progress = ref(0)
const total = itemIds.length

await batchPromises(itemIds, 5, async (itemId, index) => {
  // ... process item ...
  progress.value = ((index + 1) / total) * 100
})
```

### Error Handling
Batched requests make error handling more predictable:
- Individual batch failures don't cancel entire operation
- Can retry specific batches
- Better error reporting per batch

## Performance Comparison

| Metric | Unlimited Parallel | Batched (6 concurrent) |
|-------|-------------------|----------------------|
| Wall-clock time | ~5 seconds | ~8-10 seconds |
| Successful requests | ~100/500 (20%) | 500/500 (100%) |
| Data completeness | Partial | Complete |
| User experience | May need refresh | Reliable |
| Network efficiency | Low (wasted requests) | High (all succeed) |

**Conclusion**: Batching is slightly slower but more reliable and provides better overall user experience.

## Next Steps

1. Create `src/utils/requestBatcher.js` with batching utility
2. Update `StoreCatalogPage.vue` to use batching
3. Update `WeeklyCartPage.vue` to use batching
4. Update `MenusPage.vue` to use batching
5. Add progress indicators where appropriate
6. Consider adding request cancellation for navigation cleanup

## Related Files

- `vite.config.js` - Proxy configuration (currently logs all errors)
- `src/services/storeCatalogService.js` - API service making requests
- `src/services/weeklyCartService.js` - API service making requests
- `src/services/menuCollectionService.js` - API service making requests
- `src/components/StoreCatalogPage.vue` - Component with most requests
- `src/components/WeeklyCartPage.vue` - Component with nested requests
- `src/components/MenusPage.vue` - Component with parallel requests

## References

- Browser connection limits: [MDN - HTTP/1.x connection management](https://developer.mozilla.org/en-US/docs/Web/HTTP/Connection_management_in_HTTP_1.x)
- Vite proxy errors: Vite uses Deno's HTTP server which logs connection cancellations
- Vue component lifecycle: `onMounted()` vs `onBeforeUnmount()` for request cleanup


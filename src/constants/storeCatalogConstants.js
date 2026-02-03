/**
 * Store Catalog Constants
 * Centralized definitions for stores and units used in the Store Catalog
 *
 * Units are organized into three backend-supported categories:
 * - volume
 * - weight
 * - count (countables, including package-style units)
 *
 * The backend handles all cross-unit conversion within a category.
 */

// Supported stores for purchase options
export const SUPPORTED_STORES = [
  'LMF Bulk',
  'Wegmans',
  'Market Basket',
  'BJ\'s',
  'Wee',
  'Costco',
  'Trader Joes',
  'Whole Foods',
  'Shaws',
  'Star Market',
  'Target',
  'Sam\'s Club',
  'Kroger'
]

// Canonical volume units (Instacart-style)
export const VOLUME_UNITS = [
  { value: 'tsp',   label: 'tsp (teaspoon)' },
  { value: 'tbsp',  label: 'tbsp (table spoon)' },
  { value: 'cup',   label: 'cup' },
  { value: 'fl oz', label: 'fl oz (fluid ounce)' },
  { value: 'pt',    label: 'pt (pint)' },
  { value: 'qt',    label: 'qt (quart)' },
  { value: 'gal',   label: 'gal (gallon)' },
  { value: 'ml',    label: 'ml (milliliter)' },
  { value: 'l',     label: 'l (liter)' }
]

// Canonical weight units
export const WEIGHT_UNITS = [
  { value: 'oz', label: 'oz (ounce)' },
  { value: 'lb', label: 'lb (pound)' },
  { value: 'g',  label: 'g (gram)' },
  { value: 'kg', label: 'kg (kilogram)' }
]

// Canonical count / countable units (includes package-style units)
export const COUNT_UNITS = [
  { value: 'each',    label: 'each' },
  { value: 'dozen',   label: 'dozen' },
  { value: 'package', label: 'package' },
  { value: 'bag',     label: 'bag' },
  { value: 'box',     label: 'box' },
  { value: 'can',     label: 'can' },
  { value: 'bottle',  label: 'bottle' }
]

// All supported units for defining purchase options in the catalog UI
export const SUPPORTED_UNITS = [
  ...VOLUME_UNITS,
  ...WEIGHT_UNITS,
  ...COUNT_UNITS
]

// Unit conversion factors (for potential future use; backend now owns conversion)
export const UNIT_CONVERSIONS = {
  // Volume conversions (to ml)
  tsp:   4.92892,
  tbsp:  14.7868,
  cup:   236.588,
  'fl oz': 29.5735,
  pt:    473.176,
  qt:    946.353,
  gal:   3785.41,
  ml:    1,
  l:     1000,

  // Weight conversions (to g)
  oz: 28.3495,
  lb: 453.592,
  g:  1,
  kg: 1000,

  // Count units (no real-world conversion here – purely relative)
  each:  1,
  dozen: 12,

  // Package-style units (no standard conversion; treated as 1 each)
  package: 1,
  bag:     1,
  box:     1,
  can:     1,
  bottle:  1
}

// Internal map of canonical unit -> category
const UNIT_CATEGORY = {
  // Volume
  tsp:   'volume',
  tbsp:  'volume',
  cup:   'volume',
  'fl oz': 'volume',
  pt:    'volume',
  qt:    'volume',
  gal:   'volume',
  ml:    'volume',
  l:     'volume',

  // Weight
  oz: 'weight',
  lb: 'weight',
  g:  'weight',
  kg: 'weight',

  // Countables
  each:    'count',
  dozen:   'count',
  package: 'count',
  bag:     'count',
  box:     'count',
  can:     'count',
  bottle:  'count'
}

// Optional: alias normalization so older data or user-entered labels still categorize
const UNIT_ALIASES = {
  // Volume aliases
  teaspoon:  'tsp',
  teaspoons: 'tsp',
  tbspn:     'tbsp',
  tablespoon:  'tbsp',
  tablespoons: 'tbsp',
  pint:    'pt',
  pints:   'pt',
  quart:   'qt',
  quarts:  'qt',
  gallon:  'gal',
  gallons: 'gal',
  liter:   'l',
  litres:  'l',
  liters:  'l',
  milliliter:  'ml',
  millilitre:  'ml',
  milliliters: 'ml',
  millilitres: 'ml',

  // Weight aliases
  ounce:   'oz',
  ounces:  'oz',
  pound:   'lb',
  pounds:  'lb'

  // Count aliases can be added here if needed
}

/**
 * Get the normalized category for a unit string:
 * - 'volume'
 * - 'weight'
 * - 'count'
 * - null if unknown
 */
export const getUnitCategory = (unit) => {
  if (!unit) return null
  const raw = unit.toString().trim().toLowerCase()
  const canonical = UNIT_ALIASES[raw] || raw
  return UNIT_CATEGORY[canonical] || null
}

/**
 * Allowed unit values (strings) per category for recipe ingredient selection.
 * These are the units a user may choose in the recipe UI once the category
 * is inferred from the purchase option.
 */
export const ALLOWED_UNITS_BY_CATEGORY = {
  volume: VOLUME_UNITS.map(u => u.value),
  weight: WEIGHT_UNITS.map(u => u.value),
  count:  COUNT_UNITS.map(u => u.value)
}

// Helper function to get store options for select elements
export const getStoreOptions = () => {
  return SUPPORTED_STORES.map(store => ({
    value: store,
    label: store
  }))
}

// Helper function to get unit options for select elements (for purchase options)
export const getUnitOptions = () => {
  return SUPPORTED_UNITS.map(unit => ({
    value: unit.value,
    label: unit.label
  }))
}

// Helper functions by category (use the unified category mapping)
export const isVolumeUnit = (unit) => getUnitCategory(unit) === 'volume'

export const isWeightUnit = (unit) => getUnitCategory(unit) === 'weight'

export const isCountUnit = (unit) => getUnitCategory(unit) === 'count'

// Legacy helper kept for backwards compatibility; treated as countables
export const isPackageUnit = (unit) => {
  const canonical = (unit || '').toString().trim().toLowerCase()
  return ['package', 'bag', 'box', 'can', 'bottle'].includes(canonical)
}


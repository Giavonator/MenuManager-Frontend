/**
 * Store Catalog Constants
 * Centralized definitions for stores and units used in the Store Catalog
 */

// Supported stores for purchase options
export const SUPPORTED_STORES = [
  'Wegmans',
  'Market Basket', 
  'Wee',
  'Costco',
  'Trader Joes',
  'LMF Bulk',
  'Whole Foods',
  'Stop & Shop',
  'Shaws',
  'Star Market',
  'Target',
  'Walmart',
  'BJ\'s',
  'Sam\'s Club',
  'Aldi',
  'Lidl',
  'Safeway',
  'Giant',
  'Food Lion',
  'Kroger',
  'Publix',
  'Other'
]

// Supported units for purchase options
export const SUPPORTED_UNITS = [
  // Volume units
  { value: 'tsp', label: 'tsp (teaspoon)' },
  { value: 'tbsp', label: 'tbsp (tablespoon)' },
  { value: 'cup', label: 'cup' },
  { value: 'fl oz', label: 'fl oz (fluid ounce)' },
  { value: 'pt', label: 'pt (pint)' },
  { value: 'qt', label: 'qt (quart)' },
  { value: 'gal', label: 'gal (gallon)' },
  { value: 'ml', label: 'ml (milliliter)' },
  { value: 'l', label: 'l (liter)' },
  
  // Weight units
  { value: 'oz', label: 'oz (ounce)' },
  { value: 'lb', label: 'lb (pound)' },
  { value: 'g', label: 'g (gram)' },
  { value: 'kg', label: 'kg (kilogram)' },
  
  // Count units
  { value: 'each', label: 'each' },
  { value: 'dozen', label: 'dozen' },
  
  // Package units
  { value: 'package', label: 'package' },
  { value: 'bag', label: 'bag' },
  { value: 'box', label: 'box' },
  { value: 'can', label: 'can' },
  { value: 'bottle', label: 'bottle' }
]

// Unit conversion factors (for future use)
export const UNIT_CONVERSIONS = {
  // Volume conversions (to ml)
  'tsp': 4.92892,
  'tbsp': 14.7868,
  'cup': 236.588,
  'fl oz': 29.5735,
  'pt': 473.176,
  'qt': 946.353,
  'gal': 3785.41,
  'ml': 1,
  'l': 1000,
  
  // Weight conversions (to g)
  'oz': 28.3495,
  'lb': 453.592,
  'g': 1,
  'kg': 1000,
  
  // Count units (no conversion)
  'each': 1,
  'dozen': 12,
  
  // Package units (no standard conversion)
  'package': 1,
  'bag': 1,
  'box': 1,
  'can': 1,
  'bottle': 1
}

// Helper function to get store options for select elements
export const getStoreOptions = () => {
  return SUPPORTED_STORES.map(store => ({
    value: store,
    label: store
  }))
}

// Helper function to get unit options for select elements
export const getUnitOptions = () => {
  return SUPPORTED_UNITS.map(unit => ({
    value: unit.value,
    label: unit.label
  }))
}

// Helper function to check if a unit is a volume unit
export const isVolumeUnit = (unit) => {
  const volumeUnits = ['tsp', 'tbsp', 'cup', 'fl oz', 'pt', 'qt', 'gal', 'ml', 'l']
  return volumeUnits.includes(unit)
}

// Helper function to check if a unit is a weight unit
export const isWeightUnit = (unit) => {
  const weightUnits = ['oz', 'lb', 'g', 'kg']
  return weightUnits.includes(unit)
}

// Helper function to check if a unit is a count unit
export const isCountUnit = (unit) => {
  const countUnits = ['each', 'dozen']
  return countUnits.includes(unit)
}

// Helper function to check if a unit is a package unit
export const isPackageUnit = (unit) => {
  const packageUnits = ['package', 'bag', 'box', 'can', 'bottle']
  return packageUnits.includes(unit)
}

/**
 * Shared API Client Utility
 * Creates axios instances with automatic Authorization header injection
 */

import axios from 'axios'

// Use Vite proxy in development, Cloudflare Functions in production
// In dev mode: empty string uses Vite proxy to localhost:8000
// In production: /api routes through Cloudflare Functions
const API_BASE_URL = import.meta.env.DEV ? '' : '/api'
const SESSION_BODY_ENDPOINTS = new Set([
  '/api/MenuCollection/createMenu',
  '/api/MenuCollection/updateMenu',
  '/api/MenuCollection/deleteMenu',
  '/api/MenuCollection/addRecipe',
  '/api/MenuCollection/removeRecipe',
  '/api/MenuCollection/changeRecipeScaling',
  '/api/CookBook/updateRecipe',
  '/api/CookBook/addRecipeIngredient',
  '/api/CookBook/updateRecipeIngredient',
  '/api/CookBook/removeRecipeIngredient',
  '/api/StoreCatalog/deleteItem',
  '/api/StoreCatalog/addPurchaseOption',
  '/api/StoreCatalog/updatePurchaseOption',
  '/api/StoreCatalog/removePurchaseOption',
  '/api/StoreCatalog/confirmPurchaseOption',
  '/api/StoreCatalog/updateItemName',
  '/api/PurchaseSystem/purchaseOrder'
])

/**
 * Creates a configured axios instance with Authorization header interceptor
 * The Authorization header is automatically added if a session token exists in localStorage
 * @returns {AxiosInstance} Configured axios instance
 */
export function createApiClient() {
  // Create axios instance with default configuration
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 second timeout
    withCredentials: false, // Don't send cookies
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  })

  // Request interceptor: Add Authorization header if session token exists
  apiClient.interceptors.request.use(
    (config) => {
      const sessionToken = localStorage.getItem('menumanager_session_token')
      if (SESSION_BODY_ENDPOINTS.has(config?.url)) {
        const dataType = Object.prototype.toString.call(config?.data)
        const headerKeys = config?.headers ? Object.keys(config.headers) : []
        const hasTransformRequest = Array.isArray(config?.transformRequest) && config.transformRequest.length > 0
        console.log('[ApiClient] request body', {
          url: config?.url,
          method: config?.method,
          data: config?.data,
          dataSerialized: JSON.parse(JSON.stringify(config?.data || {})),
          dataType,
          headerKeys,
          hasTransformRequest
        })
      }
      if (sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (SESSION_BODY_ENDPOINTS.has(error?.config?.url)) {
        let configDataSerialized = null
        try {
          configDataSerialized = JSON.parse(JSON.stringify(error?.config?.data || {}))
        } catch (serializationError) {
          console.warn('[ApiClient] error config data serialization failed', serializationError)
        }
        console.log('[ApiClient] request error diagnostics', {
          url: error?.config?.url,
          method: error?.config?.method,
          configData: error?.config?.data,
          configDataSerialized,
          responseText: error?.request?.responseText || null
        })
      }
      return Promise.reject(error)
    }
  )

  return apiClient
}


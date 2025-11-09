/**
 * Shared API Client Utility
 * Creates axios instances with automatic Authorization header injection
 */

import axios from 'axios'

// Use proxy in development, direct URL in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:8000')

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
      if (sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  return apiClient
}


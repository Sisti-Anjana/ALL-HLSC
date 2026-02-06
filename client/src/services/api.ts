import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse } from '../types/api.types'

const API_BASE_URL = '/api'

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout to prevent hanging requests
})

// Request interceptor to add auth token and tenant_id for super admin
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add tenant_id query parameter for super admin if selected
    // Only add if it's a valid non-empty value (not null or empty string)
    const selectedTenantId = localStorage.getItem('selectedTenantId')
    if (selectedTenantId && selectedTenantId !== 'null' && selectedTenantId.trim() !== '') {
      // Ensure params object exists
      if (!config.params) {
        config.params = {}
      }
      // Add tenant_id to params
      config.params.tenant_id = selectedTenantId
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        console.error('❌ Request timeout - Server took too long to respond')
        error.message = 'Request timeout. The server is taking too long to respond. Please check if the server is running.'
      } else if (error.code === 'ERR_NETWORK') {
        console.error('❌ Network error - Cannot connect to server')
        error.message = 'Network error. Cannot connect to the server. Please check if the server is running at ' + API_BASE_URL
      } else {
        console.error('❌ Network error:', error.message, error.code)
        error.message = error.message || 'Network error. Please check your connection and try again.'
      }
    }

    // Handle HTTP errors
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname

      // If the request had a tenant_id, it might be invalid (bad cache)
      // Clear it and reload/redirect to dashboard
      if (error.config?.params?.tenant_id) {
        console.warn('❌ Invalid Tenant ID detected, clearing cache and reloading...')
        localStorage.removeItem('selectedTenantId')
        window.location.href = '/'
        return Promise.reject(error)
      }

      if (currentPath !== '/login' && currentPath !== '/admin/login') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api


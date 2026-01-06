import api from './api'
import { ApiResponse } from '../types/api.types'

export interface AuthResponse {
  token?: string
  user?: {
    userId: string
    tenantId: string
    email: string
    fullName: string
    role: string
    tenantName?: string
  }
  multiple?: boolean
  accounts?: Array<{
    userId: string
    tenantId: string
    tenantName: string
    role: string
  }>
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
  tenantId?: string
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    console.log('🔐 Sending login request:', { email: credentials.email, password: '***', tenantId: credentials.tenantId })
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
        tenantId: credentials.tenantId,
      })
      console.log('✅ Login response received:', response.data)
      if (!response.data.data) {
        throw new Error('Invalid response from server')
      }
      return response.data.data
    } catch (error: any) {
      console.error('❌ Login request failed:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw error
    }
  },

  switchTenant: async (tenantId: string): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/switch-tenant', { tenantId })
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to switch client')
  },

  adminLogin: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/admin/login', credentials)
    return response.data.data!
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  getCurrentUser: async () => {
    const response = await api.get<ApiResponse>('/auth/me')
    return response.data.data
  },
}


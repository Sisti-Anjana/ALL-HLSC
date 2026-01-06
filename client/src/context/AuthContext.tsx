import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: any | null
  loading: boolean
  login: (credentials: any) => Promise<any>
  logout: () => void
  isAuthenticated: boolean
  availableTenants: any[]
  setAvailableTenants: (tenants: any[]) => void
  switchTenant: (tenantId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize user from localStorage if token exists
  const [user, setUser] = useState<any | null>(() => {
    try {
      const storedUser = localStorage.getItem('user')
      const token = localStorage.getItem('auth_token')
      if (storedUser && token) {
        return JSON.parse(storedUser)
      }
    } catch (error) {
      console.error('Error parsing stored user:', error)
    }
    return null
  })

  const [availableTenants, setAvailableTenants] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('available_tenants')
      return stored ? JSON.parse(stored) : []
    } catch (e) {
      return []
    }
  })

  const [loading, setLoading] = useState(false)

  const login = async (credentials: any) => {
    setLoading(true)
    console.log('🔐 AuthContext - Starting login process...')
    try {
      const { authService } = await import('../services/authService')
      console.log('🔐 AuthContext - Calling authService.login...')
      const response = await authService.login(credentials)

      // Handle multi-tenant response (list of accounts)
      if (response.multiple) {
        console.log('🏢 AuthContext - Multiple accounts found, returning for selection')
        return response
      }

      if (!response.token || !response.user) {
        throw new Error('Login response missing token or user data')
      }

      console.log('✅ AuthContext - Login successful, saving to localStorage')
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      console.log('✅ AuthContext - User state updated')
      return response
    } catch (error: any) {
      console.error('❌ AuthContext - Login error:', error)
      console.error('❌ Error type:', error.constructor.name)
      console.error('❌ Error code:', error.code)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error response:', error.response?.data)
      console.error('❌ Error status:', error.response?.status)

      // Determine user-friendly error message
      let errorMessage = 'Login failed'

      if (error.message) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. The server is taking too long to respond. Please check if the server is running.'
        } else if (error.message.includes('Network error') || error.message.includes('Cannot connect')) {
          errorMessage = 'Cannot connect to server. Please check if the server is running and try again.'
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else {
          errorMessage = error.message
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      // Show user-friendly error message
      const userMessage = errorMessage.includes('Invalid email or password')
        ? 'Invalid email or password. Please check your credentials.'
        : errorMessage.includes('Database error')
          ? 'Database connection error. Please check server configuration.'
          : errorMessage.includes('timeout')
            ? 'Server timeout. Please check if the server is running.'
            : errorMessage.includes('Network error') || errorMessage.includes('Cannot connect')
              ? 'Cannot connect to server. Please check if the server is running.'
              : errorMessage.includes('email')
                ? 'Please enter a valid email address.'
                : errorMessage.includes('password')
                  ? 'Password is required.'
                  : errorMessage

      // Use toast instead of alert for better UX
      toast.error(userMessage)
      throw error
    } finally {
      setLoading(false)
      console.log('🔐 AuthContext - Login process completed (loading set to false)')
    }
  }

  const queryClient = useQueryClient()

  const switchTenant = async (tenantId: string) => {
    setLoading(true)
    try {
      const { authService } = await import('../services/authService')
      const response = await authService.switchTenant(tenantId)

      localStorage.setItem('auth_token', response.token!)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      toast.success(`Switched to ${response.user?.tenantName}`)

      // Refetch all queries to update UI with new tenant data
      await queryClient.resetQueries()
      await queryClient.invalidateQueries()

      // Navigate to dashboard to ensure clean state
      // window.location.href = '/' // Optional: force navigation to dashboard if needed
    } catch (error: any) {
      console.error('Switch tenant error:', error)
      toast.error(error.message || 'Failed to switch tenant')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    localStorage.removeItem('available_tenants')
    setUser(null)
    setAvailableTenants([])
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        availableTenants,
        setAvailableTenants: (tenants: any[]) => {
          localStorage.setItem('available_tenants', JSON.stringify(tenants))
          setAvailableTenants(tenants)
        },
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


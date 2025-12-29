import React, { createContext, useContext, useState, ReactNode } from 'react'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: any | null
  loading: boolean
  login: (credentials: any) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
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
  const [loading, setLoading] = useState(false)

  const login = async (credentials: any) => {
    setLoading(true)
    console.log('🔐 AuthContext - Starting login process...')
    try {
      const { authService } = await import('../services/authService')
      console.log('🔐 AuthContext - Calling authService.login...')
      const response = await authService.login(credentials)
      console.log('✅ AuthContext - Login successful, saving to localStorage')
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      console.log('✅ AuthContext - User state updated')
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

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


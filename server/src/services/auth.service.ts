import { supabase } from '../config/database.config'
import { hashPassword, comparePassword } from '../utils/password.util'
import { generateToken } from '../utils/jwt.util'

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log('🔍 Looking up user:', credentials.email)
      
      // Use case-insensitive email search (ilike) instead of converting to lowercase
      // This handles emails with mixed case like ShreeY@amgsol.com
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('user_id, email, password_hash, full_name, role, tenant_id, is_active, tenant:tenants(*)')
        .ilike('email', credentials.email)
        .limit(1)

      if (fetchError) {
        console.error('❌ Database error details:')
        console.error('   Message:', fetchError.message)
        console.error('   Code:', fetchError.code)
        console.error('   Details:', fetchError.details)
        console.error('   Hint:', fetchError.hint)
        throw new Error(`Database error: ${fetchError.message}`)
      }

      if (!users || users.length === 0) {
        console.log('❌ User not found:', credentials.email)
        throw new Error('Invalid email or password')
      }

      const user = users[0]
      console.log('✅ User found:', user.email, 'Role:', user.role)
      console.log('   User active:', user.is_active)
      console.log('   Has password hash:', !!user.password_hash)
      console.log('   Hash preview:', user.password_hash ? user.password_hash.substring(0, 30) + '...' : 'NULL')

      if (!user.is_active) {
        console.log('❌ User is inactive')
        throw new Error('Invalid email or password')
      }

      if (!user.password_hash) {
        console.log('❌ No password hash found')
        throw new Error('Invalid email or password')
      }

      console.log('🔐 Comparing password...')
      console.log('   Input password length:', credentials.password.length)
      console.log('   Stored hash length:', user.password_hash.length)
      console.log('   Hash starts with:', user.password_hash.substring(0, 7))
      
      const isValidPassword = await comparePassword(credentials.password, user.password_hash)
      console.log('🔐 Password match result:', isValidPassword)

      if (!isValidPassword) {
        console.log('❌ Password comparison failed!')
        console.log('   This means the password you entered does not match the hash in the database.')
        console.log('   Double-check:')
        console.log('   1. Did you run the UPDATE query in Supabase?')
        console.log('   2. Is the password exactly: Shree@2025Y (case-sensitive)?')
        throw new Error('Invalid email or password')
      }

      // Super admin can have null tenant_id (not assigned to any client)
      // Regular users and tenant admins must have a tenant_id
      if (!user.tenant_id && user.role !== 'super_admin') {
        throw new Error('User tenant not found')
      }
      
      // If tenant relationship didn't load and user has a tenant_id, fetch it separately
      if (user.tenant_id && !user.tenant) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name, status')
          .eq('tenant_id', user.tenant_id)
          .single()
        
        if (!tenantData) {
          throw new Error('User tenant not found')
        }
        
        user.tenant = tenantData
      }

      const token = generateToken({
        userId: user.user_id,
        tenantId: user.tenant_id || null, // Super admin can have null tenant_id
        email: user.email,
        role: user.role,
      })

      return {
        token,
        user: {
          id: user.user_id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: user.tenant_id,
          tenantName: (user.tenant as any)?.name,
        },
      }
    } catch (error: any) {
      console.error('Login service error:', error.message)
      throw error
    }
  },

  adminLogin: async (credentials: { email: string; password: string }) => {
    const result = await authService.login(credentials)
    
    if (result.user.role !== 'tenant_admin' && result.user.role !== 'super_admin') {
      throw new Error('Admin access required')
    }

    return result
  },

  register: async (data: { email: string; password: string; fullName: string; tenantId?: string }) => {
    const passwordHash = await hashPassword(data.password)

    const userData: any = {
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      full_name: data.fullName,
      role: 'user',
    }

    if (data.tenantId) {
      userData.tenant_id = data.tenantId
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert(userData)
      .select('user_id, email, full_name, role, tenant_id')
      .single()

    if (error) {
      throw new Error(`Registration failed: ${error.message}`)
    }

    const token = generateToken({
      userId: user.user_id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        tenantId: user.tenant_id,
      },
    }
  },

  refreshToken: async (data: { token: string }) => {
    // Implement token refresh logic
    throw new Error('Token refresh not implemented')
  },

  getCurrentUser: async (userId: string) => {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, tenant_id, is_active, tenant:tenants(*)')
      .eq('user_id', userId)
      .single()

    if (error || !user) {
      throw new Error('User not found')
    }

    return {
      id: user.user_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: (user.tenant as any)?.name,
    }
  },

  forgotPassword: async (email: string) => {
    // Implement password reset email logic
    throw new Error('Password reset not implemented')
  },

  resetPassword: async (data: { token: string; password: string }) => {
    // Implement password reset logic
    throw new Error('Password reset not implemented')
  },
}


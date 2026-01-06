import { supabase } from '../config/database.config'
import { hashPassword, comparePassword } from '../utils/password.util'
import { generateToken } from '../utils/jwt.util'

export const authService = {
  login: async (credentials: { email: string; password: string; tenantId?: string }) => {
    try {
      console.log('🔍 Looking up user:', credentials.email)

      // 1. Fetch ALL users with this email (remove limit(1))
      // Use case-insensitive email search
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('user_id, email, password_hash, full_name, role, tenant_id, is_active, tenant:tenants(*)')
        .ilike('email', credentials.email)

      if (fetchError) {
        console.error('❌ Database error details:', fetchError)
        throw new Error(`Database error: ${fetchError.message}`)
      }

      if (!users || users.length === 0) {
        console.log('❌ User not found:', credentials.email)
        throw new Error('Invalid email or password')
      }

      // 2. Verify password against the first active user found
      // We assume if they are the same person, they likely use the same password.
      // Or we can try to match against *any* of the found users.
      // For simplicity and security, we'll try to match against the first one that has a password hash.
      const userForAuth = users.find(u => u.password_hash && u.is_active)

      if (!userForAuth) {
        console.log('❌ No active user with password found')
        throw new Error('Invalid email or password')
      }

      const isValidPassword = await comparePassword(credentials.password, userForAuth.password_hash)
      console.log('🔐 Password match result:', isValidPassword)

      if (!isValidPassword) {
        throw new Error('Invalid email or password')
      }

      // 3. Handle Duplicate Users (Multi-Tenant)
      // Filter to only active users with active tenants
      const validAccounts = users.filter(u =>
        u.is_active &&
        (u.role === 'super_admin' || (u.tenant && (u.tenant as any).status !== 'deleted'))
      )

      if (validAccounts.length === 0) {
        throw new Error('No active accounts found')
      }

      // If specific tenant requested, find that user
      let targetUser = validAccounts[0]

      if (credentials.tenantId) {
        const found = validAccounts.find(u => u.tenant_id === credentials.tenantId)
        if (found) {
          targetUser = found
        } else {
          // Requested tenant not found in list of valid accounts for this email
          throw new Error('You do not have access to the selected client')
        }
      } else if (validAccounts.length > 1) {
        // MULTIPLE ACCOUNTS FOUND and no tenant specified
        // Return list for selection
        console.log('🏢 Multiple accounts found for user:', validAccounts.length)
        return {
          multiple: true,
          accounts: validAccounts.map(u => ({
            userId: u.user_id,
            tenantId: u.tenant_id,
            tenantName: (u.tenant as any)?.name || 'System Admin',
            role: u.role
          }))
        }
      }

      // SINGLE ACCOUNT or SPECIFIC TENANT SELECTED -> Proceed to login
      const user = targetUser
      console.log('✅ Logging in user:', user.email, 'Tenant:', (user.tenant as any)?.name)

      const token = generateToken({
        userId: user.user_id,
        tenantId: user.tenant_id || null,
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

    // Handle multi-tenant response for admins (unlikely to happen in current flow, but for type safety)
    if ('multiple' in result && result.multiple) {
      throw new Error('Ambiguous admin account. Please contact support.')
    }

    // Now securely cast or access as single user result
    const userResult = result as { user: any, token: string }

    if (userResult.user.role !== 'tenant_admin' && userResult.user.role !== 'super_admin') {
      throw new Error('Admin access required')
    }

    return userResult
  },

  switchTenant: async (email: string, targetTenantId: string) => {
    try {
      console.log('🔄 Switching tenant for user:', email, 'Target Tenant:', targetTenantId)

      // 1. Fetch user records for this email
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('user_id, email, full_name, role, tenant_id, is_active, tenant:tenants(*)')
        .ilike('email', email)

      if (fetchError || !users) {
        throw new Error('User not found')
      }

      // 2. Find the specific user account for the target tenant
      const targetUser = users.find(u => u.tenant_id === targetTenantId && u.is_active)

      if (!targetUser) {
        throw new Error('You do not have access to this client')
      }

      // 3. Verify the tenant is active
      if (targetUser.tenant && (targetUser.tenant as any).status !== 'active') {
        if ((targetUser.tenant as any).status === 'deleted' || (targetUser.tenant as any).status === 'suspended') {
          throw new Error('Client account is not active')
        }
      }

      console.log('✅ Found valid target user account:', targetUser.user_id)

      // 4. Generate new token
      const token = generateToken({
        userId: targetUser.user_id,
        tenantId: targetUser.tenant_id,
        email: targetUser.email,
        role: targetUser.role,
      })

      return {
        token,
        user: {
          id: targetUser.user_id,
          email: targetUser.email,
          fullName: targetUser.full_name,
          role: targetUser.role,
          tenantId: targetUser.tenant_id,
          tenantName: (targetUser.tenant as any)?.name,
        },
      }

    } catch (error: any) {
      console.error('Switch tenant error:', error.message)
      throw error
    }
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


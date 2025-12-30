import { supabase } from '../config/database.config'
import { hashPassword } from '../utils/password.util'

export const adminService = {
  getUsers: async (tenantId: string | null) => {
    // Super admin without selected tenant should return empty array
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return []
    }

    const { data, error } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, is_active, created_at, last_login')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch users: ${error.message}`)
    // Map user_id to id for frontend compatibility
    return (data || []).map(user => ({ ...user, id: user.user_id }))
  },

  createUser: async (tenantId: string, userData: any) => {
    // Validate required fields
    if (!userData.email) {
      throw new Error('Email is required')
    }
    if (!userData.password) {
      throw new Error('Password is required')
    }
    if (!userData.fullName) {
      throw new Error('Full name is required')
    }
    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Validate full_name - ensure it's not a password
    const fullName = userData.fullName.trim()
    if (fullName.length > 100) {
      throw new Error('Full name is too long. Please enter a valid name (max 100 characters)')
    }
    if (!fullName.includes(' ') && fullName.length > 20) {
      throw new Error('Full name appears invalid. Please enter first and last name separated by a space')
    }
    // Check if full_name looks like a password (no spaces, very long, etc.)
    if (fullName.length > 50 && !fullName.includes(' ')) {
      throw new Error('Full name appears to be invalid. Please enter a proper name with first and last name')
    }

    const email = userData.email.toLowerCase().trim()
    const passwordHash = await hashPassword(userData.password)

    const { data, error } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        email: email,
        password_hash: passwordHash,
        full_name: fullName,
        role: userData.role || 'user',
        is_active: true,
      })
      .select('user_id, email, full_name, role, is_active, created_at')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      // Handle specific database errors
      if (error.code === '23505') {
        throw new Error('A user with this email already exists')
      }
      throw new Error(`Failed to create user: ${error.message}`)
    }
    // Map user_id to id for frontend compatibility
    return data ? { ...data, id: data.user_id } : null
  },

  updateUser: async (tenantId: string, userId: string, userData: any) => {
    const updateData: any = {}
    if (userData.fullName) {
      const fullName = userData.fullName.trim()
      // Validate full_name - ensure it's not a password
      if (fullName.length > 100) {
        throw new Error('Full name is too long. Please enter a valid name (max 100 characters)')
      }
      if (!fullName.includes(' ') && fullName.length > 20) {
        throw new Error('Full name appears invalid. Please enter first and last name separated by a space')
      }
      // Check if full_name looks like a password (no spaces, very long, etc.)
      if (fullName.length > 50 && !fullName.includes(' ')) {
        throw new Error('Full name appears to be invalid. Please enter a proper name with first and last name')
      }
      updateData.full_name = fullName
    }
    if (userData.role) updateData.role = userData.role
    if (userData.is_active !== undefined) updateData.is_active = userData.is_active
    if (userData.password) {
      updateData.password_hash = await hashPassword(userData.password)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select('user_id, email, full_name, role, is_active')
      .single()

    if (error) throw new Error(`Failed to update user: ${error.message}`)
    // Map user_id to id for frontend compatibility
    return data ? { ...data, id: data.user_id } : null
  },

  deleteUser: async (tenantId: string, userId: string) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)

    if (error) throw new Error(`Failed to delete user: ${error.message}`)
    return { success: true }
  },

  getPersonnel: async (tenantId: string) => {
    const { data, error } = await supabase
      .from('monitored_personnel')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })

    if (error) throw new Error(`Failed to fetch personnel: ${error.message}`)
    return data || []
  },

  createPersonnel: async (tenantId: string, personnelData: any) => {
    const { data, error } = await supabase
      .from('monitored_personnel')
      .insert({
        tenant_id: tenantId,
        name: personnelData.name,
        role: personnelData.role || 'monitor',
        is_active: true,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create personnel: ${error.message}`)
    return data
  },

  updatePersonnel: async (tenantId: string, personnelId: string, personnelData: any) => {
    const { data, error } = await supabase
      .from('monitored_personnel')
      .update(personnelData)
      .eq('tenant_id', tenantId)
      .eq('id', personnelId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update personnel: ${error.message}`)
    return data
  },

  deletePersonnel: async (tenantId: string, personnelId: string) => {
    const { error } = await supabase
      .from('monitored_personnel')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', personnelId)

    if (error) throw new Error(`Failed to delete personnel: ${error.message}`)
    return { success: true }
  },

  getLocks: async (tenantId: string | null) => {
    // Super admin without selected tenant should return empty array
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return []
    }
    try {
      // First, clean up expired locks
      const { error: cleanupError } = await supabase
        .from('hour_reservations')
        .delete()
        .eq('tenant_id', tenantId)
        .lt('expires_at', new Date().toISOString())

      if (cleanupError) {
        console.error('Error cleaning up expired locks:', cleanupError)
        // Don't throw - continue to fetch active locks
      }

      console.log('Fetching locks for tenant:', tenantId)
      // First fetch locks without join to see what we have
      const { data: locksData, error: locksError } = await supabase
        .from('hour_reservations')
        .select('*')
        .eq('tenant_id', tenantId)
        .gt('expires_at', new Date().toISOString())
        .order('reserved_at', { ascending: false })

      if (locksError) {
        console.error('Error fetching locks:', locksError)
        throw new Error(`Failed to fetch locks: ${locksError.message}`)
      }

      // Now fetch portfolio names for each lock and clean up stale locks
      const locksWithPortfolios = await Promise.all(
        (locksData || []).map(async (lock) => {
          let portfolioName = null
          let isStaleLock = false
          console.log(`Fetching portfolio for lock: portfolio_id=${lock.portfolio_id}, tenant_id=${tenantId}`)

          if (lock.portfolio_id) {
            // Try with tenant_id first
            const { data: portfolio, error: portfolioError } = await supabase
              .from('portfolios')
              .select('name')
              .eq('portfolio_id', lock.portfolio_id)
              .eq('tenant_id', tenantId)
              .single()

            if (portfolioError) {
              console.error(`Error fetching portfolio ${lock.portfolio_id} with tenant ${tenantId}:`, portfolioError)
              // Try without tenant_id check
              const { data: portfolioAlt, error: portfolioAltError } = await supabase
                .from('portfolios')
                .select('name')
                .eq('portfolio_id', lock.portfolio_id)
                .single()

              if (portfolioAltError) {
                console.error(`Error fetching portfolio ${lock.portfolio_id} without tenant:`, portfolioAltError)
                // Portfolio doesn't exist - this is a stale lock
                isStaleLock = true
                console.log(`Detected stale lock for non-existent portfolio: ${lock.portfolio_id}`)

                // Automatically clean up stale lock
                const { error: deleteError } = await supabase
                  .from('hour_reservations')
                  .delete()
                  .eq('id', lock.id)

                if (deleteError) {
                  console.error('Error deleting stale lock:', deleteError)
                } else {
                  console.log('Stale lock cleaned up successfully')
                }
              } else if (portfolioAlt) {
                portfolioName = portfolioAlt.name
                console.log(`Found portfolio name (without tenant check): ${portfolioName}`)
              }
            } else if (portfolio) {
              portfolioName = portfolio.name
              console.log(`Found portfolio name: ${portfolioName}`)
            }
          } else {
            console.error(`Lock ${lock.id} has no portfolio_id - invalid lock`)
            isStaleLock = true

            // Automatically clean up invalid lock
            const { error: deleteError } = await supabase
              .from('hour_reservations')
              .delete()
              .eq('id', lock.id)

            if (deleteError) {
              console.error('Error deleting invalid lock:', deleteError)
            } else {
              console.log('Invalid lock cleaned up successfully')
            }
          }

          // Return null for stale locks so they're filtered out
          if (isStaleLock) {
            return null
          }

          // Always return portfolio object, even if name is null (show ID as fallback)
          return {
            ...lock,
            portfolio: {
              id: lock.portfolio_id || 'N/A',
              name: portfolioName || `Portfolio ID: ${lock.portfolio_id || 'N/A'}`
            }
          }
        })
      )

      // Filter out null values (stale locks that were cleaned up)
      const validLocks = locksWithPortfolios.filter(lock => lock !== null)

      console.log('Locks fetched successfully:', validLocks?.length || 0, `(cleaned up ${(locksWithPortfolios?.length || 0) - (validLocks?.length || 0)} stale locks)`)
      return validLocks || []
    } catch (error: any) {
      console.error('Exception in getLocks:', error)
      throw error
    }
  },

  unlockPortfolio: async (tenantId: string, portfolioId: string) => {
    const { error } = await supabase
      .from('hour_reservations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('portfolio_id', portfolioId)

    if (error) throw new Error(`Failed to unlock portfolio: ${error.message}`)
    return { success: true }
  },

  unlockAllLocksForUser: async (tenantId: string, userEmail: string) => {
    const { error } = await supabase
      .from('hour_reservations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('monitored_by', userEmail)

    if (error) throw new Error(`Failed to unlock all locks: ${error.message}`)
    return { success: true, message: 'All your locks have been unlocked' }
  },

  getLogs: async (tenantId: string) => {
    const { data, error } = await supabase
      .from('portfolio_completions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) {
      console.error('❌ adminService.getLogs DB Error:', error)
      throw new Error(`Failed to fetch logs: ${error.message}`)
    }
    return (data || []).map((log: any) => ({ ...log, log_id: log.id }))
  },

  createLog: async (tenantId: string, logData: any) => {
    const { data, error } = await supabase
      .from('portfolio_completions')
      .insert({
        tenant_id: tenantId,
        admin_name: logData.adminName,
        action_type: logData.actionType,
        action_description: logData.actionDescription,
        related_portfolio_id: logData.relatedPortfolioId || null,
        related_user_id: logData.relatedUserId || null,
        metadata: logData.metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ [ADMIN_SERVICE] Log Insert Error:`, error)
      throw new Error(`Failed to create log: ${error.message}`)
    }

    // Map id to log_id for frontend backward compatibility
    return data ? { ...data, log_id: data.id } : null
  },

  // Tenant Management (Super Admin Only)
  getAllTenants: async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('tenant_id, name, subdomain, contact_email, status, subscription_plan, created_at, updated_at')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch tenants: ${error.message}`)
    return data || []
  },

  getTenantById: async (tenantId: string) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('tenant_id, name, subdomain, contact_email, status, subscription_plan, settings, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .single()

    if (error) throw new Error(`Failed to fetch tenant: ${error.message}`)
    return data
  },

  createTenant: async (tenantData: any) => {
    // Validate required fields
    if (!tenantData.name) {
      throw new Error('Tenant name is required')
    }
    if (!tenantData.subdomain) {
      throw new Error('Subdomain is required')
    }
    if (!tenantData.contactEmail) {
      throw new Error('Contact email is required')
    }

    // Validate subdomain format (lowercase, alphanumeric, hyphens only)
    const subdomainRegex = /^[a-z0-9-]+$/
    if (!subdomainRegex.test(tenantData.subdomain)) {
      throw new Error('Subdomain must be lowercase alphanumeric with hyphens only')
    }

    // Check if subdomain already exists
    const { data: existing } = await supabase
      .from('tenants')
      .select('tenant_id')
      .eq('subdomain', tenantData.subdomain.toLowerCase())
      .single()

    if (existing) {
      throw new Error('Subdomain already exists')
    }

    // Check if name already exists
    const { data: existingName } = await supabase
      .from('tenants')
      .select('tenant_id')
      .eq('name', tenantData.name.trim())
      .single()

    if (existingName) {
      throw new Error('Tenant name already exists')
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantData.name.trim(),
        subdomain: tenantData.subdomain.toLowerCase().trim(),
        contact_email: tenantData.contactEmail.toLowerCase().trim(),
        status: tenantData.status || 'active',
        subscription_plan: tenantData.subscriptionPlan || null,
        settings: tenantData.settings || {},
      })
      .select('tenant_id, name, subdomain, contact_email, status, subscription_plan, created_at')
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      throw new Error(`Failed to create tenant: ${tenantError.message}`)
    }

    // Create first admin user if provided
    if (tenantData.adminEmail && tenantData.adminPassword && tenantData.adminName) {
      const passwordHash = await hashPassword(tenantData.adminPassword)

      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .insert({
          tenant_id: tenant.tenant_id,
          email: tenantData.adminEmail.toLowerCase().trim(),
          password_hash: passwordHash,
          full_name: tenantData.adminName.trim(),
          role: 'tenant_admin',
          is_active: true,
        })
        .select('user_id, email, full_name, role')
        .single()

      if (userError) {
        console.error('Error creating admin user:', userError)
        // Don't fail the tenant creation, just log the error
        console.warn('Tenant created but admin user creation failed. Admin user can be created manually.')
      } else {
        return {
          tenant,
          adminUser,
        }
      }
    }

    return { tenant }
  },

  updateTenant: async (tenantId: string, tenantData: any) => {
    const updateData: any = {}

    if (tenantData.name !== undefined) updateData.name = tenantData.name.trim()
    if (tenantData.subdomain !== undefined) {
      const subdomainRegex = /^[a-z0-9-]+$/
      if (!subdomainRegex.test(tenantData.subdomain)) {
        throw new Error('Subdomain must be lowercase alphanumeric with hyphens only')
      }
      updateData.subdomain = tenantData.subdomain.toLowerCase().trim()
    }
    if (tenantData.contactEmail !== undefined) updateData.contact_email = tenantData.contactEmail.toLowerCase().trim()
    if (tenantData.status !== undefined) updateData.status = tenantData.status
    // Subscription plan removed - no longer needed
    if (tenantData.settings !== undefined) updateData.settings = tenantData.settings

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .select('tenant_id, name, subdomain, contact_email, status, subscription_plan, created_at, updated_at')
      .single()

    if (error) throw new Error(`Failed to update tenant: ${error.message}`)
    return data
  },

  deleteTenant: async (tenantId: string) => {
    // Soft delete: Update status to 'deleted' instead of removing from DB
    const { error } = await supabase
      .from('tenants')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)

    if (error) {
      // If there's a foreign key constraint error, provide a helpful message
      if (error.code === '23503') {
        throw new Error('Cannot delete tenant. Please ensure all related data can be deleted or check database constraints.')
      }
      throw new Error(`Failed to delete tenant: ${error.message}`)
    }
    return { success: true }
  },
}


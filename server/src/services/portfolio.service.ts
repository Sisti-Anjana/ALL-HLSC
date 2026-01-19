import { supabase } from '../config/database.config'

export const portfolioService = {
  getAll: async (tenantId: string | null) => {
    // Super admin without selected tenant should return empty array
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return []
    }

    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch portfolios: ${error.message}`)
    // Map portfolio_id to id for frontend compatibility
    return (data || []).map(portfolio => ({
      ...portfolio,
      id: portfolio.portfolio_id,
    }))
  },

  getById: async (tenantId: string, portfolioId: string) => {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('portfolio_id', portfolioId)
      .single()

    if (error) throw new Error(`Failed to fetch portfolio: ${error.message}`)
    // Map portfolio_id to id for frontend compatibility
    if (data) {
      return {
        ...data,
        id: data.portfolio_id,
      }
    }
    return data
  },

  create: async (tenantId: string, portfolioData: any) => {
    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        ...portfolioData,
        tenant_id: tenantId,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create portfolio: ${error.message}`)
    // Map portfolio_id to id for frontend compatibility
    if (data) {
      return {
        ...data,
        id: data.portfolio_id,
      }
    }
    return data
  },

  update: async (tenantId: string, portfolioId: string, portfolioData: any) => {
    console.log('Updating portfolio:', { tenantId, portfolioId, portfolioData })

    const { data, error } = await supabase
      .from('portfolios')
      .update(portfolioData)
      .eq('tenant_id', tenantId)
      .eq('portfolio_id', portfolioId)
      .select()
      .single()

    if (error) {
      console.error('Error updating portfolio:', error)
      // Check if portfolio exists
      const { data: checkData } = await supabase
        .from('portfolios')
        .select('portfolio_id, tenant_id')
        .eq('portfolio_id', portfolioId)
        .single()

      if (!checkData) {
        throw new Error(`Portfolio with ID ${portfolioId} not found`)
      } else if (checkData.tenant_id !== tenantId) {
        throw new Error(`Portfolio belongs to a different tenant`)
      }
      throw new Error(`Failed to update portfolio: ${error.message}`)
    }

    // Map portfolio_id to id for frontend compatibility
    if (data) {
      return {
        ...data,
        id: data.portfolio_id,
      }
    }
    return data
  },

  delete: async (tenantId: string, portfolioId: string) => {
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('portfolio_id', portfolioId)

    if (error) throw new Error(`Failed to delete portfolio: ${error.message}`)
    return { success: true }
  },

  lock: async (tenantId: string, portfolioId: string, userEmail: string, issueHour: number) => {
    // Locks expire exactly 1 hour after creation (not at top of next hour)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // Exactly 1 hour from now

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate unique session ID

    // First, clean up expired locks for this tenant and user (Fire and forget - don't await to improve speed)
    await supabase
      .from('hour_reservations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('monitored_by', userEmail)
      .lt('expires_at', new Date().toISOString())

    // 0. PRE-CHECK: Ensure user doesn't already have an active lock system-wide
    const { data: existingUserLocks, error: existingUserLocksError } = await supabase
      .from('hour_reservations')
      .select('portfolio_id, tenant_id, issue_hour, tenant:tenants(name)')
      .eq('monitored_by', userEmail)
      .gt('expires_at', new Date().toISOString())

    if (existingUserLocksError) {
      console.error('Error checking user existing locks:', existingUserLocksError)
    }

    if (existingUserLocks && existingUserLocks.length > 0) {
      const activeLock = existingUserLocks[0]
      const activeTenant = (activeLock as any).tenant

      // Scenario A: Same Tenant + Same Portfolio
      if (activeLock.tenant_id === tenantId && activeLock.portfolio_id === portfolioId) {
        if (activeLock.issue_hour === issueHour) {
          // Exactly the same lock - return it (Idempotent)
          console.log(`User ${userEmail} already holds exact lock for ${portfolioId} @ ${issueHour}. Returning existing.`)
          return activeLock
        } else {
          // Same portfolio but different hour
          throw new Error(`You already have an active lock on this portfolio for Hour ${activeLock.issue_hour}. Please finish that hour first.`)
        }
      }

      // Scenario B: Different Portfolio OR Different Tenant
      // Get the name of the portfolio we are currently locking to show in the error
      const { data: pName } = await supabase
        .from('portfolios')
        .select('name')
        .eq('portfolio_id', activeLock.portfolio_id)
        .single()

      const otherPortfolioName = pName?.name || 'another portfolio'
      const otherTenantName = activeTenant?.name || 'another client'

      throw new Error(`You already have an active lock on "${otherPortfolioName}" in "${otherTenantName}". Please finish it first.`)
    }

    // 1. Check if ANYONE ELSE has a lock on this specific portfolio/hour
    const { data: currentLock, error: currentLockError } = await supabase
      .from('hour_reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('portfolio_id', portfolioId)
      .eq('issue_hour', issueHour)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (currentLockError && currentLockError.code !== 'PGRST116') {
      console.error('Error checking current lock status:', currentLockError)
    }

    if (currentLock) {
      // Someone else holds the lock
      if (currentLock.monitored_by?.toLowerCase() !== userEmail.toLowerCase()) {
        console.log(`Portfolio ${portfolioId} is already locked by ${currentLock.monitored_by} for hour ${issueHour}`)
        throw new Error(`This portfolio is already locked for this hour by ${currentLock.monitored_by}`)
      }
      return currentLock // Should have been caught by pre-check but for safety
    }

    // 2. No active lock found. Try to insert.
    const { data, error } = await supabase
      .from('hour_reservations')
      .insert({
        tenant_id: tenantId,
        portfolio_id: portfolioId,
        issue_hour: issueHour,
        monitored_by: userEmail,
        session_id: sessionId,
        reserved_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error locking portfolio:', error)
      if (error.code === '23505') {
        throw new Error('This portfolio is already locked for this hour by another user')
      }
      throw new Error(`Failed to lock portfolio: ${error.message}`)
    }

    // SUCCESS: Reset all_sites_checked status to 'No' when a new lock is acquired
    // This ensures consistency if it was previously marked as 'Yes'
    try {
      await supabase
        .from('portfolios')
        .update({
          all_sites_checked: 'No',
          all_sites_checked_date: null,
          all_sites_checked_hour: null
        })
        .eq('tenant_id', tenantId)
        .eq('portfolio_id', portfolioId)
    } catch (updateError) {
      console.error('Failed to reset all_sites_checked status during lock:', updateError)
      // Don't fail the lock if this secondary update fails
    }

    return data
  },

  unlock: async (tenantId: string, portfolioId: string, userEmail: string) => {
    // Check if portfolio is locked and by whom
    const { data: existingLock, error: lockCheckError } = await supabase
      .from('hour_reservations')
      .select('monitored_by')
      .eq('tenant_id', tenantId)
      .eq('portfolio_id', portfolioId)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single()

    if (lockCheckError && lockCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking lock:', lockCheckError)
      throw new Error(`Failed to check lock status: ${lockCheckError.message}`)
    }

    if (!existingLock) {
      throw new Error('Portfolio is not currently locked')
    }

    // Only the user who locked it can unlock it
    if (existingLock.monitored_by?.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error(`Only the user who locked this portfolio (${existingLock.monitored_by}) can unlock it`)
    }
    const { error } = await supabase
      .from('hour_reservations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('portfolio_id', portfolioId)

    if (error) throw new Error(`Failed to unlock portfolio: ${error.message}`)
    return { success: true }
  },
}


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
    // Locks should expire at the start of the next wall-clock hour
    // e.g., if it's 5:45 AM, the lock expires at 6:00 AM.
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setHours(now.getHours() + 1, 0, 0, 0) // Top of the next hour

    // Safety check: If less than 15 minutes remain in the hour, give them a full hour
    // to prevent immediate expiration.
    const minutesLeft = 60 - now.getMinutes()
    if (minutesLeft < 15) {
      expiresAt.setHours(expiresAt.getHours() + 1)
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate unique session ID

    // First, clean up expired locks for this tenant and user (Fire and forget - don't await to improve speed)
    await supabase
      .from('hour_reservations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('monitored_by', userEmail)
      .lt('expires_at', new Date().toISOString())

    // 0. PRE-CHECK: Ensure user doesn't already have an active lock on ANOTHER portfolio
    // (A user can only lock ONE portfolio at a time)
    const { data: existingUserLocks, error: existingUserLocksError } = await supabase
      .from('hour_reservations')
      .select('portfolio_id, issue_hour')
      .eq('tenant_id', tenantId)
      .eq('monitored_by', userEmail)
      .gt('expires_at', new Date().toISOString())

    if (existingUserLocksError) {
      console.error('Error checking user existing locks:', existingUserLocksError)
    }

    if (existingUserLocks && existingUserLocks.length > 0) {
      // User has active locks. Check if it's for the same portfolio/hour (idempotent retry)
      // or for a different one (violation).
      const activeLock = existingUserLocks[0] // Taking the first one found

      // If the existing lock is for a DIFFERENT portfolio, reject.
      if (activeLock.portfolio_id !== portfolioId) {
        // Query portfolio name for better error message
        const { data: pName } = await supabase
          .from('portfolios')
          .select('name')
          .eq('portfolio_id', activeLock.portfolio_id)
          .single()

        const otherPortfolioName = pName?.name || 'another portfolio'

        throw new Error(`You already have an active lock on "${otherPortfolioName}". Please unlock it or complete your work there before locking a new portfolio.`)
      }

      // If it IS the same portfolio but DIFFERENT hour?
      // "receive in a single client the person should be able to lock only one portfolio"
      // This implies 1 portfolio at a time, regardless of hour.
      if (activeLock.portfolio_id === portfolioId && activeLock.issue_hour !== issueHour) {
        throw new Error(`You already have an active lock on this portfolio for Hour ${activeLock.issue_hour}. Please finish that hour first.`)
      }

      // If it's the SAME portfolio AND SAME hour, we let it fall through to the next check which handles idempotency.
    }

    // 1. Check if ANYONE has a lock on this specific portfolio/hour
    const { data: currentLock, error: currentLockError } = await supabase
      .from('hour_reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('portfolio_id', portfolioId)
      .eq('issue_hour', issueHour)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (currentLockError && currentLockError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking current lock status:', currentLockError)
      // Fallthrough to try insert if check fails? No, safer to throw or let insert handle it.
    }

    if (currentLock) {
      // Lock exists!
      if (currentLock.monitored_by?.toLowerCase() === userEmail.toLowerCase()) {
        console.log(`User ${userEmail} already holds the lock for portfolio ${portfolioId} at hour ${issueHour}. Returning existing lock (Idempotent).`)
        return currentLock
      } else {
        console.log(`Portfolio ${portfolioId} is already locked by ${currentLock.monitored_by} for hour ${issueHour}`)
        throw new Error(`This portfolio is already locked for this hour by ${currentLock.monitored_by}`)
      }
    }

    // 2. No active lock found (or at least check didn't find one). Try to insert.
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
      // Handle unique constraint violation (portfolio already locked for this hour)
      if (error.code === '23505') {
        // Race condition: someone locked it between our check and insert
        throw new Error('This portfolio is already locked for this hour by another user')
      }
      throw new Error(`Failed to lock portfolio: ${error.message}`)
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


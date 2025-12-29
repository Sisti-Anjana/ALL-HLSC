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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate unique session ID

    // First, clean up expired locks for this tenant and user
    const { error: cleanupError } = await supabase
      .from('hour_reservations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('monitored_by', userEmail)
      .lt('expires_at', new Date().toISOString())

    if (cleanupError) {
      console.error('Error cleaning up expired locks:', cleanupError)
      // Don't throw - continue with lock check
    }

    // Enforce: one active lock per user per hour across all portfolios
    const { data: existingLocks, error: existingLockError } = await supabase
      .from('hour_reservations')
      .select('id, portfolio_id')
      .eq('tenant_id', tenantId)
      .eq('monitored_by', userEmail)
      .eq('issue_hour', issueHour)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (existingLockError) {
      console.error('Error checking existing locks:', existingLockError)
      throw new Error(`Failed to verify existing locks: ${existingLockError.message}`)
    }

    console.log(`Lock check for user ${userEmail}, hour ${issueHour}, tenant ${tenantId}: Found ${existingLocks?.length || 0} existing locks`)

    if (existingLocks && existingLocks.length > 0) {
      const existingLock = existingLocks[0]
      // Fetch portfolio name separately
      let portfolioName = 'Unknown Portfolio'
      let portfolioDisplay = `Portfolio ID: ${existingLock.portfolio_id || 'N/A'}`
      let isStaleLock = false
      
      if (existingLock.portfolio_id) {
        // Try with tenant_id first
        const { data: portfolio, error: portfolioError } = await supabase
          .from('portfolios')
          .select('name')
          .eq('id', existingLock.portfolio_id)
          .eq('tenant_id', tenantId)
          .single()
        
        if (portfolioError) {
          console.error('Error fetching portfolio name (with tenant):', portfolioError)
          // Try without tenant_id check in case of data inconsistency
          const { data: portfolioAlt, error: portfolioAltError } = await supabase
            .from('portfolios')
            .select('name')
            .eq('id', existingLock.portfolio_id)
            .single()
          
          if (portfolioAltError) {
            console.error('Error fetching portfolio name (without tenant):', portfolioAltError)
            // Portfolio doesn't exist - this is a stale lock
            isStaleLock = true
            portfolioDisplay = `Portfolio ID: ${existingLock.portfolio_id} (not found in database)`
            
            // Automatically clean up stale lock
            console.log(`Auto-cleaning stale lock for non-existent portfolio: ${existingLock.portfolio_id}`)
            const { error: deleteError } = await supabase
              .from('hour_reservations')
              .delete()
              .eq('id', existingLock.id)
            
            if (deleteError) {
              console.error('Error deleting stale lock:', deleteError)
            } else {
              console.log('Stale lock cleaned up successfully')
              // After cleaning up, allow the new lock to proceed
              // Don't throw error - continue to create new lock
            }
          } else if (portfolioAlt) {
            portfolioName = portfolioAlt.name
            portfolioDisplay = portfolioName
          }
        } else if (portfolio) {
          portfolioName = portfolio.name
          portfolioDisplay = portfolioName
        }
      } else {
        console.error('Existing lock has no portfolio_id:', existingLock)
        portfolioDisplay = 'Portfolio ID: NULL (invalid lock)'
        isStaleLock = true
        
        // Automatically clean up invalid lock
        console.log(`Auto-cleaning invalid lock (no portfolio_id): ${existingLock.id}`)
        const { error: deleteError } = await supabase
          .from('hour_reservations')
          .delete()
          .eq('id', existingLock.id)
        
        if (deleteError) {
          console.error('Error deleting invalid lock:', deleteError)
        } else {
          console.log('Invalid lock cleaned up successfully')
          // After cleaning up, allow the new lock to proceed
          // Don't throw error - continue to create new lock
        }
      }
      
      // Only throw error if it's NOT a stale lock (stale locks are auto-cleaned)
      if (!isStaleLock) {
        console.log(`User ${userEmail} already has lock on portfolio ${existingLock.portfolio_id} (${portfolioDisplay}) for hour ${issueHour}`)
        throw new Error(`You already have "${portfolioDisplay}" locked for hour ${issueHour}. Please finish or unlock it first in the Active Locks section.`)
      } else {
        // Stale lock was cleaned up - log and continue
        console.log(`Stale lock cleaned up for user ${userEmail}, hour ${issueHour}. Proceeding with new lock.`)
      }
    }

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

    // Only the user who locked it can unlock it
    if (existingLock.monitored_by?.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('Only the user who locked this portfolio can unlock it')
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


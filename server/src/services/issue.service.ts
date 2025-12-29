import { supabase } from '../config/database.config'

export const issueService = {
  getAll: async (tenantId: string | null, filters?: any) => {
    // Super admin without selected tenant should return empty array
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return []
    }

    let query = supabase
      .from('issues')
      .select('*, portfolio:portfolios(*)')
      .eq('tenant_id', tenantId)

    if (filters?.portfolio_id) {
      query = query.eq('portfolio_id', filters.portfolio_id)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters?.issue_hour !== undefined) {
      query = query.eq('issue_hour', filters.issue_hour)
    }

    // Add search filter if provided
    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`)
    }

    // Filter for "Active issues" - exclude "No issue" entries (Issue Present = Yes)
    if (filters?.description === '!No issue') {
      query = query.neq('description', 'No issue')
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch issues: ${error.message}`)

    // Map monitored_by from string to array for frontend compatibility
    return (data || []).map(issue => ({
      ...issue,
      id: issue.issue_id || issue.id, // Map issue_id to id for frontend
      monitored_by: issue.monitored_by ? [issue.monitored_by] : [],
      // missed_by is already an array in database
    }))
  },

  getById: async (tenantId: string, issueId: string) => {
    const { data, error } = await supabase
      .from('issues')
      .select('*, portfolio:portfolios(*)')
      .eq('tenant_id', tenantId)
      .eq('issue_id', issueId) // Database uses issue_id as primary key
      .single()

    if (error) throw new Error(`Failed to fetch issue: ${error.message}`)

    // Map monitored_by from string to array for frontend compatibility
    if (data) {
      return {
        ...data,
        id: data.issue_id || data.id, // Map issue_id to id for frontend
        monitored_by: data.monitored_by ? [data.monitored_by] : [],
      }
    }

    return data
  },

  create: async (tenantId: string, issueData: any, userEmail?: string) => {
    // Check if portfolio is locked by another user for this hour
    if (issueData.portfolio_id && issueData.issue_hour !== undefined && userEmail) {
      const { data: existingLock, error: lockCheckError } = await supabase
        .from('hour_reservations')
        .select('monitored_by')
        .eq('tenant_id', tenantId)
        .eq('portfolio_id', issueData.portfolio_id)
        .eq('issue_hour', issueData.issue_hour)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single()

      if (lockCheckError && lockCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking lock:', lockCheckError)
        // Don't block if there's an error checking - allow the issue creation
      } else if (existingLock) {
        // Portfolio is locked - check if it's locked by the current user
        if (existingLock.monitored_by?.toLowerCase() !== userEmail.toLowerCase()) {
          console.error(`❌ Issue creation BLOCKED - Portfolio ${issueData.portfolio_id} is locked by another user: ${existingLock.monitored_by}`)
          throw new Error(`This portfolio is locked for hour ${issueData.issue_hour}:00 by ${existingLock.monitored_by}. Only the user who locked it can log issues.`)
        }
      } else {
        // ENFORCEMENT: Check if the user has ANY other lock active on a DIFFERENT portfolio
        // This prevents creating issues on Portfolio A if the user has Portfolio B locked
        const { data: userOtherLocks, error: otherLockError } = await supabase
          .from('hour_reservations')
          .select('portfolio_id, issue_hour')
          .eq('tenant_id', tenantId)
          .eq('monitored_by', userEmail)
          .gt('expires_at', new Date().toISOString())
          .neq('portfolio_id', issueData.portfolio_id)
          .limit(1)

        if (userOtherLocks && userOtherLocks.length > 0) {
          const otherLock = userOtherLocks[0]
          console.error(`❌ Issue creation BLOCKED - User has another portfolio locked: ${otherLock.portfolio_id}`)
          throw new Error(`You cannot log issues here as you currently have another portfolio locked. Please finish that one first.`)
        }
      }
    }

    // Map monitored_by from array to string if needed (database expects VARCHAR(255))
    const mappedData: any = {
      ...issueData,
      tenant_id: tenantId,
      monitored_by: Array.isArray(issueData.monitored_by)
        ? issueData.monitored_by[0] || ''
        : (issueData.monitored_by || ''),
      // Ensure missed_by is an array (empty array if not provided, not null)
      missed_by: Array.isArray(issueData.missed_by) && issueData.missed_by.length > 0
        ? issueData.missed_by
        : [],
      // Don't include severity at all if not provided or invalid - let database use default or NULL
      // Only include if it's a valid value
      ...(issueData.severity && String(issueData.severity).trim() ? {
        severity: (() => {
          const validSeverities = ['low', 'medium', 'high', 'critical']
          const severity = String(issueData.severity).toLowerCase().trim()
          // Only include if valid, otherwise omit the field entirely
          return validSeverities.includes(severity) ? severity : null
        })()
      } : {}),
      // Ensure status is lowercase and valid, or omit if invalid
      ...(issueData.status ? {
        status: (() => {
          const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
          const status = String(issueData.status).toLowerCase().trim()
          return validStatuses.includes(status) ? status : null
        })()
      } : {
        status: 'open' // Default if not provided
      }),
    }

    // Handle site_name - convert empty string to null if column doesn't allow empty strings
    if (mappedData.site_name === '' || mappedData.site_name === null || mappedData.site_name === undefined) {
      mappedData.site_name = null // Set to null instead of empty string
    }

    // Remove null/undefined fields (but keep empty arrays for required fields)
    Object.keys(mappedData).forEach(key => {
      // Don't delete site_name if it's null - let database handle it
      if (key === 'site_name') return
      if (mappedData[key] === null || mappedData[key] === undefined || mappedData[key] === '') {
        delete mappedData[key]
      }
    })

    // Specifically remove severity if it's null or invalid
    if (mappedData.severity === null || mappedData.severity === undefined || mappedData.severity === '') {
      delete mappedData.severity
    }

    // Specifically remove status if it's null or invalid
    if (mappedData.status === null || mappedData.status === undefined || mappedData.status === '') {
      delete mappedData.status
      // Set default if removed
      mappedData.status = 'open'
    }

    // Ensure required fields have defaults
    if (!mappedData.description || mappedData.description.trim() === '') {
      mappedData.description = 'No issue'
    }
    if (!mappedData.monitored_by || mappedData.monitored_by.trim() === '') {
      mappedData.monitored_by = ''
    }

    // Clean up notes field - remove if empty or just "Case #: "
    if (mappedData.notes && (mappedData.notes.trim() === '' || mappedData.notes.trim() === 'Case #:')) {
      delete mappedData.notes
    }

    console.log('Creating issue with mapped data:', mappedData)

    const { data, error } = await supabase
      .from('issues')
      .insert(mappedData)
      .select('*, portfolio:portfolios(*)')
      .single()

    if (error) {
      console.error('Error creating issue:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw new Error(`Failed to create issue: ${error.message}`)
    }

    // Map monitored_by back to array for frontend compatibility and add id field
    if (data) {
      data.id = data.issue_id || data.id // Map issue_id to id for frontend
      data.monitored_by = data.monitored_by ? [data.monitored_by] : []
    }

    return data
  },

  update: async (tenantId: string, issueId: string, issueData: any) => {
    // Map monitored_by from array to string if needed
    const mappedData = {
      ...issueData,
      monitored_by: Array.isArray(issueData.monitored_by)
        ? issueData.monitored_by[0] || ''
        : (issueData.monitored_by || ''),
      missed_by: Array.isArray(issueData.missed_by) && issueData.missed_by.length > 0
        ? issueData.missed_by
        : null,
      severity: issueData.severity ? issueData.severity.toLowerCase() : undefined,
    }

    // Remove null/undefined fields
    Object.keys(mappedData).forEach(key => {
      if (mappedData[key] === null || mappedData[key] === undefined) {
        delete mappedData[key]
      }
    })

    const { data, error } = await supabase
      .from('issues')
      .update(mappedData)
      .eq('tenant_id', tenantId)
      .eq('issue_id', issueId) // Database uses issue_id as primary key
      .select('*, portfolio:portfolios(*)')
      .single()

    if (error) throw new Error(`Failed to update issue: ${error.message}`)

    // Map monitored_by back to array for frontend compatibility and add id field
    if (data) {
      data.id = data.issue_id || data.id
      data.monitored_by = data.monitored_by ? [data.monitored_by] : []
    }

    return data
  },

  delete: async (tenantId: string, issueId: string) => {
    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('issue_id', issueId) // Database uses issue_id as primary key

    if (error) throw new Error(`Failed to delete issue: ${error.message}`)
    return { success: true }
  },
}


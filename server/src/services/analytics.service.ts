import { supabase } from '../config/database.config'
import { getESTHour, getESTDateString, getESTHourFromDate, getESTDayBoundariesInUTC } from '../utils/timezone.util'

export const analyticsService = {
  getDashboardStats: async (tenantId: string | null) => {
    // Super admin without selected tenant should return empty stats
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return {
        totalIssues: 0,
        openIssues: 0,
        resolvedIssues: 0,
        inProgressIssues: 0,
        portfoliosWithIssues: 0,
        sitesWithIssues: 0,
        totalPortfolios: 0,
        averageIssueHour: 0,
      }
    }
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('tenant_id', tenantId)

    if (issuesError) throw new Error(`Failed to fetch issues: ${issuesError.message}`)

    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('tenant_id', tenantId)

    if (portfoliosError) throw new Error(`Failed to fetch portfolios: ${portfoliosError.message}`)

    const totalIssues = issues?.length || 0
    const openIssues = issues?.filter(i => i.status === 'open').length || 0
    const resolvedIssues = issues?.filter(i => i.status === 'resolved').length || 0
    const inProgressIssues = issues?.filter(i => i.status === 'in_progress').length || 0

    const uniquePortfolios = new Set(issues?.map(i => i.portfolio_id)).size
    const uniqueSites = new Set(issues?.map(i => i.site_name)).size

    const issueHours = issues?.map(i => i.issue_hour).filter(h => h !== null) || []
    const avgIssueHour = issueHours.length > 0
      ? issueHours.reduce((a, b) => a + b, 0) / issueHours.length
      : 0

    return {
      totalIssues,
      openIssues,
      resolvedIssues,
      inProgressIssues,
      portfoliosWithIssues: uniquePortfolios,
      sitesWithIssues: uniqueSites,
      totalPortfolios: portfolios?.length || 0,
      averageIssueHour: Math.round(avgIssueHour * 10) / 10,
    }
  },

  getHourlyCoverage: async (tenantId: string | null) => {
    // Super admin without selected tenant should return empty data
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
    }
    const { data, error } = await supabase
      .from('issues')
      .select('issue_hour')
      .eq('tenant_id', tenantId)

    if (error) throw new Error(`Failed to fetch hourly coverage: ${error.message}`)

    const hourlyCounts = Array(24).fill(0)
    data?.forEach(issue => {
      if (issue.issue_hour !== null && issue.issue_hour >= 0 && issue.issue_hour < 24) {
        hourlyCounts[issue.issue_hour]++
      }
    })

    return hourlyCounts.map((count, hour) => ({ hour, count }))
  },

  getIssuesOverTime: async (tenantId: string | null, days: number = 30) => {
    // Super admin without selected tenant should return empty data
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return []
    }
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('issues')
      .select('created_at, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw new Error(`Failed to fetch issues over time: ${error.message}`)

    // Group by date
    const grouped: { [key: string]: { total: number; open: number; resolved: number } } = {}
    data?.forEach(issue => {
      const date = new Date(issue.created_at).toISOString().split('T')[0]
      if (!grouped[date]) {
        grouped[date] = { total: 0, open: 0, resolved: 0 }
      }
      grouped[date].total++
      if (issue.status === 'open') grouped[date].open++
      if (issue.status === 'resolved') grouped[date].resolved++
    })

    return Object.entries(grouped).map(([date, counts]) => ({
      date,
      ...counts,
    }))
  },

  getPortfolioHeatmap: async (tenantId: string | null) => {
    // Super admin without selected tenant should return empty data
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return []
    }
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('portfolio_id, name')
      .eq('tenant_id', tenantId)

    if (portfoliosError) throw new Error(`Failed to fetch portfolios: ${portfoliosError.message}`)

    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('portfolio_id, status')
      .eq('tenant_id', tenantId)

    if (issuesError) throw new Error(`Failed to fetch issues: ${issuesError.message}`)

    return portfolios?.map(portfolio => {
      const portfolioIssues = issues?.filter(i => i.portfolio_id === portfolio.portfolio_id) || []
      const openIssues = portfolioIssues.filter(i => i.status === 'open').length
      const totalIssues = portfolioIssues.length

      return {
        portfolioId: portfolio.portfolio_id,
        portfolioName: portfolio.name,
        totalIssues,
        openIssues,
        status: totalIssues === 0 ? 'none' : openIssues === 0 ? 'resolved' : 'has_issues',
      }
    }) || []
  },

  getCoverageMatrix: async (tenantId: string | null) => {
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return { portfolios: [], matrix: {} }
    }

    const todayDate = getESTDateString()
    const { start: startOfToday } = getESTDayBoundariesInUTC(todayDate)

    // 1. Fetch all portfolios
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('portfolio_id, name')
      .eq('tenant_id', tenantId)

    if (portfoliosError) throw new Error(`Failed to fetch portfolios: ${portfoliosError.message}`)

    // 2. Fetch all check events for today from portfolio_completions
    const { data: completions, error: completionsError } = await supabase
      .from('portfolio_completions')
      .select('related_portfolio_id, monitored_by, created_at, metadata')
      .eq('tenant_id', tenantId)
      .eq('action_type', 'PORTFOLIO_CHECKED')
      .gte('created_at', startOfToday)

    if (completionsError) throw new Error(`Failed to fetch completions: ${completionsError.message}`)

    // 3. Build the Matrix
    // Structure: { [userId]: { [hour]: Set<portfolioId> } }
    const userHourlyPortfolios: { [key: string]: { [key: number]: Set<string> } } = {}

    completions?.forEach(c => {
      const userId = c.monitored_by
      if (!userId) return

      let logHour = getESTHourFromDate(c.created_at)
      if (c.metadata) {
        try {
          const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata
          if (meta.hour !== undefined) logHour = parseInt(meta.hour)
        } catch (e) { }
      }

      if (!userHourlyPortfolios[userId]) userHourlyPortfolios[userId] = {}
      if (!userHourlyPortfolios[userId][logHour]) userHourlyPortfolios[userId][logHour] = new Set()

      if (c.related_portfolio_id) {
        userHourlyPortfolios[userId][logHour].add(c.related_portfolio_id)
      }
    })

    // 4. Convert sets to counts for frontend compatibility
    const matrix: { [key: string]: { [key: number]: number } } = {}
    Object.entries(userHourlyPortfolios).forEach(([userId, hours]) => {
      matrix[userId] = {}
      Object.entries(hours).forEach(([hour, portfolioSet]) => {
        matrix[userId][parseInt(hour)] = portfolioSet.size
      })
    })

    return {
      portfolios: portfolios?.map(p => ({ id: p.portfolio_id, name: p.name })) || [],
      matrix,
    }
  },

  getPortfolioActivity: async (tenantId: string | null) => {
    // Super admin without selected tenant should return empty array
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return []
    }
    try {
      console.log('Fetching portfolios for tenant:', tenantId)
      // Get all portfolios with last checked date and hour
      const { data: portfolios, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('portfolio_id, name, subtitle, site_range, all_sites_checked_date, all_sites_checked, all_sites_checked_hour')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })

      if (portfoliosError) {
        console.error('Error fetching portfolios:', portfoliosError)
        throw new Error(`Failed to fetch portfolios: ${portfoliosError.message}`)
      }

      console.log('Portfolios found:', portfolios?.length || 0, portfolios)

      // Get all issues with created_at for each portfolio
      const { data: issues, error: issuesError } = await supabase
        .from('issues')
        .select('portfolio_id, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (issuesError) {
        console.error('Error fetching issues:', issuesError)
        throw new Error(`Failed to fetch issues: ${issuesError.message}`)
      }

      console.log('Issues found:', issues?.length || 0)

      // TIMEZONE FIX: Don't calculate status on server - let client handle it with local timezone
      // Server just returns raw data, client will recalculate everything using local time
      type PortfolioRow = {
        portfolio_id: string | number
        name: string
        subtitle: string | null
        site_range: string | null
        all_sites_checked_date: string | null
        all_sites_checked: string | null
        all_sites_checked_hour: number | null
      }

      const result = (portfolios || []).map((portfolio: PortfolioRow) => {
        const portfolioId = portfolio.portfolio_id
        const portfolioIssues = (issues || []).filter(i => i.portfolio_id === portfolioId)

        // Return raw data - client will calculate status using local timezone
        // This fixes timezone issues between server (UTC) and client (local time)
        return {
          id: portfolioId,
          name: portfolio.name,
          subtitle: portfolio.subtitle || '',
          siteRange: portfolio.site_range || '',
          // Return raw date/hour - client will calculate Y/H value and status
          allSitesCheckedDate: portfolio.all_sites_checked_date,
          allSitesCheckedHour: portfolio.all_sites_checked_hour,
          allSitesChecked: portfolio.all_sites_checked,
          // For backwards compatibility, set default values (client will override)
          yValue: 'Y0',
          yValueNumber: 0,
          status: 'no-activity' as const,
          lastUpdated: portfolio.all_sites_checked_date
            ? new Date(portfolio.all_sites_checked_date + 'T00:00:00')
            : (portfolioIssues.length > 0 ? new Date(portfolioIssues[0].created_at) : null),
          hoursSinceLastActivity: null,
        }
      })

      console.log('Portfolio activity result:', result)
      return result
    } catch (error) {
      console.error('Error in getPortfolioActivity service:', error)
      throw error
    }
  },

  getHourlyCoverageWithDateRange: async (tenantId: string | null, startDate?: string, endDate?: string) => {
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return Array.from({ length: 24 }, (_, hour) => ({
        hour, coverage: 0, portfoliosChecked: 0, totalPortfolios: 0, totalIssues: 0,
      }))
    }

    // 1. Get total portfolios count for this tenant
    const { count: totalPortfoliosCount, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    if (portfoliosError) throw new Error(`Failed to fetch portfolios count: ${portfoliosError.message}`)
    const total = totalPortfoliosCount || 1

    // 2. Prepare date filters in UTC based on EST boundaries
    let queryStart: string
    let queryEnd: string

    if (startDate && endDate) {
      const { start } = getESTDayBoundariesInUTC(startDate)
      const { end } = getESTDayBoundariesInUTC(endDate)
      queryStart = start
      queryEnd = end
    } else {
      const today = getESTDateString()
      const { start, end } = getESTDayBoundariesInUTC(today)
      queryStart = start
      queryEnd = end
    }

    // 3. Fetch check events from completions/logs
    const { data: completions, error: completionsError } = await supabase
      .from('portfolio_completions')
      .select('related_portfolio_id, metadata, created_at')
      .eq('tenant_id', tenantId)
      .eq('action_type', 'PORTFOLIO_CHECKED')
      .gte('created_at', queryStart)
      .lte('created_at', queryEnd)

    if (completionsError) throw new Error(`Failed to fetch completions: ${completionsError.message}`)

    // 4. Fetch issues for the same period
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('portfolio_id, issue_hour, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', queryStart)
      .lte('created_at', queryEnd)

    if (issuesError) throw new Error(`Failed to fetch issues: ${issuesError.message}`)

    // 5. Calculate coverage by hour
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const uniquePortfolios = new Set<string>()

      // Add portfolios from completions (checked events)
      completions?.forEach(c => {
        let logHour = getESTHourFromDate(c.created_at)
        if (c.metadata) {
          try {
            const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata
            if (meta.hour !== undefined) logHour = parseInt(meta.hour)
          } catch (e) { }
        }
        if (logHour === hour && c.related_portfolio_id) {
          uniquePortfolios.add(c.related_portfolio_id)
        }
      })

      // NOTE: We no longer add portfolios from issues here to ensure ONLY 
      // "Really Checked" portfolios are counted in the coverage %


      const portfoliosChecked = uniquePortfolios.size
      const coverage = Math.round((portfoliosChecked / total) * 100 * 10) / 10
      const totalIssues = (issues || []).filter(i => i.issue_hour === hour).length

      return {
        hour,
        coverage,
        portfoliosChecked,
        totalIssues,
        totalPortfolios: total,
      }
    })

    return hourlyData
  },
}


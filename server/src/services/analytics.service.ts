import { supabase } from '../config/database.config'

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
    // Super admin without selected tenant should return empty data
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return {
        portfolios: [],
        matrix: {},
      }
    }
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('portfolio_id, name')
      .eq('tenant_id', tenantId)

    if (portfoliosError) throw new Error(`Failed to fetch portfolios: ${portfoliosError.message}`)

    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('portfolio_id, issue_hour')
      .eq('tenant_id', tenantId)

    if (issuesError) throw new Error(`Failed to fetch issues: ${issuesError.message}`)

    const matrix: { [key: string]: { [key: number]: number } } = {}
    portfolios?.forEach(portfolio => {
      matrix[portfolio.portfolio_id] = {}
      for (let hour = 0; hour < 24; hour++) {
        matrix[portfolio.portfolio_id][hour] = 0
      }
    })

    issues?.forEach(issue => {
      if (issue.issue_hour !== null && issue.issue_hour >= 0 && issue.issue_hour < 24) {
        if (matrix[issue.portfolio_id]) {
          matrix[issue.portfolio_id][issue.issue_hour]++
        }
      }
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
    // Super admin without selected tenant should return empty data
    if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
      return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        coverage: 0,
        portfoliosChecked: 0,
        totalPortfolios: 0,
        totalIssues: 0,
      }))
    }

    // Get total portfolios count
    const { count: totalPortfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    if (portfoliosError) {
      throw new Error(`Failed to fetch portfolios count: ${portfoliosError.message}`)
    }

    const totalPortfoliosCount = totalPortfolios || 1 // Avoid division by zero

    // Get portfolios that were checked (all_sites_checked = 'Yes') with their check hour and date
    let query = supabase
      .from('portfolios')
      .select('all_sites_checked_hour, all_sites_checked_date, portfolio_id')
      .eq('tenant_id', tenantId)
      .eq('all_sites_checked', 'Yes')
      .not('all_sites_checked_hour', 'is', null)
      .not('all_sites_checked_date', 'is', null)

    if (startDate) {
      // Convert startDate to date string (YYYY-MM-DD)
      const startDateStr = new Date(startDate).toISOString().split('T')[0]
      query = query.gte('all_sites_checked_date', startDateStr)
    }
    if (endDate) {
      // Convert endDate to date string (YYYY-MM-DD)
      const endDateStr = new Date(endDate).toISOString().split('T')[0]
      query = query.lte('all_sites_checked_date', endDateStr)
    }

    const { data: portfolioData, error } = await query

    if (error) throw new Error(`Failed to fetch hourly coverage: ${error.message}`)

    console.log('Hourly coverage data from portfolios:', portfolioData?.length || 0, 'portfolios checked')

    // Also fetch issues for the date range to show in tooltip
    let issuesQuery = supabase
      .from('issues')
      .select('issue_hour, portfolio_id, created_at')
      .eq('tenant_id', tenantId)

    if (startDate) {
      issuesQuery = issuesQuery.gte('created_at', new Date(startDate).toISOString())
    }
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999) // End of day
      issuesQuery = issuesQuery.lte('created_at', endDateTime.toISOString())
    }

    const { data: issuesData } = await issuesQuery

    // Calculate coverage by hour based on portfolios checked in each hour
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      // Filter portfolios checked in this specific hour
      const hourPortfolios = (portfolioData || []).filter(
        portfolio => portfolio.all_sites_checked_hour === hour && portfolio.portfolio_id
      )

      // Get unique portfolios for this hour
      const uniquePortfolios = new Set(hourPortfolios.map(p => p.portfolio_id))
      const portfoliosChecked = uniquePortfolios.size

      // Calculate coverage percentage
      const coverage = totalPortfoliosCount > 0
        ? Math.round((portfoliosChecked / totalPortfoliosCount) * 100 * 10) / 10
        : 0

      // Count total issues for this hour (for tooltip display)
      const hourIssues = (issuesData || []).filter(
        issue => issue.issue_hour === hour && issue.portfolio_id
      )
      const totalIssues = hourIssues.length

      return {
        hour,
        coverage,
        portfoliosChecked,
        totalIssues,
        totalPortfolios: totalPortfoliosCount,
      }
    })

    console.log('Hourly coverage result (sample hours 0-6):', hourlyData.slice(0, 7).map(d => ({ hour: d.hour, coverage: d.coverage, portfoliosChecked: d.portfoliosChecked })))

    return hourlyData
  },
}


import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { issueService } from '../../services/issueService'
import { portfolioService } from '../../services/portfolioService'
import { analyticsService } from '../../services/analyticsService'
import { adminService } from '../../services/adminService'
import { Issue } from '../../types/issue.types'
import { Portfolio } from '../../types/portfolio.types'
import { User } from '../../types/user.types'
import { HourlyCoverage } from '../../types/analytics.types'
import Card from '../common/Card'
import Button from '../common/Button'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

interface PerformanceAnalyticsProps {
  dateRange?: 'today' | 'yesterday' | 'week' | 'custom'
  startDate?: string
  endDate?: string
}

const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  dateRange = 'today',
  startDate,
  endDate,
}) => {
  const { user: currentUser } = useAuth()
  const [selectedRange, setSelectedRange] = useState<'today' | 'yesterday' | 'week' | 'custom'>(
    dateRange
  )
  const [customStartDate, setCustomStartDate] = useState(startDate || '')
  const [customEndDate, setCustomEndDate] = useState(endDate || '')
  const [selectedPerformer, setSelectedPerformer] = useState<{
    user: any
    rank: number
    category: string
    metric: string
    value: number
  } | null>(null)

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfolioService.getAll,
  })

  // Fetch users to map emails to display names
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  })

  // Fetch issues
  const { data: issues = [] } = useQuery<Issue[]>({
    queryKey: ['issues'],
    queryFn: () => issueService.getAll({}),
  })

  // Fetch admin logs
  const { data: adminLogs = [] } = useQuery<any[]>({
    queryKey: ['admin-logs'],
    queryFn: adminService.getLogs,
  })

  // Fetch hourly coverage
  const { data: hourlyCoverage = [] } = useQuery<HourlyCoverage[]>({
    queryKey: ['hourly-coverage-range', selectedRange, customStartDate, customEndDate],
    queryFn: async () => {
      const today = new Date()
      let start: string | undefined
      let end: string | undefined

      if (selectedRange === 'today') {
        const todayStr = today.toISOString().split('T')[0]
        start = todayStr
        end = todayStr
      } else if (selectedRange === 'yesterday') {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        start = yesterdayStr
        end = yesterdayStr
      } else if (selectedRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        start = weekAgo.toISOString().split('T')[0]
        end = today.toISOString().split('T')[0]
      } else if (selectedRange === 'custom' && customStartDate && customEndDate) {
        start = customStartDate
        end = customEndDate
      } else {
        const todayStr = today.toISOString().split('T')[0]
        start = todayStr
        end = todayStr
      }

      return analyticsService.getHourlyCoverageWithDateRange(start, end)
    },
  })

  // Calculate analytics
  const analytics = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Filter issues based on date range
    let filteredIssues = issues

    if (selectedRange === 'today') {
      filteredIssues = issues.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        issueDate.setHours(0, 0, 0, 0)
        return issueDate.getTime() === today.getTime()
      })
    } else if (selectedRange === 'yesterday') {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      filteredIssues = issues.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        issueDate.setHours(0, 0, 0, 0)
        return issueDate.getTime() === yesterday.getTime()
      })
    } else if (selectedRange === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      filteredIssues = issues.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        return issueDate >= weekAgo
      })
    } else if (selectedRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59, 999)
      filteredIssues = issues.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        return issueDate >= start && issueDate <= end
      })
    }

    const totalPortfolios = portfolios.length || 26
    const uniquePortfoliosToday = new Set(filteredIssues.map((i) => i.portfolio_id))
    const overallCoverage = totalPortfolios > 0 ? (uniquePortfoliosToday.size / totalPortfolios) * 100 : 0

    // Calculate active hours (hours with at least one issue)
    const activeHoursSet = new Set(filteredIssues.map((i) => i.issue_hour))
    const activeHours = activeHoursSet.size

    // Calculate average hourly coverage
    const avgHourlyCoverage =
      hourlyCoverage.length > 0
        ? hourlyCoverage.reduce((sum, h) => sum + h.coverage, 0) / hourlyCoverage.length
        : 0
    const performanceScore = Math.round(avgHourlyCoverage / 10)

    // Find peak and lowest coverage hours
    const peakHour = hourlyCoverage.reduce(
      (max, current) => (current.coverage > max.coverage ? current : max),
      hourlyCoverage[0] || { hour: 0, coverage: 0 }
    )
    const lowestHour = hourlyCoverage.reduce(
      (min, current) => (current.coverage < min.coverage ? current : min),
      hourlyCoverage[0] || { hour: 0, coverage: 0 }
    )

    // Calculate hours with 100% coverage
    const fullCoverageHours = hourlyCoverage.filter((h) => h.coverage === 100).length

    // Calculate per-user stats
    const userStatsMap: {
      [key: string]: {
        user: string
        displayName: string
        issues: number
        issuesYes: number
        portfoliosCount: number
        hoursCount: number
        missedAlerts: number
        portfolios: string[]
        hourlyBreakdown: { [hour: number]: { portfolios: number; issues: number; issuesYes: number } }
      }
    } = {}

    filteredIssues.forEach((issue) => {
      const monitoredBy = (issue.monitored_by?.[0] || 'Unknown').toLowerCase()
      // Find user by email to get full_name, otherwise use email prefix
      const user = users.find((u) => u.email?.toLowerCase() === monitoredBy)
      // Ensure full_name is valid - if it looks like a password (too long, no spaces, etc), use email instead
      let displayName = user?.full_name
      if (!displayName || displayName.trim() === '' || displayName.length > 100 || (!displayName.includes(' ') && displayName.length > 20)) {
        // If full_name is missing, invalid, or suspiciously long (might be a password), use email prefix
        // Format email prefix nicely: "sanjaykumarg" -> "Sanjaykumarg"
        const emailPrefix = monitoredBy.split('@')[0] || 'Unknown'
        displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
        if (user) {
          console.warn('⚠️ Performance Analytics - Using email prefix as display name:', {
            issueId: issue.id,
            userEmail: monitoredBy,
            full_name: user?.full_name,
            displayName,
            reason: !user?.full_name ? 'missing' : user?.full_name.length > 100 ? 'too long' : 'no spaces',
          })
        }
      } else {
        displayName = displayName.trim()
      }

      if (!userStatsMap[monitoredBy]) {
        userStatsMap[monitoredBy] = {
          user: monitoredBy,
          displayName,
          issues: 0,
          issuesYes: 0,
          portfoliosCount: 0,
          hoursCount: 0,
          missedAlerts: 0,
          portfolios: [],
          hourlyBreakdown: {},
        }
      }

      const hour = issue.issue_hour ?? 0
      if (!userStatsMap[monitoredBy].hourlyBreakdown[hour]) {
        userStatsMap[monitoredBy].hourlyBreakdown[hour] = { portfolios: 0, issues: 0, issuesYes: 0 }
      }
      userStatsMap[monitoredBy].hourlyBreakdown[hour].issues++
      if (issue.description && issue.description.toLowerCase() !== 'no issue') {
        userStatsMap[monitoredBy].hourlyBreakdown[hour].issuesYes++
      }

      userStatsMap[monitoredBy].issues++
      if (issue.description && issue.description.toLowerCase() !== 'no issue') {
        userStatsMap[monitoredBy].issuesYes++
      }
      if (issue.missed_by && issue.missed_by.length > 0) {
        userStatsMap[monitoredBy].missedAlerts += issue.missed_by.length
      }
    })

    // COUNT PORTFOLIO MONITORED FROM LOGS (Accurate/Historical)
    // Filter logs for completion/monitored events within range
    const portfolioActivityLogs = adminLogs.filter(log => {
      if (log.action_type !== 'PORTFOLIO_CHECKED' && log.action_type !== 'PORTFOLIO_LOCKED') return false

      const logDate = new Date(log.created_at)
      if (selectedRange === 'today') {
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === today.getTime()
      } else if (selectedRange === 'yesterday') {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === yesterday.getTime()
      } else if (selectedRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        return logDate >= weekAgo
      } else if (selectedRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        return logDate >= start && logDate <= end
      }
      return true
    })

    // Track portfolio completions to avoid double-counting between logs and portfolios table
    let totalPortfoliosCheckedCount = 0
    const completionKeys = new Set<string>()
    const userHoursMap: { [key: string]: Set<number> } = {}

    // Track total unique portfolios checked globally (for dashboard stats)
    const uniquePortfoliosCheckedSet = new Set<string>()

    // Record each log event to the appropriate user
    portfolioActivityLogs.forEach(log => {
      const monitoredBy = (log.admin_name || 'Unknown').toLowerCase()
      const portfolioId = log.related_portfolio_id
      const logDate = new Date(log.created_at).toISOString().split('T')[0]
      const logHour = log.metadata?.hour ?? new Date(log.created_at).getHours()

      if (portfolioId) {
        totalPortfoliosCheckedCount++
        // Create unique key to prevent double-counting with portfolios table fallback
        completionKeys.add(`${portfolioId}_${logDate}_${logHour}_${monitoredBy}`)
      }

      if (!userStatsMap[monitoredBy]) {
        // Initialize user if they haven't logged any issues but have completions
        const foundUser = users.find(u => u.email?.toLowerCase() === monitoredBy)
        let displayName = monitoredBy.split('@')[0]
        if (foundUser?.full_name) displayName = foundUser.full_name

        userStatsMap[monitoredBy] = {
          user: monitoredBy,
          displayName,
          issues: 0,
          issuesYes: 0,
          portfoliosCount: 0,
          hoursCount: 0,
          missedAlerts: 0,
          portfolios: [],
          hourlyBreakdown: {},
        }
      }

      const userEmailVal = userStatsMap[monitoredBy].user
      if (!userStatsMap[userEmailVal].hourlyBreakdown[logHour]) {
        userStatsMap[userEmailVal].hourlyBreakdown[logHour] = { portfolios: 0, issues: 0, issuesYes: 0 }
      }
      userStatsMap[userEmailVal].hourlyBreakdown[logHour].portfolios++

      // Increment portfoliosCount for every log entry (cumulative)
      userStatsMap[monitoredBy].portfoliosCount++

      // Add portfolio details
      const portfolio = portfolios.find(p => p.id === portfolioId)
      if (portfolio) {
        const siteRange = portfolio.site_range ? ` (${portfolio.site_range})` : ''
        userStatsMap[monitoredBy].portfolios.push(`${portfolio.name}${siteRange}`)
      }

      // Also ensure hours count includes log hours
      const userEmail = userStatsMap[monitoredBy].user
      if (!userHoursMap[userEmail]) userHoursMap[userEmail] = new Set()
      userHoursMap[userEmail].add(logHour)
    })

    // FALLBACK: Process portfolios table for existing/one-off completions not yet in logs
    portfolios.forEach((portfolio) => {
      // Only count portfolios that have been completed (all_sites_checked = 'Yes')
      if (portfolio.all_sites_checked !== 'Yes' || !portfolio.all_sites_checked_date || !portfolio.all_sites_checked_by) {
        return
      }

      const checkedDateStr = portfolio.all_sites_checked_date
      const normalizedCheckedDate = checkedDateStr.split('T')[0]

      // Date range filtering
      let isInRange = true
      const todayStr = today.toISOString().split('T')[0]

      if (selectedRange === 'today') {
        isInRange = normalizedCheckedDate === todayStr
      } else if (selectedRange === 'yesterday') {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        isInRange = normalizedCheckedDate === yesterdayStr
      } else if (selectedRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        isInRange = new Date(checkedDateStr) >= weekAgo
      } else if (selectedRange === 'custom' && customStartDate && customEndDate) {
        isInRange = normalizedCheckedDate >= customStartDate && normalizedCheckedDate <= customEndDate
      }

      if (!isInRange) return

      // Find user
      let checkedByUser = users.find((u) => u.id === portfolio.all_sites_checked_by)
      let userEmail = checkedByUser?.email

      // If not in our user list (like a Super Admin), check if it's the current user
      if (!checkedByUser && currentUser && currentUser.userId === portfolio.all_sites_checked_by) {
        userEmail = currentUser.email
      }

      if (!userEmail) return

      const userEmailLower = userEmail.toLowerCase()
      const completionHour = portfolio.all_sites_checked_hour ?? 0
      const portfolioId = portfolio.id

      // Check if this completion was already counted from logs
      const key = `${portfolioId}_${normalizedCheckedDate}_${completionHour}_${userEmailLower}`
      if (completionKeys.has(key)) return // Already counted from logs

      // Not in logs, so count it from the portfolios table fallback
      if (!userStatsMap[userEmailLower]) {
        userStatsMap[userEmailLower] = {
          user: userEmailLower,
          displayName: checkedByUser?.full_name || userEmail.split('@')[0],
          issues: 0,
          issuesYes: 0,
          portfoliosCount: 0,
          hoursCount: 0,
          missedAlerts: 0,
          portfolios: [],
          hourlyBreakdown: {},
        }
      }

      if (!userStatsMap[userEmailLower].hourlyBreakdown[completionHour]) {
        userStatsMap[userEmailLower].hourlyBreakdown[completionHour] = { portfolios: 0, issues: 0, issuesYes: 0 }
      }
      userStatsMap[userEmailLower].hourlyBreakdown[completionHour].portfolios++

      userStatsMap[userEmailLower].portfoliosCount++

      // Add portfolio details
      const siteRange = portfolio.site_range ? ` (${portfolio.site_range})` : ''
      userStatsMap[userEmailLower].portfolios.push(`${portfolio.name}${siteRange}`)

      totalPortfoliosCheckedCount++

      if (!userHoursMap[userEmailLower]) userHoursMap[userEmailLower] = new Set()
      userHoursMap[userEmailLower].add(completionHour)
    })

    // Calculate hours from issues (for hoursCount)
    // Only count issues from valid, active users
    filteredIssues.forEach((issue) => {
      const issueMonitoredBy = Array.isArray(issue.monitored_by)
        ? issue.monitored_by[0]
        : issue.monitored_by

      if (!issueMonitoredBy) return

      const userStr = String(issueMonitoredBy).trim().toLowerCase()
      const user = users.find((u) => u.email?.toLowerCase() === userStr)

      if (!user) return

      const userEmail = user.email
      if (!userHoursMap[userEmail]) {
        userHoursMap[userEmail] = new Set()
      }
      if (issue.issue_hour !== undefined) {
        userHoursMap[userEmail].add(issue.issue_hour)
      }
    })

    Object.keys(userStatsMap).forEach((user) => {
      userStatsMap[user].hoursCount = userHoursMap[user]?.size || 0
    })

    const perUserStats = Object.values(userStatsMap)

    // Leaderboards
    const byIssuesYes = [...perUserStats].sort(
      (a, b) => b.issuesYes - a.issuesYes || b.issues - a.issues
    )
    const byCoverage = [...perUserStats].sort(
      (a, b) => b.portfoliosCount - a.portfoliosCount || b.issues - a.issues
    )
    const byHours = [...perUserStats].sort(
      (a, b) => b.hoursCount - a.hoursCount || b.issues - a.issues
    )

    return {
      peakHour,
      lowestHour,
      fullCoverageHours,
      overallCoverage,
      performanceScore,
      portfoliosChecked: totalPortfoliosCheckedCount,
      totalPortfolios,
      totalIssuesLogged: filteredIssues.length,
      activeHours,
      perUserStats,
      leaderboard: {
        issuesYes: byIssuesYes.slice(0, 7),
        coverage: byCoverage.slice(0, 7),
        hours: byHours.slice(0, 7),
      },
    }
  }, [issues, portfolios, hourlyCoverage, selectedRange, customStartDate, customEndDate, users])

  const getPerformanceLabel = (score: number) => {
    if (score >= 8) return { text: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
    if (score >= 5) return { text: 'Good', color: 'text-lime-600', bgColor: 'bg-lime-50', borderColor: 'border-lime-200' }
    if (score >= 3) return { text: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' }
    return { text: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
  }

  const performanceLabel = getPerformanceLabel(analytics.performanceScore)

  const handleExportCSV = () => {
    const csvRows = [
      ['User', 'Total Count', 'Total Portfolios Monitored', 'Monitoring Active Hours', 'Missed Alerts'],
      ...analytics.perUserStats.map((u) => [
        u.displayName,
        u.issues.toString(),
        u.portfoliosCount.toString(),
        u.hoursCount.toString(),
        u.missedAlerts.toString(),
      ]),
    ]

    const csvContent = csvRows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance_analytics_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Performance analytics exported successfully')
  }

  // Calculate consistent hours with 70%+ coverage
  const consistentHours = hourlyCoverage.filter((h) => h.coverage >= 70).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Performance Analytics</h1>
          <p className="text-base text-gray-600 mt-1.5" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Coverage, activity, and portfolio insights</p>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Range:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedRange('today')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${selectedRange === 'today'
              ? 'text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            style={selectedRange === 'today' ? { backgroundColor: '#76ab3f', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } : { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedRange('yesterday')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${selectedRange === 'yesterday'
              ? 'text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            style={selectedRange === 'yesterday' ? { backgroundColor: '#76ab3f' } : {}}
          >
            Yesterday
          </button>
          <button
            onClick={() => setSelectedRange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${selectedRange === 'week'
              ? 'text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            style={selectedRange === 'week' ? { backgroundColor: '#76ab3f' } : {}}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setSelectedRange('custom')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${selectedRange === 'custom'
              ? 'text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            style={selectedRange === 'custom' ? { backgroundColor: '#76ab3f' } : {}}
          >
            Custom Range
          </button>
        </div>
        <span className="text-sm text-gray-600 font-medium">
          Showing {analytics.totalIssuesLogged} issues
        </span>
        {selectedRange === 'custom' && (
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            />
          </div>
        )}
      </div>

      {/* Main Metrics - Top Row - All Same Size - Professional Styling */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Overall Coverage"
          value={`${Math.round(analytics.overallCoverage)}%`}
          accent="text-green-600"
          highlight="bg-green-100"
        />
        <MetricCard
          label="Portfolios Checked"
          value={analytics.portfoliosChecked}
          highlight="bg-blue-100"
        />
        <MetricCard
          label="Monitoring Active Hours"
          value={`${analytics.activeHours}/24`}
          highlight="bg-orange-100"
        />
        <MetricCard
          label="Issues Logged"
          value={analytics.totalIssuesLogged}
          highlight="bg-purple-100"
        />
      </div>

      {/* Second Row - 3 Detail Panels - Professional Styling */}
      <div className="grid grid-cols-3 gap-4">
        {/* Coverage Window */}
        <Card className="flex flex-col h-full">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Coverage Window</h3>
          <p className="text-sm text-gray-600 mb-3" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Hourly distribution of coverage.</p>
          <div className="space-y-2 flex-1">
            <div>
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Peak hour: </span>
              <span className="text-sm font-semibold text-gray-900">{analytics.peakHour.hour}:00</span>
            </div>
            <div>
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Lowest hour: </span>
              <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{analytics.lowestHour.hour}:00</span>
            </div>
            <div>
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Hours with full coverage: </span>
              <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{analytics.fullCoverageHours}/24</span>
            </div>
          </div>
        </Card>

        {/* Activity Snapshot */}
        <Card className="flex flex-col h-full">
          <h3 className="text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Activity Snapshot</h3>
          <p className="text-sm text-gray-600 mb-3" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>What's been logged so far.</p>
          <div className="space-y-2 flex-1">
            <div>
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Total Count: </span>
              <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{analytics.totalIssuesLogged}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Monitoring Active Hours: </span>
              <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{analytics.activeHours}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Consistent hours (70%+): </span>
              <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{consistentHours}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Consistency measures how many hours met the 70% coverage benchmark.
            </p>
          </div>
        </Card>

        {/* Portfolio Coverage */}
        <Card className="flex flex-col h-full">
          <h3 className="text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Portfolio Coverage</h3>
          <p className="text-sm text-gray-600 mb-3" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>How many portfolios have been touched.</p>
          <div className="space-y-2 flex-1">
            <div>
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Checked: </span>
              <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{analytics.portfoliosChecked}</span>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min((analytics.portfoliosChecked / analytics.totalPortfolios) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Need attention: </span>
              <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{Math.max(0, analytics.totalPortfolios - analytics.portfoliosChecked)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section - Top Performers + Team Performance */}
      <div className="grid grid-cols-12 gap-4 max-w-7xl">
        {/* Top Performers - Left Side */}
        <div className="col-span-5">
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Top Performers</h2>
            <p className="text-xs text-gray-500 mb-5" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Leaders by coverage and findings.</p>

            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide border-b border-gray-200 pb-2" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Most Total Portfolios Monitored</h3>
                <div className="space-y-1.5">
                  {analytics.leaderboard.coverage.slice(0, 5).map((user, idx) => (
                    <div
                      key={user.user}
                      onClick={() => setSelectedPerformer({
                        user,
                        rank: idx + 1,
                        category: 'Most Total Portfolios Monitored',
                        metric: 'Total Portfolios Monitored',
                        value: user.portfoliosCount
                      })}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{idx + 1}</span>
                        </div>
                        <span className="text-sm text-gray-800 hover:text-green-600 transition-colors font-semibold" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{user.displayName || user.user}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-md" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{user.portfoliosCount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide border-b border-gray-200 pb-2" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Most Monitoring Active Hours</h3>
                <div className="space-y-1.5">
                  {analytics.leaderboard.hours.slice(0, 5).map((user, idx) => (
                    <div
                      key={user.user}
                      onClick={() => setSelectedPerformer({
                        user,
                        rank: idx + 1,
                        category: 'Most Monitoring Active Hours',
                        metric: 'Monitoring Active Hours',
                        value: user.hoursCount
                      })}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{idx + 1}</span>
                        </div>
                        <span className="text-sm text-gray-800 hover:text-green-600 transition-colors font-semibold" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{user.displayName || user.user}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-md" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{user.hoursCount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide border-b border-gray-200 pb-2" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Most Active Issues</h3>
                <div className="space-y-1.5">
                  {analytics.leaderboard.issuesYes.slice(0, 5).map((user, idx) => (
                    <div
                      key={user.user}
                      onClick={() => setSelectedPerformer({
                        user,
                        rank: idx + 1,
                        category: 'Most Active Issues',
                        metric: 'Active Issues',
                        value: user.issuesYes
                      })}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{idx + 1}</span>
                        </div>
                        <span className="text-sm text-gray-800 hover:text-green-600 transition-colors font-semibold" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{user.displayName || user.user}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-md" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{user.issuesYes}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Team Performance Table - Right Side */}
        <div className="col-span-7">
          <Card>
            <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Team Performance</h2>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Filtered by: {
                  selectedRange === 'today' ? 'Today' :
                    selectedRange === 'yesterday' ? 'Yesterday' :
                      selectedRange === 'week' ? 'Last 7 days' :
                        'Custom Range'
                }</p>
              </div>
              <Button
                onClick={handleExportCSV}
                variant="primary"
                size="sm"
                className="shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: '#76ab3f', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                Export Data
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      User
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      Total Count
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      Total Portfolios Monitored
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      Monitoring Active Hours
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      Missed Alerts
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.perUserStats.map((u, idx) => {
                    // Determine if user is a top performer (top 3 in any category)
                    const isTopPerformer = idx < 3
                    return (
                      <tr
                        key={u.user}
                        className={`transition-colors duration-200 border-b ${isTopPerformer
                          ? 'bg-green-50 hover:bg-green-100 border-green-200'
                          : 'border-gray-100 hover:bg-gray-50'
                          }`}
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${isTopPerformer ? 'ring-2 ring-green-400' : ''
                                }`}
                              style={{ backgroundColor: '#76AB3F' }}
                            >
                              {(u.displayName || u.user || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-semibold ${isTopPerformer ? 'text-green-800' : 'text-gray-900'}`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{u.displayName || u.user}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-md inline-block ${isTopPerformer
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-900'
                            }`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{u.issues}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-md inline-block ${isTopPerformer
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-900'
                            }`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{u.portfoliosCount}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-md inline-block ${isTopPerformer
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-900'
                            }`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{u.hoursCount}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${(u.missedAlerts || 0) === 0
                              ? 'text-white'
                              : (u.missedAlerts || 0) <= 3
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                              }`}
                            style={(u.missedAlerts || 0) === 0 ? { backgroundColor: '#76AB3F', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } : { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                          >
                            {u.missedAlerts || 0}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Top Performer Details Modal */}
      <Modal
        isOpen={selectedPerformer !== null}
        onClose={() => setSelectedPerformer(null)}
        title="User Performance Details"
        subtitle={selectedPerformer?.user.displayName || selectedPerformer?.user.user}
        size="lg"
      >
        {selectedPerformer && (
          <div className="space-y-6" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {/* Performer Highlight */}
            <div className="flex items-center justify-between bg-green-600 text-white -mx-6 -mt-6 px-6 py-4 mb-6 rounded-t-lg">
              <div>
                <h3 className="text-2xl font-bold">User Performance Details</h3>
                <p className="text-green-50 text-base mt-1 font-medium">{selectedPerformer.user.displayName || selectedPerformer.user.user}</p>
              </div>
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl font-bold">#{selectedPerformer.rank}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-3xl font-bold text-blue-600 mb-1">{selectedPerformer.user.issues}</p>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Total Count</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-3xl font-bold text-red-600 mb-1">{selectedPerformer.user.issuesYes}</p>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Active Issues</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-3xl font-bold text-green-600 mb-1">{selectedPerformer.user.issues - selectedPerformer.user.issuesYes}</p>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Healthy Sites</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-3xl font-bold text-orange-600 mb-1">{selectedPerformer.user.missedAlerts || 0}</p>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Missed Alerts</p>
              </div>
            </div>

            {/* Sub Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-3xl font-bold text-purple-600 mb-1">{selectedPerformer.user.portfoliosCount}</p>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-tight">Total Portfolios Monitored</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-3xl font-bold text-blue-600 mb-1">{selectedPerformer.user.hoursCount}</p>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-tight">Monitoring Active Hours</p>
              </div>
            </div>

            {/* Portfolios List */}
            {selectedPerformer.user.portfolios && selectedPerformer.user.portfolios.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4 px-1">Total Portfolios Monitored ({selectedPerformer.user.portfolios.length})</h4>
                <div className="flex flex-wrap gap-2 px-1">
                  {Array.from(new Set(selectedPerformer.user.portfolios)).map((portfolio: any, idx) => {
                    const count = selectedPerformer.user.portfolios.filter((p: string) => p === portfolio).length
                    const display = count > 1 ? `${portfolio} (x${count})` : portfolio
                    return (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-[#ecfdf3] text-[#027a48] rounded-full text-xs font-semibold border border-[#abefc6] shadow-sm flex items-center gap-2 transition-all hover:bg-[#d1fadf] hover:shadow-md"
                      >
                        <span className="w-1.5 h-1.5 bg-[#12b76a] rounded-full shadow-[0_0_4px_rgba(18,183,106,0.6)]"></span>
                        <span className="truncate">{display}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Hourly Breakdown Chart */}
            {selectedPerformer.user.hourlyBreakdown && Object.keys(selectedPerformer.user.hourlyBreakdown).length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4 px-1">Hourly Breakdown</h4>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: Object.keys(selectedPerformer.user.hourlyBreakdown).sort((a, b) => parseInt(a) - parseInt(b)).map(h => `${h}:00`),
                      datasets: [
                        {
                          label: 'Portfolios',
                          data: Object.keys(selectedPerformer.user.hourlyBreakdown).sort((a, b) => parseInt(a) - parseInt(b)).map(h => selectedPerformer.user.hourlyBreakdown[parseInt(h)].portfolios),
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          barThickness: 15,
                        },
                        {
                          label: 'Issues',
                          data: Object.keys(selectedPerformer.user.hourlyBreakdown).sort((a, b) => parseInt(a) - parseInt(b)).map(h => selectedPerformer.user.hourlyBreakdown[parseInt(h)].issues),
                          backgroundColor: 'rgba(59, 130, 246, 0.8)',
                          barThickness: 15,
                        },
                        {
                          label: 'Active Issues',
                          data: Object.keys(selectedPerformer.user.hourlyBreakdown).sort((a, b) => parseInt(a) - parseInt(b)).map(h => selectedPerformer.user.hourlyBreakdown[parseInt(h)].issuesYes),
                          backgroundColor: 'rgba(239, 68, 68, 0.8)',
                          barThickness: 15,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: true,
                          position: 'top' as const,
                          labels: {
                            boxWidth: 12,
                            font: { size: 11, weight: 'bold' }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { stepSize: 1 }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}



            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                onClick={() => setSelectedPerformer(null)}
                variant="primary"
                className="shadow-sm hover:shadow-md transition-shadow font-bold text-white px-8 py-2.5 rounded-lg"
                style={{ backgroundColor: '#76ab3f' }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  accent?: string
  highlight?: string
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, accent, highlight }) => {
  const bgClass = highlight?.includes('bg') ? highlight.split(' ').find(c => c.startsWith('bg')) : 'bg-white'

  return (
    <Card className="h-full flex flex-col p-0 overflow-hidden shadow-sm">
      <div className={`${bgClass} rounded-lg p-5 flex-1 flex flex-col justify-center`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${accent || 'text-gray-900'}`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{value}</p>
      </div>
    </Card>
  )
}

export default PerformanceAnalytics



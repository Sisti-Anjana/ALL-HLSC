import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, getElementAtEvent } from 'react-chartjs-2'
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
import { adminService } from '../../services/adminService'
import { Issue } from '../../types/issue.types'
import { Portfolio } from '../../types/portfolio.types'
import { User } from '../../types/user.types'
import { useAuth } from '../../context/AuthContext'
import Card from '../common/Card'
import Button from '../common/Button'
import Modal from '../common/Modal'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface UserHourData {
  completionsCount: number
  issues: Issue[]
  activeIssues: Issue[]
  portfolios: string[] // List of portfolio names with site ranges
}

interface UserMatrixData {
  userName: string
  displayName: string
  email: string
  totalPortfolios: number
  hours: { [hour: number]: UserHourData }
}

const CoverageMatrix: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [userSearch, setUserSearch] = useState('')
  const [hourFilter, setHourFilter] = useState<string>('all')
  const [issueFilter, setIssueFilter] = useState<'all' | 'active'>('all')
  const [fromDate, setFromDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [showCharts, setShowCharts] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserMatrixData | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{
    userId: string
    hour: number
    position: { top: number; left: number }
  } | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfolioService.getAll,
  })

  // Fetch users to map user IDs to emails - users don't change often, so less frequent refresh
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
    staleTime: 30000, // Consider data fresh for 30 seconds (users don't change often)
    refetchInterval: 60000, // Refresh every 60 seconds (reduced from 1s to prevent page freeze)
  })

  // Log users when they load
  useEffect(() => {
    /* if (users.length > 0) {
      console.log('👥 Coverage Matrix - Users loaded:', users.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        emailLower: u.email?.toLowerCase(),
      })))
    } else {
      console.warn('⚠️ Coverage Matrix - Users array is empty!', { usersLoading, usersCount: users.length })
    } */
  }, [users, usersLoading])


  // Fetch issues
  const { data: allIssues = [] } = useQuery<Issue[]>({
    queryKey: ['issues'],
    queryFn: () => issueService.getAll({}),
  })

  // Fetch admin logs
  const { data: adminLogs = [] } = useQuery<any[]>({
    queryKey: ['admin-logs'],
    queryFn: adminService.getLogs,
  })

  // Filter issues by date range
  const filteredIssues = useMemo(() => {
    let filtered = allIssues

    if (fromDate && toDate) {
      // Use date string comparison to avoid timezone issues
      filtered = filtered.filter((issue) => {
        if (!issue.created_at) return false
        const issueDateStr = new Date(issue.created_at).toISOString().split('T')[0]
        return issueDateStr >= fromDate && issueDateStr <= toDate
      })
    }

    // Issue filter
    if (issueFilter === 'active') {
      filtered = filtered.filter(
        (issue) => issue.description && issue.description.toLowerCase() !== 'no issue'
      )
    }

    // Hour filter
    if (hourFilter !== 'all') {
      const hour = parseInt(hourFilter)
      filtered = filtered.filter((issue) => issue.issue_hour === hour)
    }

    return filtered
  }, [allIssues, fromDate, toDate, issueFilter, hourFilter])

  // Build matrix data - based on "All Sites Checked = Yes" completions
  // Count portfolios based on each time a portfolio is completed (not just issues entered)
  const matrixData = useMemo(() => {
    // Don't process if users haven't loaded yet
    if (usersLoading || users.length === 0) {
      // console.log('⏳ Coverage Matrix - Waiting for users to load...', { usersLoading, usersCount: users.length })
      return []
    }

    // Track completions to avoid double-counting
    const completionKeys = new Set<string>()

    const userMap: { [key: string]: UserMatrixData } = {}

    // Normalize date range for comparison
    const normalizedFromDate = fromDate ? fromDate.split('T')[0] : null
    const normalizedToDate = toDate ? toDate.split('T')[0] : null

    // Helper to get or init user
    const getOrInitUser = (email: string, displayName: string) => {
      if (!userMap[email]) {
        userMap[email] = {
          userName: email,
          displayName,
          email,
          totalPortfolios: 0,
          hours: {},
        }
      }
      return userMap[email]
    }

    // Initialize hours for each user to ensure keys exist before increments
    const initHour = (user: UserMatrixData, hour: number) => {
      if (!user.hours[hour]) {
        user.hours[hour] = {
          completionsCount: 0,
          issues: [],
          activeIssues: [],
          portfolios: [],
        }
      }
      return user.hours[hour]
    }

    // 1. PROCESS LOGS (Historical / Accurate)
    const portfolioActivityLogs = adminLogs.filter(log => {
      if (log.action_type !== 'PORTFOLIO_CHECKED') return false

      // Use checking date from metadata if available, otherwise fallback to creation date
      let checkDate = new Date(log.created_at).toISOString().split('T')[0]
      let meta = log.metadata
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta) } catch (e) { }
      }
      if (meta?.date) {
        checkDate = meta.date.split('T')[0]
      }

      if (normalizedFromDate && checkDate < normalizedFromDate) return false
      if (normalizedToDate && checkDate > normalizedToDate) return false
      return true
    })

    /* console.log('🔍 Coverage Matrix Processing:', {
      totalLogs: adminLogs.length,
      filteredLogs: portfolioActivityLogs.length,
      dateRange: { normalizedFromDate, normalizedToDate }
    }) */

    portfolioActivityLogs.forEach(log => {
      const monitoredBy = (log.admin_name || 'Unknown').toLowerCase()
      const portfolioId = log.related_portfolio_id

      let meta = log.metadata
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta) } catch (e) { }
      }

      // ENSURE logHour is a number
      const rawHour = meta?.hour !== undefined ? meta.hour : new Date(log.created_at).getHours()
      const logHour = typeof rawHour === 'string' ? parseInt(rawHour) : Number(rawHour)

      // Use meta date or creation date for grouping
      let logDate = new Date(log.created_at).toISOString().split('T')[0]
      if (meta?.date) {
        logDate = meta.date.split('T')[0]
      }

      if (!portfolioId) return

      // Apply hour filter
      if (hourFilter !== 'all' && logHour !== parseInt(hourFilter)) {
        return
      }

      // Find user
      const userStr = monitoredBy
      const foundUser = users.find(u => u.email?.toLowerCase() === userStr)
      let displayName = monitoredBy.split('@')[0]
      if (foundUser?.full_name) displayName = foundUser.full_name

      const user = getOrInitUser(userStr, displayName)
      const hourData = initHour(user, logHour)

      // Increment completionsCount for every log entry (cumulative)
      hourData.completionsCount++
      user.totalPortfolios++

      const portfolio = portfolios.find(p => p.id === portfolioId)
      if (portfolio) {
        const portfolioDetail = `${portfolio.name}${portfolio.site_range ? ` (${portfolio.site_range})` : ''} `
        hourData.portfolios.push(portfolioDetail)
      }

      // Track the key to prevent double-counting the latest session from the portfolios table
      const key = `${portfolioId}_${logDate}_${logHour}_${userStr} `
      completionKeys.add(key)
    })

    portfolios.forEach((portfolio) => {
      // Only count portfolios that have been completed (all_sites_checked = 'Yes')
      if (portfolio.all_sites_checked !== 'Yes' || !portfolio.all_sites_checked_date || !portfolio.all_sites_checked_by) {
        return
      }

      // Check if completion date is within the selected date range
      const checkedDateStr = portfolio.all_sites_checked_date
      const normalizedCheckedDate = checkedDateStr.split('T')[0] // Remove time if present

      // Strict date filtering - portfolio completion must be within the selected date range
      if (normalizedFromDate && normalizedCheckedDate < normalizedFromDate) {
        /* console.log('⏭️ Coverage Matrix - Skipping portfolio (before date range):', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          checkedDate: normalizedCheckedDate,
          fromDate: normalizedFromDate,
        }) */
        return // Skip - before date range
      }
      if (normalizedToDate && normalizedCheckedDate > normalizedToDate) {
        /* console.log('⏭️ Coverage Matrix - Skipping portfolio (after date range):', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          checkedDate: normalizedCheckedDate,
          toDate: normalizedToDate,
        }) */
        return // Skip - after date range
      }

      // Get the user who completed it (all_sites_checked_by is a user ID/UUID from JWT token)
      // Try ID match first - this should work if the user exists
      const checkedByValue = portfolio.all_sites_checked_by
      const checkedByValueStr = String(checkedByValue)

      let checkedByUser = users.find((u) => {
        const userIdStr = String(u.id)
        const matches = userIdStr === checkedByValueStr || u.id === checkedByValue
        /* if (matches) {
          console.log('✅ Coverage Matrix - Found user by ID match:', {
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            checkedByValue: checkedByValue,
            checkedByValueStr: checkedByValueStr,
            matchedUserId: u.id,
            matchedUserIdStr: userIdStr,
            matchedUserEmail: u.email,
            matchedUserName: u.full_name,
          })
        } */
        return matches
      })

      // If ID match fails, try email match (fallback for data inconsistencies)
      if (!checkedByUser) {
        /* console.warn('⚠️ Coverage Matrix - User ID not found, trying email match:', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          checkedByValue: checkedByValue,
          checkedByValueStr: checkedByValueStr,
          checkedByType: typeof checkedByValue,
          availableUserIds: users.map(u => ({
            id: u.id,
            idStr: String(u.id),
            email: u.email,
            full_name: u.full_name,
            idMatches: String(u.id) === checkedByValueStr,
            idMatchesStrict: u.id === checkedByValue,
          })),
        }) */
        checkedByUser = users.find((u) =>
          u.email && u.email.toLowerCase() === checkedByValueStr.toLowerCase()
        )
        /* if (checkedByUser) {
          console.log('✅ Coverage Matrix - Found user by email match:', {
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            checkedByValue: checkedByValue,
            matchedUserEmail: checkedByUser.email,
            matchedUserName: checkedByUser.full_name,
          })
        } */
      }

      if (!checkedByUser) {
        // If not found in user list, check if it's the current user (e.g. Super Admin)
        if (currentUser && currentUser.userId === checkedByValueStr) {
          checkedByUser = {
            id: currentUser.userId,
            email: currentUser.email,
            full_name: currentUser.email.split('@')[0], // Fallback name
          } as any
          /* console.log('✅ Coverage Matrix - Matched current user (Super Admin):', {
            portfolioId: portfolio.id,
            userEmail: checkedByUser?.email || currentUser?.email
          }) */
        }
      }

      if (!checkedByUser) {
        // User not found - skip this portfolio (don't count it)
        // This ensures only valid, active users are shown in the matrix
        /* console.warn('⚠️ Coverage Matrix - User not found for portfolio completion, skipping:', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          checkedByValue: portfolio.all_sites_checked_by,
          checkedByType: typeof portfolio.all_sites_checked_by,
          availableUserIds: users.map(u => ({ id: u.id, email: u.email, full_name: u.full_name })),
          totalUsers: users.length,
        }) */
        return // Skip this portfolio - don't count it
      }

      const userEmail = (checkedByUser as any).email
      // Ensure full_name is valid - if it looks like a password (too long, no spaces, etc), use email instead
      let displayName = (checkedByUser as any).full_name
      if (!displayName || displayName.trim() === '' || displayName.length > 100 || (!displayName.includes(' ') && displayName.length > 20)) {
        // If full_name is missing, invalid, or suspiciously long (might be a password), use email prefix
        // Format email prefix nicely: "sanjaykumarg" -> "Sanjaykumarg"
        const emailPrefix = userEmail.split('@')[0] || 'Unknown'
        displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
        /* console.warn('⚠️ Coverage Matrix - Using email prefix as display name:', {
          portfolioId: portfolio.id,
          userEmail,
          full_name: (checkedByUser as any).full_name,
          displayName,
          reason: !(checkedByUser as any).full_name ? 'missing' : (checkedByUser as any).full_name.length > 100 ? 'too long' : 'no spaces',
        }) */
      } else {
        displayName = (checkedByUser as any).full_name.trim()
      }
      const completionHour = portfolio.all_sites_checked_hour ?? 0

      // Apply hour filter to fallback portfolios
      if (hourFilter !== 'all' && completionHour !== parseInt(hourFilter)) {
        return
      }

      /* console.log('Coverage Matrix Debug - Processing completed portfolio:', {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        checkedBy: userEmail,
        checkedDate: normalizedCheckedDate,
        completionHour,
      }) */

      const portfolioId = portfolio.id || (portfolio as any).portfolio_id
      const key = `${portfolioId}_${normalizedCheckedDate}_${completionHour}_${userEmail.toLowerCase()} `

      // Check if we already have this completion session from the logs to avoid double counting the latest session
      if (completionKeys.has(key)) {
        /* console.log('⏭️ Fallback Skipped (In Logs):', key) */
        return
      }

      /* console.log('✅ Fallback Counted:', key) */

      const user = getOrInitUser(userEmail.toLowerCase(), displayName)
      const hourData = initHour(user, completionHour)

      hourData.completionsCount++
      user.totalPortfolios++

      // Add portfolio details
      const siteRange = portfolio.site_range ? ` (${portfolio.site_range})` : ''
      const portfolioDetail = `${portfolio.name}${siteRange} `
      hourData.portfolios.push(portfolioDetail)

      // Mark as seen so we don't count it again if there are multiple fallback iterations (though there shouldn't be)
      completionKeys.add(key)
    })

    // Now process issues to count issues (not portfolios) per user per hour
    filteredIssues.forEach((issue) => {
      // Get monitored_by field (can be string or array)
      let monitoredByEmails: string[] = []
      if (issue.monitored_by) {
        if (Array.isArray(issue.monitored_by)) {
          monitoredByEmails = issue.monitored_by
            .filter((email): email is string => typeof email === 'string')
            .filter((email) => email.trim() !== '')
        } else {
          // Handle case where monitored_by might be a single string (though type says array)
          const emailValue = String(issue.monitored_by).trim()
          if (emailValue !== '') {
            monitoredByEmails = [emailValue]
          }
        }
      }

      // Skip if no monitored_by field
      if (monitoredByEmails.length === 0) {
        return
      }

      // Check hour filter
      if (hourFilter !== 'all' && issue.issue_hour !== undefined) {
        const hour = parseInt(hourFilter)
        if (issue.issue_hour !== hour) {
          return
        }
      }

      const hour = issue.issue_hour ?? 0

      // Process each user in monitored_by
      monitoredByEmails.forEach((monitoredByEmail) => {
        // Normalize email: trim whitespace and convert to lowercase
        const normalizedMonitoredEmail = String(monitoredByEmail).trim().toLowerCase()

        // Find user by email (case-insensitive match with trimmed whitespace)
        const user = users.find((u) => {
          if (!u.email) return false
          const normalizedUserEmail = String(u.email).trim().toLowerCase()
          return normalizedUserEmail === normalizedMonitoredEmail
        })

        if (!user) {
          // User not found by email (e.g. Super Admin) - Fallback to use the email directly
          // console.warn(`⚠️ Coverage Matrix - User not found in list, using email fallback: "${monitoredByEmail}"`)

          const userEmail = normalizedMonitoredEmail
          const emailPrefix = userEmail.split('@')[0] || 'Unknown'
          const displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)

          const userInMap = getOrInitUser(userEmail, displayName)
          initHour(userInMap, hour)

          userMap[userEmail].hours[hour].issues.push(issue)
          if (issue.description && issue.description.toLowerCase() !== 'no issue') {
            userMap[userEmail].hours[hour].activeIssues.push(issue)
          }
        } else {
          // User found - process normally
          const userEmail = user.email
          // Ensure full_name is valid - if it looks like a password (too long, no spaces, etc), use email instead
          let displayName = user.full_name
          if (!displayName || displayName.trim() === '' || displayName.length > 100 || (!displayName.includes(' ') && displayName.length > 20)) {
            // If full_name is missing, invalid, or suspiciously long (might be a password), use email prefix
            // Format email prefix nicely: "sanjaykumarg" -> "Sanjaykumarg"
            const emailPrefix = userEmail.split('@')[0] || 'Unknown'
            displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
            /* console.warn('⚠️ Coverage Matrix - Using email prefix as display name for issue:', {
              issueId: issue.id,
              userEmail,
              full_name: user.full_name,
              displayName,
              reason: !user.full_name ? 'missing' : user.full_name.length > 100 ? 'too long' : 'no spaces',
            }) */
          } else {
            displayName = user.full_name.trim()
          }

          const userInMap = getOrInitUser(normalizedMonitoredEmail, displayName)
          initHour(userInMap, hour)

          // Add issues to track issue count (includes both Yes and No issues)
          userMap[normalizedMonitoredEmail].hours[hour].issues.push(issue)
          if (issue.description && issue.description.toLowerCase() !== 'no issue') {
            userMap[normalizedMonitoredEmail].hours[hour].activeIssues.push(issue)
          }
        }
      })
    })

    // Calculate total portfolios per user

    // Calculate total portfolios per user
    Object.values(userMap).forEach((user) => {
      let total = 0
      Object.values(user.hours).forEach((hourData) => {
        total += hourData.completionsCount
      })
      user.totalPortfolios = total
    })

    // Filter by user search
    const filteredUsers = Object.values(userMap).filter((user) =>
      user.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.userName.toLowerCase().includes(userSearch.toLowerCase())
    )

    return filteredUsers.sort((a, b) => b.totalPortfolios - a.totalPortfolios)
  }, [filteredIssues, userSearch, fromDate, toDate, hourFilter, users, portfolios, adminLogs, usersLoading, currentUser])



  // Get cell color class
  const getCellColorClass = (count: number) => {
    if (count === 0) {
      return 'bg-white border border-gray-200 text-gray-400'
    }
    if (count >= 3) {
      return 'bg-green-600 text-white font-semibold'
    }
    if (count >= 1) {
      return 'bg-green-300 text-green-900 font-semibold'
    }
    return 'bg-white border border-gray-200 text-gray-400'
  }

  // Get cell info for tooltip
  const getCellInfo = (userId: string, hour: number) => {
    const user = matrixData.find((u) => u.userName === userId)
    if (!user) return null

    const hourData = user.hours[hour]
    if (!hourData || hourData.completionsCount === 0) return null

    return {
      userName: user.displayName,
      hour,
      totalCount: hourData.issues.length,
      portfolios: hourData.portfolios,
      portfolioCount: hourData.completionsCount,
    }
  }

  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLTableCellElement>,
    userId: string,
    hour: number
  ) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredCell({
      userId,
      hour,
      position: {
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width / 2,
      },
    })
  }

  const handleCellMouseLeave = () => {
    // Increase delay to 500ms to give more time to move to the tooltip
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCell(null)
    }, 500)
  }

  // Add handlers for the tooltip itself to keep it open when hovered
  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  const handleTooltipMouseLeave = () => {
    // Do NOT set to null immediately - use the same timeout logic
    // This prevents the tooltip from flickering or closing if the user
    // accidentally moves the mouse off it for a split second while scrolling.
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCell(null)
    }, 500)
  }

  const handleQuickRange = (range: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date()
    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    if (range === 'today') {
      setFromDate(formatDate(today))
      setToDate(formatDate(today))
    } else if (range === 'yesterday') {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      setFromDate(formatDate(yesterday))
      setToDate(formatDate(yesterday))
    } else if (range === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      setFromDate(formatDate(weekAgo))
      setToDate(formatDate(today))
    } else if (range === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setMonth(today.getMonth() - 1)
      setFromDate(formatDate(monthAgo))
      setToDate(formatDate(today))
    }
  }

  const handleResetFilters = () => {
    setUserSearch('')
    setHourFilter('all')
    setIssueFilter('all')
    const today = new Date()
    setFromDate(today.toISOString().split('T')[0])
    setToDate(today.toISOString().split('T')[0])
  }

  const handleExportMatrix = () => {
    const csvRows = [
      ['User / Hour', ...Array.from({ length: 24 }, (_, i) => `${i}:00`), 'Total'],
      ...matrixData.map((user) => {
        const row = [`${user.displayName} (${user.totalPortfolios} portfolios summary)`]
        let total = 0
        for (let hour = 0; hour < 24; hour++) {
          const count = user.hours[hour]?.completionsCount || 0
          row.push(count.toString())
          total += count
        }
        row.push(total.toString())
        return row
      }),
      [
        'Hour Totals',
        ...Array.from({ length: 24 }, (_, hour) => {
          const count = matrixData.reduce(
            (sum, user) => sum + (user.hours[hour]?.completionsCount || 0),
            0
          )
          return count.toString()
        }),
        matrixData.reduce((sum, user) => {
          return sum + Object.values(user.hours).reduce((s, h) => s + h.completionsCount, 0)
        }, 0).toString(),
      ],
    ]

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coverage_matrix_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Coverage matrix exported successfully')
  }

  const handleExportChartData = () => {
    const csvRows = [
      ['User', 'Total Portfolios Monitored'],
      ...userCoverageData.map((u) => [u.userName, u.totalPortfolios.toString()]),
    ]

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `user_coverage_performance_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Chart data exported successfully')
  }

  // Calculate user coverage for chart - Show ALL users
  const userCoverageData = useMemo(() => {
    return matrixData
      .map((user) => {
        // Collect all unique portfolios from all hours for this user
        const allPortfolios: string[] = []
        Object.values(user.hours).forEach((h: any) => {
          if (h.portfolios) {
            allPortfolios.push(...h.portfolios)
          }
        })

        return {
          userName: user.displayName,
          totalPortfolios: user.totalPortfolios,
          userData: user,
          portfolios: allPortfolios
        }
      })
      .sort((a, b) => b.totalPortfolios - a.totalPortfolios)
  }, [matrixData])

  // Handle chart bar click


  const chartData = {
    labels: userCoverageData.map((u) => u.userName),
    datasets: [
      {
        label: 'Total Portfolios Monitored',
        data: userCoverageData.map((u) => u.totalPortfolios),
        backgroundColor: userCoverageData.map((_, idx) =>
          idx < 7 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.5)'
        ),
        borderColor: userCoverageData.map((_, idx) =>
          idx < 7 ? 'rgba(34, 197, 94, 1)' : 'rgba(34, 197, 94, 0.7)'
        ),
        borderWidth: 1,
        barThickness: 30,
        maxBarThickness: 40,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: any, elements: any[]) => {
      // Use elements directly from the event
      if (elements && elements.length > 0) {
        const clickedElement = elements[0]
        const dataIndex = clickedElement.index
        const clickedUser = userCoverageData[dataIndex]
        if (clickedUser && clickedUser.userData) {
          setSelectedUser(clickedUser.userData)
        }
      }
    },
    onHover: (event: any, elements: any[]) => {
      // Change cursor to pointer when hovering over bars
      if (elements && elements.length > 0) {
        event.native.target.style.cursor = 'pointer'
      } else {
        event.native.target.style.cursor = 'default'
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const user = userCoverageData[context.dataIndex]
            const baseLabel = `${user.userName}: ${user.totalPortfolios} portfolios`
            if (user.portfolios && user.portfolios.length > 0) {
              // Show individual portfolios instead of aggregating with (xN)
              const portfolioList = user.portfolios.map((name: string) => ` • ${name} `)
              return [baseLabel, ...portfolioList]
            }
            return baseLabel
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false,
        },
        ticks: {
          stepSize: 1,
        },
        title: {
          display: true,
          text: 'Total Portfolios',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#1f2937',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  }

  const cellInfo = hoveredCell ? getCellInfo(hoveredCell.userId, hoveredCell.hour) : null

  // Calculate totals for summary
  const totalCoverage = useMemo(() => {
    let totalCompletions = 0
    matrixData.forEach((user) => {
      Object.values(user.hours).forEach((hourData) => {
        totalCompletions += hourData.completionsCount
      })
    })
    return {
      portfolios: totalCompletions,
      users: matrixData.length,
      hours: 24,
    }
  }, [matrixData])

  // Get user performance details
  const getUserPerformanceDetails = (user: UserMatrixData) => {
    let totalCompletionsCount = 0
    const portfolioNames: string[] = [] // Tracking names is disabled for simplicity in cumulative mode
    const allIssues = new Set<string>()
    const activeIssues: Issue[] = []
    const missedAlerts: Issue[] = []
    const hourlyBreakdown: { hour: number; portfolios: number; issues: number; activeIssues: number }[] = []

    Object.entries(user.hours).forEach(([hourStr, hourData]) => {
      const hour = parseInt(hourStr)
      // Cumulative completions count instead of unique portfolios
      totalCompletionsCount += hourData.completionsCount
      hourData.issues.forEach((issue) => allIssues.add(issue.id))
      activeIssues.push(...hourData.activeIssues)
      hourData.issues.forEach((issue) => {
        if (issue.missed_by && issue.missed_by.length > 0) {
          missedAlerts.push(issue)
        }
      })

      // Collect portfolio names - we keep them all individually
      portfolioNames.push(...hourData.portfolios)

      hourlyBreakdown.push({
        hour,
        portfolios: hourData.completionsCount,
        issues: hourData.issues.length,
        activeIssues: hourData.activeIssues.length,
      })
    })

    hourlyBreakdown.sort((a, b) => a.hour - b.hour)
    const healthySites = allIssues.size - activeIssues.length

    // NO DEDUPLICATION here - user wants to see every instance individually
    const formattedPortfolioNames = [...portfolioNames]

    return {
      totalCount: allIssues.size,
      activeIssues: activeIssues.length,
      healthySites,
      missedAlerts: missedAlerts.length,
      totalPortfoliosMonitored: totalCompletionsCount,
      monitoringActiveHours: Object.keys(user.hours).length,
      portfolios: formattedPortfolioNames,
      hourlyBreakdown,
    }
  }

  return (
    <div className="space-y-6">
      {/* Date Filters Section */}
      <div>
        {/* Green Banner */}
        <div className="text-white py-4 px-6 rounded-t-lg shadow-md" style={{ backgroundColor: '#76ab3f' }}>
          <h2 className="text-3xl font-bold mb-1">Portfolio Coverage Matrix</h2>
          <p className="text-green-100 text-sm">Track how many portfolios each user covered in each hour. Hover over cells to see portfolio details and issues with "Yes".</p>
        </div>

        {/* Filter Card */}
        <Card className="rounded-t-none">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Type user name..."
                  className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={hourFilter}
                  onChange={(e) => setHourFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Hours</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i.toString()}>
                      {i}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={issueFilter}
                  onChange={(e) => setIssueFilter(e.target.value as 'all' | 'active')}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Issues (Coverage)</option>
                  <option value="active">Active Issues Only</option>
                </select>
              </div>

              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <span className="text-sm font-medium text-gray-700">Quick Range:</span>
              <button
                onClick={() => handleQuickRange('today')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${fromDate === toDate && fromDate === new Date().toISOString().split('T')[0]
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } `}
                style={fromDate === toDate && fromDate === new Date().toISOString().split('T')[0] ? { backgroundColor: '#76ab3f' } : {}}
              >
                Today
              </button>
              <button
                onClick={() => handleQuickRange('yesterday')}
                className="px-3 py-1.5 text-sm rounded-md transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Yesterday
              </button>
              <button
                onClick={() => handleQuickRange('week')}
                className="px-3 py-1.5 text-sm rounded-md transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Week
              </button>
              <button
                onClick={() => handleQuickRange('month')}
                className="px-3 py-1.5 text-sm rounded-md transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Month
              </button>
              <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                Reset All Filters
              </Button>
            </div>
          </div>
        </Card>
      </div>


      {/* Control Row */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCharts(!showCharts)}
          className="bg-white border hover:bg-gray-50 text-gray-700"
        >
          {showCharts ? 'Hide Charts' : 'Show Charts'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => toast.success('Exporting Matrix Data...')}
          className="hover:opacity-90 text-white border-none"
          style={{ backgroundColor: '#76ab3f' }}
        >
          Export Matrix
        </Button>
      </div>

      {/* User Coverage Performance Section - Below Filters */}
      {showCharts && (
        <div>
          {/* Green Banner */}
          <div className="text-white py-4 px-6 rounded-t-lg shadow-md" style={{ backgroundColor: '#76ab3f' }}>
            <h2 className="text-3xl font-bold mb-1">User Coverage Performance</h2>
          </div>

          {/* Chart Card */}
          <Card className="rounded-t-none">
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-md">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search user by name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportChartData}
                style={{ backgroundColor: '#76ab3f' }}
                disabled={userCoverageData.length === 0}
              >
                Export Chart Data
              </Button>
            </div>

            {userCoverageData.length > 0 ? (
              <>
                <div style={{ height: '250px', position: 'relative', cursor: 'pointer' }}>
                  <Bar data={chartData} options={chartOptions} />
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Click on any bar to view detailed performance metrics
                </p>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span className="text-gray-600">Top 7 Performers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                    <span className="text-gray-600">Other Users</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-2 font-medium">No data available for chart</div>
                <div className="text-sm text-gray-400 mt-2">
                  <p className="mb-1">The chart requires:</p>
                  <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                    <li>Issues logged within the selected date range ({fromDate} to {toDate})</li>
                    <li>Issues with "Monitored By" field populated</li>
                    <li>At least one user who has monitored portfolios</li>
                  </ul>
                  <p className="mt-3 text-xs">
                    Try adjusting your date range or check if issues have the "Monitored By" field filled in.
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Total issues: {allIssues.length} | Filtered issues: {filteredIssues.length}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Coverage Matrix Table - Below User Coverage Performance Chart */}
      <div>
        {/* Green Banner */}
        <div className="text-white py-4 px-6 rounded-t-lg shadow-md" style={{ backgroundColor: '#76ab3f' }}>
          <h2 className="text-3xl font-bold mb-1">Coverage Overview</h2>
        </div>

        <Card className="rounded-t-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mt-1">
                {totalCoverage.portfolios} portfolio coverage(s) across {totalCoverage.users} user(s) • {totalCoverage.hours} hours
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span className="text-gray-600">High coverage</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-300 rounded"></div>
                  <span className="text-gray-600">Medium coverage</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
                  <span className="text-gray-600">No coverage</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                    User / Hour
                  </th>
                  {Array.from({ length: 24 }, (_, i) => (
                    <th
                      key={i}
                      className={`px-2 py-2 text-center text-xs font-semibold uppercase min-w-[60px] cursor-pointer hover:bg-green-50 transition-colors ${hourFilter === i.toString() ? 'bg-green-100 text-green-800 border-b-2 border-green-600' : 'text-gray-700'} `}
                      onClick={() => setHourFilter(hourFilter === i.toString() ? 'all' : i.toString())}
                      title={`Click to filter page by ${i}:00`}
                    >
                      {i}:00
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-100 border-l border-gray-200">
                    Total Portfolios
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matrixData.length === 0 ? (
                  <tr>
                    <td colSpan={26} className="px-4 py-8 text-center">
                      <div className="space-y-2">
                        <p className="text-gray-500 font-medium">No data available</p>
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>Possible reasons:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-left max-w-md mx-auto">
                            <li>No issues found in the selected date range ({fromDate} to {toDate})</li>
                            <li>Issues don't have "Monitored By" field populated</li>
                            <li>User emails in "Monitored By" don't match any users in the system</li>
                            <li>Try adjusting the date range or checking the browser console for details</li>
                          </ul>
                          <p className="mt-2 text-gray-500">
                            Total issues: {allIssues.length} | Filtered issues: {filteredIssues.length}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {matrixData.map((row) => {
                      return (
                        <tr key={row.userName} className="hover:bg-gray-50">
                          <td
                            className="px-4 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 cursor-pointer hover:text-blue-600"
                            onClick={() => setSelectedUser(row)}
                          >
                            {row.displayName} ({row.totalPortfolios} portfolios summary)
                          </td>
                          {Array.from({ length: 24 }, (_, hour) => {
                            const count = row.hours[hour]?.completionsCount || 0
                            return (
                              <td
                                key={hour}
                                className={`px-2 py-2 text-center text-xs font-semibold cursor-pointer transition-colors ${getCellColorClass(
                                  count
                                )} `}
                                onMouseEnter={(e) => handleCellMouseEnter(e, row.userName, hour)}
                                onMouseLeave={handleCellMouseLeave}
                              >
                                {count > 0 ? count : ''}
                              </td>
                            )
                          })}
                          <td className="px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100 border-l border-gray-200">
                            {row.totalPortfolios}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Hour Totals Row */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-4 py-2 text-sm text-gray-900 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                        Hour Totals
                      </td>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const count = matrixData.reduce(
                          (sum, user) => sum + (user.hours[hour]?.completionsCount || 0),
                          0
                        )
                        return (
                          <td key={hour} className="px-2 py-2 text-center text-xs text-gray-900">
                            {count > 0 ? count : ''}
                          </td>
                        )
                      })}
                      <td className="px-4 py-2 text-center text-sm text-gray-900 bg-gray-200 border-l border-gray-200">
                        {matrixData.reduce((sum, user) => sum + user.totalPortfolios, 0)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Hover Tooltip */}
      {
        hoveredCell && cellInfo && (
          <div
            className="fixed z-[9999] w-80 bg-blue-900 text-white text-xs rounded-lg shadow-xl p-4 pointer-events-auto"
            style={{
              top: `${hoveredCell.position.top}px`,
              left: `${hoveredCell.position.left}px`,
              transform: 'translate(-50%, -100%)',
              marginTop: '-10px',
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="font-bold text-sm mb-2 pb-2 border-b border-blue-700">
              {cellInfo.userName} - Hour {cellInfo.hour}:00
            </div>
            <div className="mb-2">
              <div className="font-bold text-blue-300">
                Issues Entered (This Hour): {cellInfo.totalCount}
              </div>
            </div>
            <div>
              <div className="font-bold text-green-300 mb-1">
                Total Portfolios Monitored ({cellInfo.portfolioCount}):
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 select-auto custom-scrollbar">
                {cellInfo.portfolios.length > 0 ? (
                  cellInfo.portfolios.map((portfolio, idx) => (
                    <div key={idx} className="text-white pl-2 py-1 text-sm font-bold transition-all hover:bg-white/5 rounded">
                      <span className="text-green-400 mr-2 font-black">•</span>
                      {portfolio}
                    </div>
                  ))
                ) : (
                  <div className="text-blue-200 italic pl-2 text-xs">No portfolio details available</div>
                )}
              </div>
            </div>
            <div
              className="absolute left-1/2 transform -translate-x-1/2 top-full border-4 border-transparent border-t-blue-900"
              style={{ marginTop: '-1px' }}
            ></div>
          </div>
        )
      }

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowCharts(!showCharts)}>
          {showCharts ? 'Hide Charts' : 'Show Charts'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShowDebug(true)}>
          Debug Info
        </Button>
        <Button variant="primary" size="sm" onClick={handleExportMatrix} style={{ backgroundColor: '#76ab3f' }}>
          Export Matrix
        </Button>
      </div>

      {
        showDebug && (
          <Modal
            isOpen={showDebug}
            onClose={() => setShowDebug(false)}
            title="Analysis Logs (Debug Info)"
          >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-4 text-xs">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded border border-blue-100">
                  <div className="text-blue-600 font-bold">Total Logs</div>
                  <div className="text-xl font-black">{adminLogs.length}</div>
                </div>
                <div className="p-2 bg-green-50 rounded border border-green-100">
                  <div className="text-green-600 font-bold">Completions</div>
                  <div className="text-xl font-black">{adminLogs.filter((l: any) => l.action_type === 'PORTFOLIO_CHECKED').length}</div>
                </div>
                <div className="p-2 bg-purple-50 rounded border border-purple-100">
                  <div className="text-purple-600 font-bold">Locks</div>
                  <div className="text-xl font-black">{adminLogs.filter((l: any) => l.action_type === 'PORTFOLIO_LOCKED').length}</div>
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded border text-[10px] font-mono whitespace-pre">
                {`HOUR FILTER: ${hourFilter} \nDATE RANGE: ${fromDate} to ${toDate} \n`}
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-1">Time</th>
                    <th className="p-1">User</th>
                    <th className="p-1">Action</th>
                    <th className="p-1">Hr</th>
                    <th className="p-1">Portfolio</th>
                  </tr>
                </thead>
                <tbody>
                  {adminLogs.slice(0, 30).map((log: any, i: number) => {
                    let m = log.metadata;
                    if (typeof m === 'string') try { m = JSON.parse(m) } catch (e) { }
                    return (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="p-1 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                        <td className="p-1 truncate max-w-[80px]">{log.admin_name?.split('@')[0]}</td>
                        <td className="p-1">{log.action_type === 'PORTFOLIO_CHECKED' ? 'CHECK' : 'LOCK'}</td>
                        <td className="p-1 font-bold text-blue-600">{m?.hour}</td>
                        <td className="p-1 truncate max-w-[100px]">{m?.portfolio_name || log.related_portfolio_id?.substring(0, 8)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Modal>
        )
      }

      {/* User Performance Details Modal */}
      {
        selectedUser && (
          <UserPerformanceModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            getUserPerformanceDetails={getUserPerformanceDetails}
            hourFilter={hourFilter}
            rank={userCoverageData.findIndex(u => u.userName === selectedUser.userName) + 1}
          />
        )
      }
    </div >
  )
}

interface UserPerformanceModalProps {
  user: UserMatrixData
  onClose: () => void
  getUserPerformanceDetails: (user: UserMatrixData) => {
    totalCount: number
    activeIssues: number
    healthySites: number
    missedAlerts: number
    totalPortfoliosMonitored: number
    monitoringActiveHours: number
    portfolios: string[]
    hourlyBreakdown: { hour: number; portfolios: number; issues: number; activeIssues: number }[]
  }
  hourFilter: string
  rank?: number
}

const UserPerformanceModal: React.FC<UserPerformanceModalProps> = ({
  user,
  onClose,
  getUserPerformanceDetails,
  hourFilter,
  rank,
}) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const details = getUserPerformanceDetails(user)

  // Get data for selected hour or all hours
  const getHourData = (hour: number | null) => {
    if (hour === null) {
      return details
    }
    const hourData = user.hours[hour]
    if (!hourData) {
      return {
        totalCount: 0,
        activeIssues: 0,
        healthySites: 0,
        missedAlerts: 0,
        totalPortfoliosMonitored: 0,
        monitoringActiveHours: 0,
        portfolios: [],
        hourlyBreakdown: []
      }
    }

    const allIssues = new Set<string>()
    const activeIssues: Issue[] = []
    const missedAlerts: Issue[] = []

    hourData.issues.forEach((issue) => {
      allIssues.add(issue.id)
      if (issue.description && issue.description.toLowerCase() !== 'no issue') {
        activeIssues.push(issue)
      }
      if (issue.missed_by && issue.missed_by.length > 0) {
        missedAlerts.push(issue)
      }
    })

    const healthySites = allIssues.size - activeIssues.length

    return {
      totalCount: allIssues.size,
      activeIssues: activeIssues.length,
      healthySites,
      missedAlerts: missedAlerts.length,
      totalPortfoliosMonitored: hourData.completionsCount,
      monitoringActiveHours: 1,
      portfolios: hourData.portfolios,
      hourlyBreakdown: [{
        hour,
        portfolios: hourData.completionsCount,
        issues: hourData.issues.length,
        activeIssues: hourData.activeIssues.length,
      }]
    }
  }

  const displayData = getHourData(selectedHour)

  // Get unique portfolio names (remove duplicates)
  const uniquePortfolios = Array.from(new Set(displayData.portfolios))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Green Header */}
          <div className="text-white px-6 py-4 rounded-t-lg flex items-center justify-between" style={{ backgroundColor: '#76ab3f' }}>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">User Performance Details</h3>
              <p className="text-white text-sm mt-0.5 font-medium opacity-90">{user.displayName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 bg-white max-h-[80vh] overflow-y-auto">
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-blue-600 mb-1">Total Count</div>
                  <div className="text-2xl font-bold text-blue-600">{displayData.totalCount}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-red-600 mb-1">Active Issues</div>
                  <div className="text-2xl font-bold text-red-600">{displayData.activeIssues}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-green-600 mb-1">Healthy Sites</div>
                  <div className="text-2xl font-bold text-green-600">{displayData.healthySites}</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-orange-600 mb-1">Missed Alerts</div>
                  <div className="text-2xl font-bold text-orange-600">{displayData.missedAlerts}</div>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-purple-600 mb-1">Total Portfolios Monitored</div>
                  <div className="text-2xl font-bold text-purple-600">{displayData.totalPortfoliosMonitored}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-blue-600 mb-1">Monitoring Active Hours</div>
                  <div className="text-2xl font-bold text-blue-600">{displayData.monitoringActiveHours}</div>
                </div>
              </div>

              {/* Total Portfolios Monitored Section */}
              {uniquePortfolios.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-bold text-gray-700 text-sm mb-2">
                    Total Portfolios Monitored ({uniquePortfolios.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {uniquePortfolios.map((portfolio, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-semibold rounded-md border border-green-200"
                      >
                        {portfolio.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly Breakdown Chart */}
              <div className="mt-4">
                <h5 className="font-bold text-gray-700 text-sm mb-2">Hourly Breakdown</h5>
                <div style={{ height: '200px' }}>
                  <Bar
                    data={{
                      labels: Array.from({ length: 24 }, (_, i) => i.toString()),
                      datasets: [
                        {
                          label: 'Portfolios',
                          data: Array.from({ length: 24 }, (_, i) => user.hours[i]?.completionsCount || 0),
                          backgroundColor: '#76AB3F',
                          borderRadius: 2,
                        },
                        {
                          label: 'Issues',
                          data: Array.from({ length: 24 }, (_, i) => user.hours[i]?.issues.length || 0),
                          backgroundColor: '#3B82F6',
                          borderRadius: 2,
                        },
                        {
                          label: 'Active Issues',
                          data: Array.from({ length: 24 }, (_, i) => user.hours[i]?.activeIssues.length || 0),
                          backgroundColor: '#EF4444',
                          borderRadius: 2,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      onClick: (event: any, elements: any[]) => {
                        if (elements && elements.length > 0) {
                          const clickedHour = elements[0].index
                          setSelectedHour(clickedHour === selectedHour ? null : clickedHour)
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            boxWidth: 8,
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                            font: { size: 10 }
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          titleColor: '#1f2937',
                          bodyColor: '#4b5563',
                          borderColor: '#e5e7eb',
                          borderWidth: 1,
                          padding: 8,
                          displayColors: true,
                          callbacks: {
                            afterBody: (context: any) => {
                              const dataIndex = context[0].dataIndex
                              const portfolios = user.hours[dataIndex]?.portfolios || []
                              if (portfolios.length > 0) {
                                return '\nChecked: ' + portfolios.map(p => p.split(' (')[0]).join(', ')
                              }
                              return ''
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: { color: '#f3f4f6' },
                          ticks: { stepSize: 1, font: { size: 10 } },
                          title: { display: true, text: 'Count', font: { size: 10 } }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { font: { size: 10 } },
                          title: { display: true, text: 'Hour', font: { size: 10 } }
                        }
                      }
                    }}
                  />
                </div>
                {selectedHour !== null && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Showing data for hour {selectedHour}:00. Click again to view all hours.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-sm"
                  style={{ backgroundColor: '#76ab3f' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoverageMatrix


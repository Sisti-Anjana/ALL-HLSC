import React, { useState, useMemo, useEffect } from 'react'
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
    // Default to today
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [showCharts, setShowCharts] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserMatrixData | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{
    userId: string
    hour: number
    position: { top: number; left: number }
  } | null>(null)

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
    if (users.length > 0) {
      console.log('👥 Coverage Matrix - Users loaded:', users.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        emailLower: u.email?.toLowerCase(),
      })))
    } else {
      console.warn('⚠️ Coverage Matrix - Users array is empty!', { usersLoading, usersCount: users.length })
    }
  }, [users, usersLoading])

  // Create mapping from user ID to user info (email, full_name)
  const userIdToUser = useMemo(() => {
    const map: { [key: string]: { email: string; full_name: string } } = {}
    users.forEach((user) => {
      map[user.id] = {
        email: user.email,
        full_name: user.full_name || user.email.split('@')[0]
      }
    })
    return map
  }, [users])

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
      console.log('⏳ Coverage Matrix - Waiting for users to load...', { usersLoading, usersCount: users.length })
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
      if (log.action_type !== 'PORTFOLIO_CHECKED' && log.action_type !== 'PORTFOLIO_LOCKED') return false

      const logDate = new Date(log.created_at).toISOString().split('T')[0]
      if (normalizedFromDate && logDate < normalizedFromDate) return false
      if (normalizedToDate && logDate > normalizedToDate) return false
      return true
    })

    portfolioActivityLogs.forEach(log => {
      const monitoredBy = log.admin_name || 'Unknown'
      const portfolioId = log.related_portfolio_id
      const logDate = new Date(log.created_at).toISOString().split('T')[0]
      const logHour = log.metadata?.hour ?? new Date(log.created_at).getHours()

      if (!portfolioId) return

      // Find user for display name
      const userStr = String(monitoredBy).toLowerCase()
      const foundUser = users.find(u => u.email?.toLowerCase() === userStr)
      let displayName = monitoredBy.split('@')[0]
      if (foundUser?.full_name) displayName = foundUser.full_name

      const user = getOrInitUser(userStr, displayName)
      const hourData = initHour(user, logHour)

      // Increment completionsCount for every log entry (cumulative)
      hourData.completionsCount++
      user.totalPortfolios++

      // Add portfolio details if available
      const portfolio = portfolios.find(p => p.id === portfolioId)
      if (portfolio) {
        const siteRange = portfolio.site_range ? ` (${portfolio.site_range})` : ''
        const portfolioDetail = `${portfolio.name}${siteRange}`
        hourData.portfolios.push(portfolioDetail)
      }

      const key = `${portfolioId}_${logDate}_${logHour}_${monitoredBy.toLowerCase()}`
      completionKeys.add(key)
    })

    // 2. FALLBACK: Process portfolios table for snapshot data
    const completedPortfolios = portfolios.filter(p => p.all_sites_checked === 'Yes' && p.all_sites_checked_date && p.all_sites_checked_by)

    // First, process portfolios with "All Sites Checked = Yes" to count completions
    // Count each distinct issue entry session (by hour) as a separate completion
    // This allows the same portfolio to be counted multiple times if completed multiple times
    console.log('🔍 Coverage Matrix - Starting processing:', {
      totalPortfolios: portfolios.length,
      completedPortfolios: completedPortfolios.length,
      dateRange: { fromDate, toDate, normalizedFromDate, normalizedToDate },
      totalIssues: filteredIssues.length,
      usersCount: users.length,
      usersLoading,
    })

    console.log('🔍 Coverage Matrix - All completed portfolios:', completedPortfolios.map(p => ({
      id: p.id,
      name: p.name,
      checkedBy: p.all_sites_checked_by,
      checkedByType: typeof p.all_sites_checked_by,
      checkedDate: p.all_sites_checked_date,
      checkedHour: p.all_sites_checked_hour,
    })))
    console.log('🔍 Coverage Matrix - Available users:', users.map(u => ({
      id: u.id,
      idType: typeof u.id,
      email: u.email,
      full_name: u.full_name
    })))
    console.log('🔍 Coverage Matrix - Date range:', { fromDate, toDate, normalizedFromDate, normalizedToDate })

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
        console.log('⏭️ Coverage Matrix - Skipping portfolio (before date range):', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          checkedDate: normalizedCheckedDate,
          fromDate: normalizedFromDate,
        })
        return // Skip - before date range
      }
      if (normalizedToDate && normalizedCheckedDate > normalizedToDate) {
        console.log('⏭️ Coverage Matrix - Skipping portfolio (after date range):', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          checkedDate: normalizedCheckedDate,
          toDate: normalizedToDate,
        })
        return // Skip - after date range
      }

      // Get the user who completed it (all_sites_checked_by is a user ID/UUID from JWT token)
      // Try ID match first - this should work if the user exists
      const checkedByValue = portfolio.all_sites_checked_by
      const checkedByValueStr = String(checkedByValue)

      let checkedByUser = users.find((u) => {
        const userIdStr = String(u.id)
        const matches = userIdStr === checkedByValueStr || u.id === checkedByValue
        if (matches) {
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
        }
        return matches
      })

      // If ID match fails, try email match (fallback for data inconsistencies)
      if (!checkedByUser) {
        console.warn('⚠️ Coverage Matrix - User ID not found, trying email match:', {
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
        })
        checkedByUser = users.find((u) =>
          u.email && u.email.toLowerCase() === checkedByValueStr.toLowerCase()
        )
        if (checkedByUser) {
          console.log('✅ Coverage Matrix - Found user by email match:', {
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            checkedByValue: checkedByValue,
            matchedUserEmail: checkedByUser.email,
            matchedUserName: checkedByUser.full_name,
          })
        }
      }

      if (!checkedByUser) {
        // If not found in user list, check if it's the current user (e.g. Super Admin)
        if (currentUser && currentUser.userId === checkedByValueStr) {
          checkedByUser = {
            id: currentUser.userId,
            email: currentUser.email,
            full_name: currentUser.email.split('@')[0], // Fallback name
          } as any
          console.log('✅ Coverage Matrix - Matched current user (Super Admin):', {
            portfolioId: portfolio.id,
            userEmail: checkedByUser?.email || currentUser?.email
          })
        }
      }

      if (!checkedByUser) {
        // User not found - skip this portfolio (don't count it)
        // This ensures only valid, active users are shown in the matrix
        console.warn('⚠️ Coverage Matrix - User not found for portfolio completion, skipping:', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          checkedByValue: portfolio.all_sites_checked_by,
          checkedByType: typeof portfolio.all_sites_checked_by,
          availableUserIds: users.map(u => ({ id: u.id, email: u.email, full_name: u.full_name })),
          totalUsers: users.length,
        })
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
        console.warn('⚠️ Coverage Matrix - Using email prefix as display name:', {
          portfolioId: portfolio.id,
          userEmail,
          full_name: (checkedByUser as any).full_name,
          displayName,
          reason: !(checkedByUser as any).full_name ? 'missing' : (checkedByUser as any).full_name.length > 100 ? 'too long' : 'no spaces',
        })
      } else {
        displayName = (checkedByUser as any).full_name.trim()
      }

      const completionHour = portfolio.all_sites_checked_hour ?? 0

      console.log('Coverage Matrix Debug - Processing completed portfolio:', {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        checkedBy: userEmail,
        checkedDate: normalizedCheckedDate,
        completionHour,
      })

      const portfolioId = portfolio.id || (portfolio as any).portfolio_id
      const key = `${portfolioId}_${normalizedCheckedDate}_${completionHour}_${userEmail.toLowerCase()}`

      // Use already counted check if available
      if (completionKeys.has(key)) return

      const user = getOrInitUser(userEmail.toLowerCase(), displayName)
      const hourData = initHour(user, completionHour)

      hourData.completionsCount++
      user.totalPortfolios++

      // Add portfolio details
      const siteRange = portfolio.site_range ? ` (${portfolio.site_range})` : ''
      const portfolioDetail = `${portfolio.name}${siteRange}`
      hourData.portfolios.push(portfolioDetail)

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
          // User not found by email - skip this issue (don't count it)
          // This ensures only valid, active users are shown in the matrix
          console.warn(`⚠️ Coverage Matrix - User not found for email, skipping issue: "${monitoredByEmail}"`, {
            searchingFor: monitoredByEmail,
            searchingForNormalized: normalizedMonitoredEmail,
            availableUsers: users.map(u => ({ email: u.email, full_name: u.full_name })),
            issueDetails: {
              issueId: issue.id,
              portfolioId: issue.portfolio_id,
              monitoredBy: issue.monitored_by,
              hour: issue.issue_hour,
            },
          })
          return // Skip this issue - don't count it
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
            console.warn('⚠️ Coverage Matrix - Using email prefix as display name for issue:', {
              issueId: issue.id,
              userEmail,
              full_name: user.full_name,
              displayName,
              reason: !user.full_name ? 'missing' : user.full_name.length > 100 ? 'too long' : 'no spaces',
            })
          } else {
            displayName = user.full_name.trim()
          }

          const userInMap = getOrInitUser(normalizedMonitoredEmail, displayName)
          initHour(userInMap, hour)

          // Add issues to track issue count (includes both Yes and No issues)
          // DO NOT count portfolios here - portfolios are only counted from "All Sites Checked = Yes" completions above
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

    // Detailed breakdown of what's in the userMap for debugging
    const userMapDetails = Object.entries(userMap).map(([email, userData]) => {
      const hourDetails: { [hour: string]: { portfolioKeys: string[], portfolioCount: number } } = {}
      Object.entries(userData.hours).forEach(([hour, hourData]) => {
        hourDetails[hour] = {
          portfolioKeys: [], // No longer tracking unique keys here
          portfolioCount: hourData.completionsCount,
        }
      })
      return {
        email,
        displayName: userData.displayName,
        totalPortfolios: userData.totalPortfolios,
        hours: hourDetails,
      }
    })

    // Final summary log
    console.log('📊 Coverage Matrix - FINAL RESULTS:', {
      totalUsers: filteredUsers.length,
      usersWithData: filteredUsers.map(u => ({
        name: u.displayName,
        portfolios: u.totalPortfolios,
        email: u.email,
        hoursWithData: Object.keys(u.hours).map(h => ({
          hour: parseInt(h),
          portfolioCount: u.hours[parseInt(h)].completionsCount,
        })),
      })),
      userMapDetails, // Detailed breakdown of what portfolios are counted for each user
      allUsersInMap: Object.keys(userMap).map(email => ({
        email,
        displayName: userMap[email].displayName,
        totalPortfolios: userMap[email].totalPortfolios,
        hours: Object.keys(userMap[email].hours).map(h => ({
          hour: h,
          portfolioCount: userMap[email].hours[parseInt(h)].completionsCount,
          portfolioKeys: [],
        })),
      })),
      summary: {
        totalCompletedPortfolios: completedPortfolios.length,
        portfoliosInDateRange: completedPortfolios.filter(p => {
          const checkedDate = p.all_sites_checked_date?.split('T')[0]
          if (!checkedDate) return false
          if (normalizedFromDate && checkedDate < normalizedFromDate) return false
          if (normalizedToDate && checkedDate > normalizedToDate) return false
          return true
        }).length,
        portfoliosWithMatchingUsers: completedPortfolios.filter(p => {
          const checkedDate = p.all_sites_checked_date?.split('T')[0]
          if (!checkedDate) return false
          if (normalizedFromDate && checkedDate < normalizedFromDate) return false
          if (normalizedToDate && checkedDate > normalizedToDate) return false
          return users.some(u => u.id === p.all_sites_checked_by)
        }).length,
      },
    })

    return filteredUsers.sort((a, b) => b.totalPortfolios - a.totalPortfolios)
  }, [filteredIssues, userSearch, fromDate, toDate, hourFilter, users, portfolios, usersLoading])

  // Calculate max count for color coding
  const maxCount = useMemo(() => {
    let max = 0
    matrixData.forEach((user) => {
      Object.values(user.hours).forEach((hourData) => {
        max = Math.max(max, hourData.completionsCount)
      })
    })
    return max
  }, [matrixData])

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
    setHoveredCell(null)
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
      .map((user) => ({
        userName: user.displayName,
        totalPortfolios: user.totalPortfolios,
        userData: user,
      }))
      .sort((a, b) => b.totalPortfolios - a.totalPortfolios)
  }, [matrixData])

  // Handle chart bar click
  const handleChartClick = (event: any, elements: any[]) => {
    // If a bar was clicked
    if (elements && elements.length > 0) {
      const clickedElement = elements[0]
      const dataIndex = clickedElement.index
      const clickedUser = userCoverageData[dataIndex]
      if (clickedUser && clickedUser.userData) {
        setSelectedUser(clickedUser.userData)
      }
    }
  }

  const chartData = {
    labels: userCoverageData.map((u) => u.userName),
    datasets: [
      {
        label: 'Total Portfolios Monitored',
        data: userCoverageData.map((u) => u.totalPortfolios),
        backgroundColor: userCoverageData.map((_, idx) =>
          idx < 3 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.5)'
        ),
        borderColor: userCoverageData.map((_, idx) =>
          idx < 3 ? 'rgba(34, 197, 94, 1)' : 'rgba(34, 197, 94, 0.7)'
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
    onClick: handleChartClick,
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
            return `${user.userName}: ${user.totalPortfolios} portfolios`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 2,
          max: 8,
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

      // Collect portfolio names
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

    // Deduplicate portfolio names for the list display if needed, or keep for cumulative
    const uniquePortfolioNamesWithCounts = portfolioNames.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {} as { [key: string]: number })

    const formattedPortfolioNames = Object.entries(uniquePortfolioNamesWithCounts).map(
      ([name, count]) => (count > 1 ? `${name} (x${count})` : name)
    )

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
      {/* Date Filters Section - At Top (No Banner, Just Filters) */}
      <div>
        {/* Filter Card */}
        <Card>
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

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Quick Range:</span>
              <button
                onClick={() => handleQuickRange('today')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${fromDate === toDate && fromDate === new Date().toISOString().split('T')[0]
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
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

      {/* User Coverage Performance Section - Below Filters */}
      <div>
        {/* Green Banner */}
        <div className="bg-green-600 text-white py-6 px-6 rounded-t-lg shadow-md">
          <h2 className="text-3xl font-bold mb-1">User Coverage Performance</h2>
          <p className="text-green-100 text-sm">
            Top performers by portfolio coverage. Chart shows users who have monitored portfolios based on issues logged with "Monitored By" field.
          </p>
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
              <div style={{ height: '400px', position: 'relative', cursor: 'pointer' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Click on any bar to view detailed performance metrics
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-gray-600">Top 3 Performers</span>
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

      {/* Coverage Matrix Table - Below User Coverage Performance Chart */}
      <div>
        {/* Green Banner */}
        <div className="bg-green-600 text-white py-6 px-6 rounded-t-lg shadow-md">
          <h2 className="text-3xl font-bold mb-1">Coverage Overview</h2>
          <p className="text-green-100 text-sm">
            Track how many portfolios each user covered in each hour. Hover over cells to see portfolio details and issues with 'Yes'.
          </p>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                    User / Hour
                  </th>
                  {Array.from({ length: 24 }, (_, i) => (
                    <th
                      key={i}
                      className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase min-w-[60px]"
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
                            className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 cursor-pointer hover:text-blue-600"
                            onClick={() => setSelectedUser(row)}
                          >
                            {row.displayName} ({row.totalPortfolios} portfolios summary)
                          </td>
                          {Array.from({ length: 24 }, (_, hour) => {
                            const count = row.hours[hour]?.completionsCount || 0
                            return (
                              <td
                                key={hour}
                                className={`px-2 py-3 text-center text-xs font-semibold cursor-pointer transition-colors ${getCellColorClass(
                                  count
                                )}`}
                                onMouseEnter={(e) => handleCellMouseEnter(e, row.userName, hour)}
                                onMouseLeave={handleCellMouseLeave}
                              >
                                {count > 0 ? count : ''}
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 bg-gray-100 border-l border-gray-200">
                            {row.totalPortfolios}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Hour Totals Row */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-4 py-3 text-sm text-gray-900 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                        Hour Totals
                      </td>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const count = matrixData.reduce(
                          (sum, user) => sum + (user.hours[hour]?.completionsCount || 0),
                          0
                        )
                        return (
                          <td key={hour} className="px-2 py-3 text-center text-xs text-gray-900">
                            {count > 0 ? count : ''}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-center text-sm text-gray-900 bg-gray-200 border-l border-gray-200">
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
      {hoveredCell && cellInfo && (
        <div
          className="fixed z-[9999] w-80 bg-blue-900 text-white text-xs rounded-lg shadow-xl p-4 pointer-events-none"
          style={{
            top: `${hoveredCell.position.top}px`,
            left: `${hoveredCell.position.left}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-10px',
          }}
        >
          <div className="font-bold text-sm mb-2 pb-2 border-b border-blue-700">
            {cellInfo.userName} - Hour {cellInfo.hour}:00
          </div>
          <div className="mb-2">
            <div className="font-bold text-blue-300">
              Total Count (All Issues): {cellInfo.totalCount}
            </div>
          </div>
          <div>
            <div className="font-bold text-green-300 mb-1">
              Total Portfolios Monitored ({cellInfo.portfolioCount}):
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 select-none custom-scrollbar">
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
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowCharts(!showCharts)}>
          {showCharts ? 'Hide Charts' : 'Show Charts'}
        </Button>
        <Button variant="primary" size="sm" onClick={handleExportMatrix} style={{ backgroundColor: '#76ab3f' }}>
          Export Matrix
        </Button>
      </div>

      {/* User Performance Details Modal */}
      {selectedUser && (
        <UserPerformanceModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          getUserPerformanceDetails={getUserPerformanceDetails}
        />
      )}
    </div>
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
}

const UserPerformanceModal: React.FC<UserPerformanceModalProps> = ({
  user,
  onClose,
  getUserPerformanceDetails,
}) => {
  const details = getUserPerformanceDetails(user)

  const hourlyChartData = {
    labels: details.hourlyBreakdown.map((h) => h.hour.toString()),
    datasets: [
      {
        label: 'Portfolios',
        data: details.hourlyBreakdown.map((h) => h.portfolios),
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        barThickness: 25,
        maxBarThickness: 30,
      },
      {
        label: 'Issues',
        data: details.hourlyBreakdown.map((h) => h.issues),
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        barThickness: 25,
        maxBarThickness: 30,
      },
      {
        label: 'Active Issues',
        data: details.hourlyBreakdown.map((h) => h.activeIssues),
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        barThickness: 25,
        maxBarThickness: 30,
      },
    ],
  }

  const hourlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    datasets: {
      bar: {
        categoryPercentage: 0.6, // Controls the width of the category (group of bars) - smaller = more gap
        barPercentage: 0.8, // Controls the width of individual bars within the category - smaller = more gap between bars
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          padding: 15,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
          weight: 'normal' as const,
        },
        padding: 12,
        displayColors: true,
        callbacks: {
          title: () => {
            return ''
          },
          label: (context: any) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y || 0
            return `${label} : ${value}`
          },
          beforeBody: (tooltipItems: any[]) => {
            // Calculate total count (sum of all values for this hour)
            const totalCount = tooltipItems.reduce((sum: number, item: any) => sum + (item.parsed.y || 0), 0)
            return [totalCount.toString()]
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 11,
            weight: 'bold' as const,
          },
        },
        title: {
          display: true,
          text: 'Count',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: {
            size: 11,
            weight: 'bold' as const,
          },
        },
        title: {
          display: true,
          text: 'Hour',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle max-w-4xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Green Header */}
          <div className="bg-green-600 text-white px-6 py-5 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">User Performance Details</h3>
                <p className="text-white text-base mt-1.5 font-medium">{user.displayName}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-8 py-7 bg-white">
            <div className="space-y-6">
              {/* Top Row - 4 Metric Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-blue-600 mb-2 tracking-tight leading-none">{details.totalCount}</div>
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">Total Count</div>
                </div>
                <div className="bg-red-50 rounded-lg p-5 border border-red-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-red-600 mb-2 tracking-tight leading-none">{details.activeIssues}</div>
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">Active Issues</div>
                </div>
                <div className="bg-green-50 rounded-lg p-5 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-green-600 mb-2 tracking-tight leading-none">{details.healthySites}</div>
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">Healthy Sites</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-5 border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-orange-600 mb-2 tracking-tight leading-none">{details.missedAlerts}</div>
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">Missed Alerts</div>
                </div>
              </div>

              {/* Middle Row - 2 Larger Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-6 border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-purple-600 mb-2 tracking-tight leading-none">{details.totalPortfoliosMonitored}</div>
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">Total Portfolios Monitored</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-blue-600 mb-2 tracking-tight leading-none">{details.monitoringActiveHours}</div>
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">Monitoring Active Hours</div>
                </div>
              </div>

              {/* Total Portfolios Monitored */}
              {details.portfolios.length > 0 && (
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
                    Total Portfolios Monitored ({details.portfolios.length})
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {details.portfolios.map((portfolio, idx) => {
                      // Extract portfolio name and site range if available
                      const portfolioMatch = portfolio.match(/^(.+?)\s*\((.+)\)$/)
                      const portfolioName = portfolioMatch ? portfolioMatch[1] : portfolio
                      const siteRange = portfolioMatch ? portfolioMatch[2] : null

                      return (
                        <span
                          key={idx}
                          className="px-3.5 py-2 bg-[#ecfdf3] text-[#027a48] rounded-full text-sm font-bold border border-[#abefc6] shadow-sm flex items-center gap-2 hover:shadow-md hover:bg-[#d1fadf] transition-all"
                        >
                          <span className="w-2 h-2 bg-[#12b76a] rounded-full shadow-[0_0_4px_rgba(18,183,106,0.5)]"></span>
                          <span className="leading-none">{portfolioName}</span>
                          {siteRange && <span className="text-[#067647] font-semibold opacity-90 ml-1">({siteRange})</span>}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Hourly Breakdown Chart */}
              {details.hourlyBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Hourly Breakdown</h4>
                  <div style={{ height: '300px' }}>
                    <Bar data={hourlyChartData} options={hourlyChartOptions} />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <Button
                  variant="primary"
                  onClick={onClose}
                  style={{ backgroundColor: '#76ab3f' }}
                  className="px-6 py-2.5 font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoverageMatrix

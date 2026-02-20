import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { issueService } from '../../services/issueService'
import { adminService } from '../../services/adminService'
import { Issue } from '../../types/issue.types'
import { User } from '../../types/user.types'
import { useAuth } from '../../context/AuthContext'
import Card from '../common/Card'
import Button from '../common/Button'
import toast from 'react-hot-toast'
import IssueExportButtons from '../common/IssueExportButtons'
import { getESTDateString } from '../../utils/timezone'

const IssuesByUser: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [userSearch, setUserSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'month' | 'quarter' | 'custom'>('today')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [filterByUser, setFilterByUser] = useState('')

  // Search and filter states for issues table
  const [globalSearch, setGlobalSearch] = useState('')
  const [issueFilter, setIssueFilter] = useState<'active' | 'all'>('active')
  const [showMissedAlertsOnly, setShowMissedAlertsOnly] = useState(false)
  const [searchMissedBy, setSearchMissedBy] = useState('')
  const [searchMonitoredBy, setSearchMonitoredBy] = useState('')
  const [fromDate, setFromDate] = useState(() => getESTDateString())
  const [toDate, setToDate] = useState(() => getESTDateString())

  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  })

  // Fetch issues
  const { data: allIssues = [] } = useQuery<Issue[]>({
    queryKey: ['issues'],
    queryFn: () => issueService.getAll({}),
  })

  // Filter issues based on period
  const filteredIssuesByPeriod = useMemo(() => {
    let filtered = allIssues

    if (periodFilter === 'today') {
      const todayStr = getESTDateString()
      filtered = filtered.filter((issue) => {
        const issueDateStr = new Date(issue.created_at).toISOString().split('T')[0]
        return issueDateStr === todayStr
      })
    } else if (periodFilter === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-')
      const start = new Date(parseInt(year), parseInt(month) - 1, 1)
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
      filtered = filtered.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        return issueDate >= start && issueDate <= end
      })
    } else if (periodFilter === 'quarter' && selectedQuarter) {
      const quarter = parseInt(selectedQuarter)
      const year = parseInt(selectedYear)
      const startMonth = (quarter - 1) * 3
      const start = new Date(year, startMonth, 1)
      const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
      filtered = filtered.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        return issueDate >= start && issueDate <= end
      })
    } else if (periodFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        return issueDate >= start && issueDate <= end
      })
    }

    if (filterByUser) {
      filtered = filtered.filter((issue) => {
        const monitoredBy = issue.monitored_by?.[0] || ''
        return monitoredBy.toLowerCase().includes(filterByUser.toLowerCase())
      })
    }

    return filtered
  }, [allIssues, periodFilter, selectedMonth, selectedQuarter, selectedYear, customStartDate, customEndDate, filterByUser])

  // Calculate user analytics
  const userAnalytics = useMemo(() => {
    const analyticsMap: {
      [key: string]: {
        user: string
        displayName: string
        issues: number
        issuesYes: number
        missedAlerts: number
        todayActivity: number
        portfoliosChecked: Set<string>
        hoursCount: Set<number>
        hourlyBreakdown: Array<{ hour: number; count: number; foundIssues: number }>
      }
    } = {}

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    filteredIssuesByPeriod.forEach((issue) => {
      const monitoredBy = issue.monitored_by?.[0] || 'Unknown'

      // Find the user in our users list for consistent display name (Full Name)
      const foundUser = users.find(u => u.email?.toLowerCase() === monitoredBy.toLowerCase())
      const username = monitoredBy.split('@')[0]
      const displayName = foundUser?.full_name || username || 'Unknown'

      if (!analyticsMap[monitoredBy]) {
        analyticsMap[monitoredBy] = {
          user: monitoredBy,
          displayName,
          issues: 0,
          issuesYes: 0,
          missedAlerts: 0,
          todayActivity: 0,
          portfoliosChecked: new Set(),
          hoursCount: new Set(),
          hourlyBreakdown: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, foundIssues: 0 })),
        }
      }

      const userAnalytics = analyticsMap[monitoredBy]
      userAnalytics.issues++

      if (issue.description && issue.description.toLowerCase() !== 'no issue') {
        userAnalytics.issuesYes++
        userAnalytics.hourlyBreakdown[issue.issue_hour].foundIssues++
      }

      userAnalytics.hourlyBreakdown[issue.issue_hour].count++
      userAnalytics.portfoliosChecked.add(issue.portfolio_id)
      userAnalytics.hoursCount.add(issue.issue_hour)

      if (issue.missed_by && issue.missed_by.length > 0) {
        userAnalytics.missedAlerts += issue.missed_by.length
      }

      const issueDate = new Date(issue.created_at)
      issueDate.setHours(0, 0, 0, 0)
      if (issueDate.getTime() === today.getTime()) {
        userAnalytics.todayActivity++
      }
    })

    return Object.values(analyticsMap)
  }, [filteredIssuesByPeriod])

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return userAnalytics
    return userAnalytics.filter((u) =>
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.user.toLowerCase().includes(userSearch.toLowerCase())
    )
  }, [userAnalytics, userSearch])

  // Find selected user for analytics display - use filterByUser or search result
  const selectedUserForDisplay = useMemo(() => {
    if (filterByUser) {
      return filteredUsers.find((u) => u.user === filterByUser) || null
    }
    if (userSearch.trim() && filteredUsers.length === 1) {
      return filteredUsers[0]
    }
    if (userSearch.trim()) {
      return filteredUsers.find((u) =>
        u.displayName.toLowerCase() === userSearch.toLowerCase() ||
        u.user.toLowerCase() === userSearch.toLowerCase()
      ) || null
    }
    return null
  }, [filterByUser, userSearch, filteredUsers])

  // Filter issues for table
  const filteredIssuesForTable = useMemo(() => {
    let filtered = allIssues

    // User filter (Dropdown or Search match)
    const activeUserEmail = selectedUserForDisplay?.user
    if (activeUserEmail) {
      filtered = filtered.filter((issue) => {
        const monitoredByEmail = issue.monitored_by?.[0] || ''
        return monitoredByEmail.toLowerCase() === activeUserEmail.toLowerCase()
      })
    }

    // Global search
    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase()
      filtered = filtered.filter((issue) => {
        const portfolioMatch = issue.portfolio?.name?.toLowerCase().includes(searchLower)
        const descMatch = issue.description?.toLowerCase().includes(searchLower)
        const notesMatch = issue.notes?.toLowerCase().includes(searchLower)
        const monitoredByMatch = issue.monitored_by?.some(email => email.toLowerCase().includes(searchLower))
        const missedByMatch = issue.missed_by?.some(email => email.toLowerCase().includes(searchLower))

        return portfolioMatch || descMatch || notesMatch || monitoredByMatch || missedByMatch
      })
    }

    // Issue filter
    if (issueFilter === 'active') {
      filtered = filtered.filter(
        (issue) => issue.description && issue.description.toLowerCase() !== 'no issue'
      )
    }

    // Missed alerts only
    if (showMissedAlertsOnly) {
      filtered = filtered.filter((issue) => issue.missed_by && issue.missed_by.length > 0)
    }

    // Search by missed by
    if (searchMissedBy) {
      filtered = filtered.filter((issue) =>
        issue.missed_by?.some((email) => email.toLowerCase().includes(searchMissedBy.toLowerCase()))
      )
    }

    // Search by monitored by
    if (searchMonitoredBy) {
      filtered = filtered.filter((issue) =>
        issue.monitored_by?.some((email) =>
          email.toLowerCase().includes(searchMonitoredBy.toLowerCase())
        )
      )
    }

    // Date range - EST AWARE
    if (fromDate) {
      // Treat input YYYY-MM-DD as EST, so start is 05:00 UTC (or 04:00 DST)
      // Simple approximate fix for EST (UTC-5)
      const start = new Date(`${fromDate}T05:00:00.000Z`)
      filtered = filtered.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        return issueDate >= start
      })
    }

    if (toDate) {
      // Treat input YYYY-MM-DD as EST, so end is 04:59:59 UTC Next Day (covering full late shift)
      // We add 1 day to toDate string, then set to 05:00:00Z minus 1ms? 
      // Simpler: `${toDate}T23:59:59` is EST. Convert to UTC implies adding 5 hours => Next Day 04:59 UTC
      const end = new Date(`${toDate}T23:59:59.999`) // Browser treats T-time as local? No, standard is tricky.
      // Robust way: Create UTC date for 05:00 on NEXT day
      const d = new Date(toDate)
      d.setDate(d.getDate() + 1)
      const nextDayStr = d.toISOString().split('T')[0]
      const endT = new Date(`${nextDayStr}T04:59:59.999Z`) // 23:59 EST is roughly 04:59 UTC next day

      filtered = filtered.filter((issue) => {
        const issueDate = new Date(issue.created_at)
        return issueDate <= endT
      })
    }

    return filtered
  }, [
    allIssues,
    globalSearch,
    issueFilter,
    showMissedAlertsOnly,
    searchMissedBy,
    searchMonitoredBy,
    fromDate,
    toDate,
    filterByUser,
    selectedUserForDisplay,
  ])

  // Keep this for backward compatibility but use selectedUserForDisplay in UI
  const selectedUser = filterByUser ? filteredUsers.find((u) => u.user === filterByUser) : null

  const getPerformanceBadge = (userAnalytics: typeof selectedUser) => {
    if (!userAnalytics) return { text: 'N/A', color: 'bg-gray-100 text-gray-800' }
    const accuracyRate =
      userAnalytics.issues > 0
        ? ((userAnalytics.issues - userAnalytics.missedAlerts) / userAnalytics.issues) * 100
        : 100

    if (accuracyRate >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800' }
    if (accuracyRate >= 75) return { text: 'Good', color: 'bg-blue-100 text-blue-800' }
    if (accuracyRate >= 60) return { text: 'Fair', color: 'bg-yellow-100 text-yellow-800' }
    return { text: 'Low', color: 'bg-red-100 text-red-800' }
  }

  const handleClearFilters = () => {
    setGlobalSearch('')
    setIssueFilter('active')
    setShowMissedAlertsOnly(false)
    setSearchMissedBy('')
    setSearchMonitoredBy('')
    setFromDate('')
    setToDate('')
  }

  const handleQuickRange = (range: 'today' | 'yesterday' | 'week' | 'month') => {
    // Use EST Date String as the source of truth for "Today"
    const todayStr = getESTDateString()
    const today = new Date(todayStr + 'T12:00:00') // Use noon to avoid timezone shift on day subtraction

    if (range === 'today') {
      setFromDate(todayStr)
      setToDate(todayStr)
    } else if (range === 'yesterday') {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      setFromDate(yesterdayStr)
      setToDate(yesterdayStr)
    } else if (range === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]
      setFromDate(weekAgoStr)
      setToDate(todayStr)
    } else if (range === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setMonth(today.getMonth() - 1)
      const monthAgoStr = monthAgo.toISOString().split('T')[0]
      setFromDate(monthAgoStr)
      setToDate(todayStr)
    }
  }

  const handleExportCSV = () => {
    const csvRows = [
      ['Date & Time', 'Portfolio', 'Missed By', 'Monitored By', 'Details'],
      ...filteredIssuesForTable.map((issue) => [
        new Date(issue.created_at).toLocaleString(),
        issue.portfolio?.name || 'N/A',
        issue.missed_by?.map((email) => email.split('@')[0]).join(', ') || '-',
        issue.monitored_by?.map((email) => email.split('@')[0]).join(', ') || '-',
        `${issue.description || ''}${issue.notes ? ` (Case: ${issue.notes})` : ''}`,
      ]),
    ]

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `issues_by_user_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Issues exported successfully')
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}/${day}/${year}, ${hours}:${minutes}`
  }


  return (
    <div className="space-y-6">
      {/* Green Banner Header */}
      <div className="bg-green-600 text-white py-6 px-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-1">Issues by User</h1>
        <p className="text-green-100 text-sm">Track and analyze issues by monitoring personnel</p>
      </div>

      {/* User Performance Analytics Section */}
      <Card>
        <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900">User Performance Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">Individual hourly monitoring performance and statistics</p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 tracking-wider">Period Type</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white transition-all shadow-sm"
              >
                <option value="today">Today</option>
                <option value="all">All Time</option>
                <option value="month">By Month</option>
                <option value="quarter">By Quarter</option>
                <option value="custom">Custom Period</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 tracking-wider">Filter by User</label>
              <select
                value={filterByUser}
                onChange={(e) => setFilterByUser(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white transition-all shadow-sm"
              >
                <option value="">All Users</option>
                {filteredUsers.map((u) => (
                  <option key={u.user} value={u.user}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 tracking-wider">Search Users</label>
              <div className="relative">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Type name..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white transition-all shadow-sm pl-9"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>


          {/* Month/Quarter/Custom Filters - Conditional Rows */}
          <div className="space-y-4">
            {periodFilter === 'month' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 tracking-wider">Select Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white transition-all shadow-sm"
                />
              </div>
            )}

            {periodFilter === 'quarter' && (
              <div className="grid grid-cols-2 gap-4 max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 tracking-wider">Quarter</label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
                  >
                    <option value="">Select</option>
                    <option value="1">Q1</option>
                    <option value="2">Q2</option>
                    <option value="3">Q3</option>
                    <option value="4">Q4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 tracking-wider">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
                  />
                </div>
              </div>
            )}

            {periodFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-4 max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 tracking-wider">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 my-2"></div>

          {/* Empty State or User Analytics */}
          {!selectedUserForDisplay ? (
            <div className="mt-6 p-12 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
              <p className="text-gray-600 text-sm">
                Type a monitoring user's name in the search box above to view their detailed analytics.
              </p>
            </div>
          ) : (
            /* User Analytics Card */
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              {/* User Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                    style={{ backgroundColor: '#76AB3F' }}
                  >
                    {selectedUserForDisplay.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedUserForDisplay.displayName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getPerformanceBadge(selectedUserForDisplay).color}`}
                      >
                        {getPerformanceBadge(selectedUserForDisplay).text}
                      </span>
                      <span className="text-sm text-gray-600">
                        {selectedUserForDisplay.hoursCount.size} Monitoring Active Hours
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Issues Found</p>
                  <p className="text-xl font-bold text-gray-900">{selectedUserForDisplay.issuesYes}</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Missed</p>
                  <p className="text-xl font-bold text-red-600">{selectedUserForDisplay.missedAlerts}</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Today's Activity</p>
                  <p className="text-xl font-bold text-gray-900">{selectedUserForDisplay.todayActivity}</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Portfolios Checked</p>
                  <p className="text-xl font-bold text-gray-900">{selectedUserForDisplay.portfoliosChecked.size}</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Accuracy Rate</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedUserForDisplay.issues > 0
                      ? Math.round(
                        ((selectedUserForDisplay.issues - selectedUserForDisplay.missedAlerts) / selectedUserForDisplay.issues) * 100
                      )
                      : 100}
                    %
                  </p>
                </div>
              </div>

              {/* 24-Hour Monitoring Activity Chart */}
              <div>
                <h5 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  24-Hour Monitoring Activity
                </h5>
                <div className="grid grid-cols-12 gap-1">
                  {selectedUserForDisplay.hourlyBreakdown.map((hourData) => (
                    <div key={hourData.hour} className="text-center">
                      <div
                        className={`h-12 rounded-md transition-all cursor-pointer hover:opacity-80 ${hourData.count === 0
                          ? 'bg-gray-100'
                          : hourData.count >= 5
                            ? 'bg-green-500'
                            : hourData.count >= 3
                              ? 'bg-green-400'
                              : hourData.count >= 1
                                ? 'bg-green-300'
                                : 'bg-gray-100'
                          }`}
                        title={`Hour ${hourData.hour}: ${hourData.count} checks${hourData.foundIssues > 0 ? `, ${hourData.foundIssues} issues found` : ''
                          }`}
                      >
                        {hourData.count > 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-white text-xs font-bold">
                            <div>{hourData.count}</div>
                            {hourData.foundIssues > 0 && (
                              <div className="text-[10px] mt-0.5 text-white/90">●</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium mt-1">{hourData.hour}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span className="text-gray-600">High Activity (5+)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-400"></div>
                    <span className="text-gray-600">Medium (3-4)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-300"></div>
                    <span className="text-gray-600">Low (1-2)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                    <span className="text-gray-600">No Activity</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">Issues Found</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Filter & Search Issues Section */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Filter & Search Issues</h2>

          {/* Quick Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Search</label>
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Type to search by name, portfolio, issue details, or case number..."
              className="w-full px-3 py-1.5 text-sm border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Issue Filter</label>
              <select
                value={issueFilter}
                onChange={(e) => setIssueFilter(e.target.value as 'active' | 'all')}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active Issues (Default)</option>
                <option value="all">All Issues</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search By "Missed By" Name</label>
              <input
                type="text"
                value={searchMissedBy}
                onChange={(e) => setSearchMissedBy(e.target.value)}
                placeholder="Type person's name who missed issues..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search By "Monitored By" Name</label>
              <input
                type="text"
                value={searchMonitoredBy}
                onChange={(e) => setSearchMonitoredBy(e.target.value)}
                placeholder="Type person's name who monitored..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Checkbox */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                id="missedAlertsOnly"
                checked={showMissedAlertsOnly}
                onChange={(e) => setShowMissedAlertsOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Show Missed Alerts Only</span>
            </label>
          </div>

          {/* Date Range Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleQuickRange('today')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${fromDate === getESTDateString() && toDate === getESTDateString()
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Today
            </button>
            <button
              onClick={() => handleQuickRange('yesterday')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${fromDate && toDate && fromDate === toDate && fromDate !== getESTDateString()
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => handleQuickRange('week')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all bg-gray-100 text-gray-700 hover:bg-gray-200`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleQuickRange('month')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all bg-gray-100 text-gray-700 hover:bg-gray-200`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                const todayStr = getESTDateString()
                const todayDate = new Date(todayStr)
                const firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
                const firstDayStr = firstDay.toISOString().split('T')[0]
                setFromDate(firstDayStr)
                setToDate(todayStr)
              }}
              className={`px-3 py-1.5 text-sm rounded-md transition-all bg-green-100 text-green-700 hover:bg-green-200`}
            >
              This Month
            </button>
          </div>

          {/* Date Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Action Buttons and Summary */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear filters
              </Button>
              <Button variant="primary" size="sm" onClick={handleExportCSV} style={{ backgroundColor: '#76ab3f' }}>
                Export to CSV
              </Button>
            </div>
            <p className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md">
              Showing {filteredIssuesForTable.length} of {allIssues.length} issues
            </p>
          </div>
        </div>
      </Card>

      {/* Export Section */}
      <Card>
        <IssueExportButtons filters={{
          ...(searchMonitoredBy && { search: searchMonitoredBy }),
          ...(issueFilter === 'active' && { description: '!No issue' })
        }} startDate={fromDate || undefined} endDate={toDate || undefined} />
      </Card>

      {/* Issues Table */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-green-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Portfolio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Missed By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Monitored By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIssuesForTable.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No issues found
                  </td>
                </tr>
              ) : (
                filteredIssuesForTable.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(issue.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{issue.portfolio?.name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      {issue.description && issue.description.toLowerCase() !== 'no issue' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Issue
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          No Issue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {issue.missed_by && issue.missed_by.length > 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {issue.missed_by.map((email) => email.split('@')[0]).join(', ')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {issue.monitored_by?.map((email) => email.split('@')[0]).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                      <div>{issue.description || '-'}</div>
                      {issue.notes && (
                        <div className="text-xs text-gray-500 mt-1">{issue.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            toast('Edit functionality coming soon', { icon: 'ℹ️' })
                          }}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        {(currentUser?.role === 'tenant_admin' || currentUser?.role === 'super_admin') && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this issue?')) {
                                toast('Delete functionality coming soon', { icon: 'ℹ️' })
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default IssuesByUser



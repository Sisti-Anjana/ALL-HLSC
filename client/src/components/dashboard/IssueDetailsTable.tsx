import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { issueService, IssueFilters } from '../../services/issueService'
import { portfolioService } from '../../services/portfolioService'
import { adminService, PortfolioLock } from '../../services/adminService'
import { Issue, CreateIssueData } from '../../types/issue.types'
import { Portfolio } from '../../types/portfolio.types'
import { User } from '../../types/user.types'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import IssueExportButtons from '../common/IssueExportButtons'
import ConfirmDialog from '../common/ConfirmDialog'
import { useDebounce } from '../../hooks/useDebounce'

const IssueDetailsTable: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  // Get portfolio and hour from URL query parameters (use EST)
  const portfolioParam = searchParams.get('portfolio')
  const hourParam = searchParams.get('hour')
  const currentHour = getESTHour().toString()

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300) // Debounce search by 300ms
  const [dateFilter, setDateFilter] = useState('')
  // If portfolio param exists, use hour param or current hour; otherwise 'all'
  const [hourFilter, setHourFilter] = useState<string>(
    portfolioParam ? (hourParam || currentHour) : 'all'
  )
  const [issueFilter, setIssueFilter] = useState<string>('active')
  // If portfolio param exists, default to that portfolio; otherwise 'all'
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(
    portfolioParam || 'all'
  )
  const todayStr = getESTDateString() // Use EST date
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [quickRange, setQuickRange] = useState<string>('today')

  // Initialize dates on mount (use EST)
  useEffect(() => {
    const today = getESTDateString()
    setStartDate(today)
    setEndDate(today)
    handleQuickRange('today')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Export states
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // New issue form states (use EST hour)
  const [newIssue, setNewIssue] = useState<Partial<CreateIssueData>>({
    portfolio_id: '',
    issue_hour: getESTHour(),
    description: '',
    monitored_by: user?.email ? [user.email] : [],
  })
  const [issuePresent, setIssuePresent] = useState<string>('')
  const [caseNumber, setCaseNumber] = useState('')
  const [missedAlertsBy, setMissedAlertsBy] = useState<string>('')
  const [selectedMonitoredBy, setSelectedMonitoredBy] = useState<string>(user?.email || '')
  const [activeLock, setActiveLock] = useState<PortfolioLock | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null)

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfolioService.getAll,
  })

  // Fetch users for dropdowns
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  })

  // Fetch locks to detect the current user's active lock
  const { data: locks = [] } = useQuery<PortfolioLock[]>({
    queryKey: ['portfolio-locks'],
    queryFn: adminService.getLocks,
    refetchInterval: 3000, // Refresh every 3 seconds (reduced from 1s to prevent page freeze)
    staleTime: 2000, // Consider data fresh for 2 seconds
  })

  // Derive active lock for the logged-in user (current hour)
  useEffect(() => {
    if (!user?.email || locks.length === 0) {
      setActiveLock(null)
      return
    }
    const currentHour = new Date().getHours()
    const lock = locks.find(
      (l) =>
        l.monitored_by?.toLowerCase() === user.email.toLowerCase() &&
        l.issue_hour === currentHour
    )
    setActiveLock(lock || null)
  }, [locks, user?.email])

  // Set default monitored by to current user's email
  useEffect(() => {
    if (user?.email) {
      setSelectedMonitoredBy(user.email)
      setNewIssue(prev => ({
        ...prev,
        monitored_by: [user.email],
      }))
    }
  }, [user])

  // When there is an active lock, prefill and lock portfolio/hour/monitored_by
  useEffect(() => {
    if (activeLock) {
      setNewIssue((prev) => ({
        ...prev,
        portfolio_id: activeLock.portfolio_id,
        issue_hour: activeLock.issue_hour,
        monitored_by: user?.email ? [user.email] : prev.monitored_by,
      }))
      setSelectedMonitoredBy(user?.email || '')
    }
  }, [activeLock, user?.email])

  // Initialize dates on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
    handleQuickRange('today')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build filters for API - using debounced search
  const buildFilters = useMemo((): IssueFilters => {
    const filters: IssueFilters = {}
    if (debouncedSearchQuery) filters.search = debouncedSearchQuery
    if (selectedPortfolio && selectedPortfolio !== 'all') {
      filters.portfolio_id = selectedPortfolio
    }
    if (hourFilter && hourFilter !== 'all') {
      filters.issue_hour = parseInt(hourFilter)
    }
    // "Active issues" = issues where Issue Present = Yes (description !== 'No issue')
    // "All issues" = all issues (both Yes and No)
    if (issueFilter === 'active') {
      filters.description = '!No issue' // Filter out "No issue" entries
    }
    // Note: Date filtering will be handled client-side or added to backend later
    return filters
  }, [debouncedSearchQuery, selectedPortfolio, hourFilter, issueFilter])

  // Fetch issues - use debounced search query
  const { data: allIssues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ['issues', buildFilters, selectedPortfolio, hourFilter, issueFilter, debouncedSearchQuery],
    queryFn: () => issueService.getAll(buildFilters),
    refetchInterval: 5000, // Auto-refresh every 5 seconds (reduced from 1s to prevent page freeze)
    staleTime: 3000, // Consider data fresh for 3 seconds
  })

  // Filter issues by date range on client-side
  const issues = allIssues.filter((issue) => {
    if (!startDate || !endDate) return true
    const issueDate = new Date(issue.created_at).toISOString().split('T')[0]
    return issueDate >= startDate && issueDate <= endDate
  }).sort((a, b) => {
    // Sort by newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Create issue mutation
  const createMutation = useMutation({
    mutationFn: issueService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      toast.success('Issue logged successfully')
      // Reset form
      setNewIssue({
        portfolio_id: '',
        issue_hour: new Date().getHours(),
        description: '',
        monitored_by: user?.email ? [user.email] : [],
      })
      setIssuePresent('')
      setCaseNumber('')
      setMissedAlertsBy('')
      setSelectedMonitoredBy(user?.email || '')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to log issue')
    },
  })

  // Update issue mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => issueService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      toast.success('Issue updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update issue')
    },
  })

  // Delete issue mutation
  const deleteMutation = useMutation({
    mutationFn: issueService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      toast.success('Issue deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete issue')
    },
  })

  const handleLogTicket = () => {
    // Validation
    if (!newIssue.portfolio_id) {
      toast.error('Please select a Portfolio')
      return
    }

    // Check if portfolio is locked by another user
    if (newIssue.portfolio_id && newIssue.issue_hour !== undefined) {
      const currentHour = newIssue.issue_hour
      const lockForThisPortfolio = locks.find(
        (l) =>
          l.portfolio_id === newIssue.portfolio_id &&
          l.issue_hour === currentHour
      )

      if (lockForThisPortfolio) {
        const isLockedByMe = lockForThisPortfolio.monitored_by?.toLowerCase() === user?.email?.toLowerCase()
        if (!isLockedByMe) {
          toast.error(`This portfolio is locked by ${lockForThisPortfolio.monitored_by?.split('@')[0] || 'another user'}. Only they can log issues.`)
          return
        }
      }
    }

    if (!issuePresent || (issuePresent !== 'yes' && issuePresent !== 'no')) {
      toast.error('Please select "Yes" or "No" for Issue Present')
      return
    }

    if (!selectedMonitoredBy) {
      toast.error('Monitored By is REQUIRED. Please select who monitored this hour.')
      return
    }

    if (issuePresent === 'yes' && (!newIssue.description || newIssue.description.trim() === '')) {
      toast.error('Please provide issue details when issue is present')
      return
    }

    // Build issue data - map to database schema
    // monitored_by is VARCHAR(255) (string), missed_by is TEXT[] (array)
    const issueData: any = {
      portfolio_id: newIssue.portfolio_id!,
      site_name: '',
      issue_hour: newIssue.issue_hour || new Date().getHours(),
      description: issuePresent === 'no' ? 'No issue' : (newIssue.description || '').trim(),
      severity: (issuePresent === 'yes' ? 'high' : 'low').toLowerCase(), // Database uses lowercase
      status: 'open',
      monitored_by: selectedMonitoredBy || '', // Database expects single string, not array
      missed_by: (issuePresent === 'yes' && missedAlertsBy) ? [missedAlertsBy] : null, // Array for missed_by, null if empty
      notes: caseNumber ? `Case #: ${caseNumber}` : null,
    }

    // Remove null/undefined fields
    Object.keys(issueData).forEach(key => {
      if (issueData[key] === null || issueData[key] === undefined) {
        delete issueData[key]
      }
    })

    console.log('Creating issue with data:', issueData)
    createMutation.mutate(issueData)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setDateFilter('')
    setHourFilter('all')
    setIssueFilter('active')
    setSelectedPortfolio('all')
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
    setQuickRange('today')
  }

  const handleQuickRange = (range: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    switch (range) {
      case 'today':
        setStartDate(today.toISOString().split('T')[0])
        setEndDate(today.toISOString().split('T')[0])
        setQuickRange('today')
        break
      case 'yesterday':
        setStartDate(yesterday.toISOString().split('T')[0])
        setEndDate(yesterday.toISOString().split('T')[0])
        setQuickRange('yesterday')
        break
      case 'week':
        setStartDate(weekStart.toISOString().split('T')[0])
        setEndDate(today.toISOString().split('T')[0])
        setQuickRange('week')
        break
      case 'month':
        setStartDate(monthStart.toISOString().split('T')[0])
        setEndDate(today.toISOString().split('T')[0])
        setQuickRange('month')
        break
      case 'all':
        // Set to a very early date (e.g., 2020-01-01) to show all issues till today
        setStartDate('2020-01-01')
        setEndDate(today.toISOString().split('T')[0])
        setQuickRange('all')
        break
    }
  }

  const handleExport = async (type: 'all' | 'active') => {
    try {
      const filters: IssueFilters = {}
      if (fromDate) {
        // Add date filtering when backend supports it
      }
      if (toDate) {
        // Add date filtering when backend supports it
      }
      if (type === 'active') {
        filters.status = 'open'
      }

      const data = await issueService.export(filters)
      // Handle export download
      toast.success('Export initiated')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to export issues')
    }
  }

  const formatDateTime = (dateString: string) => {
    // Format in EST timezone
    return formatESTTime(dateString)
  }

  const formatDate = (dateString: string) => {
    // Format in EST timezone
    return formatESTDate(dateString)
  }

  const getCurrentDateTime = () => {
    const now = new Date()
    return formatDateTime(now.toISOString())
  }

  return (
    <div className="space-y-6 w-full">
      {/* Search and Filters Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {/* Main Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Portfolio Selector */}
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
            >
              <option value="all">All Portfolios</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
            >
              <option value="active">Active Issues (Default)</option>
              <option value="all">All Issues</option>
            </select>

            {/* Hour Filter */}
            <select
              value={hourFilter}
              onChange={(e) => setHourFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
            >
              <option value="all">All Hours</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i.toString()}>{i}:00</option>
              ))}
            </select>

            {/* Start Date */}
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Unified Action Row - Single line, equal distance */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-gray-100">
            {/* Button Actions - Equal distance */}
            <span className="text-sm font-semibold text-gray-700">Quick Range:</span>
            <div className="flex items-center gap-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month' },
                { id: 'all', label: 'All' }
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => {
                    setQuickRange(range.id)
                    handleQuickRange(range.id as any)
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${quickRange === range.id
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Reset
            </Button>

            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

            <IssueExportButtons filters={buildFilters} startDate={startDate} endDate={endDate} />
          </div>

        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">
            Issue Results ({issues.length})
          </h3>
          <p className="text-sm text-gray-600 font-medium">Showing newest first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DATE</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">PORTFOLIO</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">HOUR</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ISSUE</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DETAILS</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">MONITORED BY</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading issues...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <div className="space-y-2">
                      <p className="font-medium">No issues found</p>
                      <p className="text-sm text-gray-400">
                        {issueFilter === 'active'
                          ? "No issues with 'Issue Present = Yes' found. Select 'All Issues' to see all issues, or try selecting a different portfolio or adjusting the date range."
                          : "No issues found. Try selecting a different portfolio or adjusting the date range."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr
                    key={issue.id}
                    className="hover:bg-blue-50 hover:shadow-sm transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(issue.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {issue.portfolio?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{issue.issue_hour}:00</td>
                    <td className="px-4 py-3">
                      {/* Show badge based on issue description or status */}
                      {issue.description && issue.description.toLowerCase() === 'no issue' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          No
                        </span>
                      ) : issue.description && issue.description.trim() !== '' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Yes
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {issue.description || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Array.isArray(issue.monitored_by) && issue.monitored_by.length > 0
                        ? issue.monitored_by[0].split('@')[0]
                        : (issue.monitored_by || 'N/A')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setIssueToDelete(issue.id)
                          setDeleteConfirmOpen(true)
                        }}
                        className="text-red-600 hover:text-red-800 hover:underline hover:font-semibold text-sm transition-all duration-200"
                        aria-label={`Delete issue from ${issue.portfolio?.name || 'portfolio'}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default IssueDetailsTable


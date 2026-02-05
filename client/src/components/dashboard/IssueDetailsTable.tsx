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
import { getESTHour, getESTDateString, formatESTTime, formatESTDate } from '../../utils/timezone'
import IssueEditModal from './IssueEditModal'

const IssueDetailsTable: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  // Get portfolio and hour from URL query parameters (use EST)
  const portfolioParam = searchParams.get('portfolio')
  const hourParam = searchParams.get('hour')
  const currentHour = getESTHour().toString()
  // console.log('Current EST Hour:', currentHour)

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
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

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
    const currentHour = getESTHour()
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

  useEffect(() => {
    const today = getESTDateString()
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
    // Sort by Date (YYYY-MM-DD) DESC
    const dateA = new Date(a.created_at).toISOString().split('T')[0]
    const dateB = new Date(b.created_at).toISOString().split('T')[0]
    if (dateA !== dateB) return dateB.localeCompare(dateA)

    // Then sort by Hour DESC
    const hourA = a.issue_hour ?? 0
    const hourB = b.issue_hour ?? 0
    if (hourA !== hourB) return hourB - hourA

    // Finally sort by full creation time DESC
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
        issue_hour: getESTHour(),
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
    const currentESTHour = getESTHour()
    if (newIssue.issue_hour !== undefined && newIssue.issue_hour > currentESTHour) {
      toast.error(`You cannot log issues for a future hour (${newIssue.issue_hour}:00). Current EST hour is ${currentESTHour}:00.`)
      return
    }

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
      issue_hour: newIssue.issue_hour || getESTHour(),
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
    const today = getESTDateString()
    setStartDate(today)
    setEndDate(today)
    setQuickRange('today')
  }

  const handleQuickRange = (range: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = getESTDateString()
    const todayObj = new Date(today)
    const yesterday = new Date(todayObj)
    yesterday.setDate(todayObj.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    const weekStart = new Date(todayObj)
    weekStart.setDate(todayObj.getDate() - todayObj.getDay()) // Start of week (Sunday)
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`

    const monthStart = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1)
    const monthStartStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`

    switch (range) {
      case 'today':
        setStartDate(today)
        setEndDate(today)
        setQuickRange('today')
        break
      case 'yesterday':
        setStartDate(yesterdayStr)
        setEndDate(yesterdayStr)
        setQuickRange('yesterday')
        break
      case 'week':
        setStartDate(weekStartStr)
        setEndDate(today)
        setQuickRange('week')
        break
      case 'month':
        setStartDate(monthStartStr)
        setEndDate(today)
        setQuickRange('month')
        break
      case 'all':
        setStartDate('2020-01-01')
        setEndDate(today)
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
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {/* Main Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues..."
                className="w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/50 bg-main text-primary"
              />
            </div>

            {/* Portfolio Selector */}
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/50 font-medium bg-main text-primary"
            >
              <option value="all" className="bg-card">All Portfolios</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id} className="bg-card">{p.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/50 font-medium bg-main text-primary"
            >
              <option value="active" className="bg-card">Active Issues (Default)</option>
              <option value="all" className="bg-card">All Issues</option>
            </select>

            {/* Hour Filter */}
            <select
              value={hourFilter}
              onChange={(e) => setHourFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/50 font-medium bg-main text-primary"
            >
              <option value="all" className="bg-card">All Hours</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i.toString()} className="bg-card">{i}:00</option>
              ))}
            </select>

            {/* Start Date */}
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/50 bg-main text-primary"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/50 bg-main text-primary"
              />
            </div>
          </div>

          {/* Unified Action Row - Single line, equal distance */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-subtle">
            {/* Button Actions - Equal distance */}
            <span className="text-sm font-semibold text-secondary">Quick Range:</span>
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
                    ? 'bg-accent-green text-white shadow-md'
                    : 'bg-main text-secondary hover:bg-subtle border border-subtle'
                    }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-subtle mx-2 hidden sm:block"></div>
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Reset
            </Button>

            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

            <IssueExportButtons filters={buildFilters} startDate={startDate} endDate={endDate} />
          </div>

        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-card rounded-lg shadow-md overflow-hidden border border-subtle">
        <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary tracking-tight">
            Issue Results ({issues.length})
          </h3>
          <p className="text-sm text-secondary font-medium">Showing newest first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-subtle">
            <thead className="bg-main">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-secondary uppercase tracking-wider">DATE</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-secondary uppercase tracking-wider">PORTFOLIO</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-secondary uppercase tracking-wider">HOUR</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-secondary uppercase tracking-wider">ISSUE</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-secondary uppercase tracking-wider">DETAILS</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-secondary uppercase tracking-wider">MONITORED BY</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-secondary uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading issues...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-secondary">
                    <div className="space-y-2">
                      <p className="font-medium text-primary">No issues found</p>
                      <p className="text-sm">
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
                    className="hover:bg-main hover:shadow-sm transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-accent-green"
                  >
                    <td className="px-4 py-3 text-sm text-primary">
                      {formatDate(issue.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary">
                      {issue.portfolio?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary">{issue.issue_hour}:00</td>
                    <td className="px-4 py-3">
                      {/* Show badge based on issue description or status */}
                      {issue.description && issue.description.toLowerCase() === 'no issue' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500 border border-green-500/30">
                          No
                        </span>
                      ) : issue.description && issue.description.trim() !== '' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500 border border-red-500/30">
                          Yes
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-subtle text-secondary">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary">
                      <div>
                        {issue.description || 'N/A'}
                        {(() => {
                          const rawNotes = issue.notes || ''
                          const cleanNote = rawNotes
                            .replace(/Case #: [^\n|]*/, '')
                            .replace(/\|/, '')
                            .replace(/\(Auto-saved\)/, '')
                            .trim()

                          if (!cleanNote) return null
                          return (
                            <div className="mt-1 text-xs text-secondary italic bg-main p-1 rounded">
                              Note: {cleanNote}
                            </div>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-primary">
                      {Array.isArray(issue.monitored_by) && issue.monitored_by.length > 0
                        ? issue.monitored_by[0].split('@')[0]
                        : (issue.monitored_by || 'N/A')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          if (!user?.email) return null
                          const monitor = issue.monitored_by
                          const authorEmail = Array.isArray(monitor)
                            ? monitor[0]
                            : monitor as any as string

                          if (!authorEmail) return null

                          const userEmail = user.email.toLowerCase().trim()
                          const authorEmailLower = authorEmail.toLowerCase().trim()
                          const username = userEmail.split('@')[0]

                          // Allow edit if:
                          // 1. Exact email match
                          // 2. Author is just the username (legacy data)
                          // 3. Author email starts with username (sub-match)
                          const isMatch = authorEmailLower === userEmail ||
                            authorEmailLower === username ||
                            userEmail.startsWith(authorEmailLower)

                          if (!isMatch) return null

                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingIssue(issue)
                                setEditModalOpen(true)
                              }}
                              className="text-accent-green hover:underline hover:font-semibold text-sm transition-all duration-200"
                            >
                              Edit
                            </button>
                          )
                        })()}
                        {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setIssueToDelete(issue.id)
                              setDeleteConfirmOpen(true)
                            }}
                            className="text-red-500 hover:underline hover:font-semibold text-sm transition-all duration-200"
                            aria-label={`Delete issue from ${issue.portfolio?.name || 'portfolio'}`}
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
      </div>
      <IssueEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingIssue(null)
        }}
        issue={editingIssue}
        users={users}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setIssueToDelete(null)
        }}
        onConfirm={() => {
          if (issueToDelete) {
            deleteMutation.mutate(issueToDelete)
          }
          setDeleteConfirmOpen(false)
          setIssueToDelete(null)
        }}
        title="Delete Issue"
        message="Are you sure you want to delete this issue? This action cannot be undone."
      />
    </div>
  )
}

export default IssueDetailsTable


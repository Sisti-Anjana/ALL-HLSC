import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../common/Button'
import { useNavigate } from 'react-router-dom'
import { analyticsService } from '../../services/analyticsService'
import { adminService, PortfolioLock } from '../../services/adminService'
import { issueService } from '../../services/issueService'
import { PortfolioActivity } from '../../types/analytics.types'
import { Issue } from '../../types/issue.types'
import { User } from '../../types/user.types'
import PortfolioDetailModal from '../portfolio/PortfolioDetailModal'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import toast from 'react-hot-toast'
import { getESTTime, getESTHour, getESTDateString, formatESTTime, getESTDaysDiff } from '../../utils/timezone'

interface QuickPortfolioReferenceProps {
  onPortfolioSelected?: (portfolioId: string, hour: number) => void
  selectedHour?: number
}

const QuickPortfolioReference: React.FC<QuickPortfolioReferenceProps> = ({
  onPortfolioSelected,
  selectedHour,
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedTenant } = useTenant()
  const isReadOnly = selectedTenant?.status === 'suspended' || selectedTenant?.status === 'inactive'

  const queryClient = useQueryClient()
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [hoveredPortfolio, setHoveredPortfolio] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number
    left: number
    showAbove: boolean
  } | null>(null)

  // Helper to compute Y/H value using EST timezone
  const computeESTYValue = (lastUpdated: Date | string | null) => {
    if (!lastUpdated) return { yValue: 'Y0', yValueNumber: 0, daysDiff: 0, hour: 0 }

    const date = new Date(lastUpdated)
    const nowEST = getESTTime()
    const todayEST = getESTDateString()

    // Get EST date components from the date
    const checkDateEST = date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const [checkMonth, checkDay, checkYear] = checkDateEST.split('/').map(Number)
    const checkDateString = `${checkYear}-${String(checkMonth).padStart(2, '0')}-${String(checkDay).padStart(2, '0')}`

    // Calculate days difference in EST
    const diffDays = getESTDaysDiff(checkDateString)

    // Get hour in EST
    const hourEST = parseInt(date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false,
    }), 10)

    if (diffDays === 0) {
      // It's today in EST, return current hour of the update in EST
      return { yValue: `H${hourEST}`, yValueNumber: hourEST, daysDiff: 0, hour: hourEST }
    } else if (diffDays === 1) {
      return { yValue: 'Y0', yValueNumber: 0, daysDiff: 1, hour: hourEST }
    } else {
      return { yValue: `Y${diffDays - 1}`, yValueNumber: diffDays - 1, daysDiff: diffDays, hour: hourEST }
    }
  }

  // Use React Query to fetch portfolio activity
  const { data: portfolios = [], isLoading: loading, error } = useQuery<PortfolioActivity[]>({
    queryKey: ['portfolio-activity'],
    queryFn: async () => {
      const data = await analyticsService.getPortfolioActivity()
      // TIMEZONE FIX: Calculate everything using EST timezone (default for all users)
      // Server returns raw data (date string and hour number), we calculate status here using EST
      return data.map(p => {
        const nowEST = getESTTime()
        const currentHourEST = getESTHour()
        const todayEST = getESTDateString()
        let yValue = 'Y0'
        let yValueNumber = 0
        let status: 'no-activity' | '3h' | '2h' | '1h' | 'updated' = 'no-activity'
        let lastCheckedDate: Date | null = null

        // Use raw allSitesCheckedDate and allSitesCheckedHour from server
        if (p.allSitesChecked === 'Yes' && p.allSitesCheckedDate && p.allSitesCheckedHour !== null && p.allSitesCheckedHour !== undefined) {
          // Calculate days difference in EST
          const daysDiff = getESTDaysDiff(p.allSitesCheckedDate)
          const checkedHour = p.allSitesCheckedHour

          console.log(`🕐 Portfolio ${p.id} - EST timezone calc:`, {
            checkedDate: p.allSitesCheckedDate,
            checkedHour,
            currentHourEST,
            daysDiff,
            estNow: formatESTTime(nowEST),
          })

          if (daysDiff === 0) {
            // Calculate hour difference in EST (handle day rollover)
            let hoursDiff = currentHourEST - checkedHour
            if (hoursDiff < 0) {
              hoursDiff = 24 + hoursDiff // Handle midnight rollover
            }

            // CRITICAL FIX: Only show current hour if it was completed in the current hour
            // Otherwise show the previous hour when it was last checked
            if (hoursDiff === 0) {
              // Completed in current hour - show current hour
              yValue = `H${checkedHour}`
              yValueNumber = checkedHour
              status = 'updated' // Green - checked in current hour (EST)
            } else {
              // Not completed in current hour - show the hour it was last checked
              yValue = `H${checkedHour}`
              yValueNumber = checkedHour

              // Set status based on hours since last check
              if (hoursDiff === 1) {
                status = '1h'
              } else if (hoursDiff === 2) {
                status = '2h'
              } else if (hoursDiff === 3) {
                status = '3h'
              } else {
                status = 'no-activity'
              }
            }

            // Create date object for EST (use UTC methods to avoid timezone conversion)
            const [year, month, day] = p.allSitesCheckedDate.split('-').map(Number)
            lastCheckedDate = new Date(Date.UTC(year, month - 1, day, checkedHour, 0, 0))
          } else if (daysDiff === 1) {
            // Checked yesterday in EST
            yValue = 'Y0'
            yValueNumber = 0
            status = 'no-activity'
            const [year, month, day] = p.allSitesCheckedDate.split('-').map(Number)
            lastCheckedDate = new Date(Date.UTC(year, month - 1, day, checkedHour, 0, 0))
          } else {
            // Checked more than 1 day ago in EST
            yValue = `Y${daysDiff - 1}`
            yValueNumber = daysDiff - 1
            status = 'no-activity'
            const [year, month, day] = p.allSitesCheckedDate.split('-').map(Number)
            lastCheckedDate = new Date(Date.UTC(year, month - 1, day, checkedHour, 0, 0))
          }
        } else {
          // No "All sites checked = Yes" - use lastUpdated if available, calculate using EST
          if (p.lastUpdated) {
            const { yValue: computedY, yValueNumber: computedYNum } = computeESTYValue(p.lastUpdated)
            yValue = computedY
            yValueNumber = computedYNum
            lastCheckedDate = p.lastUpdated
          }
        }

        return {
          ...p,
          yValue,
          yValueNumber,
          status,
          lastUpdated: lastCheckedDate || p.lastUpdated,
        }
      })
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds (reduced from 1s to prevent page freeze)
    staleTime: 3000, // Consider data fresh for 3 seconds to reduce unnecessary refetches
  })

  // Fetch locked portfolios - needs more frequent updates for real-time lock status
  const { data: locksData, error: locksError, isLoading: locksLoading } = useQuery<PortfolioLock[]>({
    queryKey: ['portfolio-locks', selectedHour],
    queryFn: async () => {
      console.log('🔄 QuickPortfolioReference - Fetching locks...')
      const result = await adminService.getLocks()
      const currentHour = selectedHour !== undefined ? selectedHour : getESTHour()

      // Proactively filter out any locks that don't match the hour we are viewing
      // This ensures the UI remains clean during hour changes or when viewing historical hours
      const filteredResult = result.filter((l: PortfolioLock) => Number(l.issue_hour) === currentHour)

      console.log('✅ QuickPortfolioReference - Locks fetched and filtered:', {
        totalFetched: result.length,
        showingCount: filteredResult.length,
        currentHour,
        locks: filteredResult.map((l: PortfolioLock) => ({
          portfolio_id: l.portfolio_id,
          hour: l.issue_hour,
          monitored_by: l.monitored_by,
        })),
      })
      return filteredResult
    },
    refetchInterval: 2000,
    retry: 2,
    retryDelay: 1000,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: 0,
  })

  const locks = locksData || []

  // Debug: Log when locks change
  useEffect(() => {
    console.log('🔒 QuickPortfolioReference - Locks state changed:', {
      locksCount: locks.length,
      locksLoading,
      locks: locks.map((l: PortfolioLock) => ({
        portfolio_id: l.portfolio_id,
        portfolio_id_type: typeof l.portfolio_id,
        hour: l.issue_hour,
        monitored_by: l.monitored_by,
      })),
      error: locksError?.message,
    })
  }, [locks, locksLoading, locksError])

  // Subscribe to query cache updates to force re-render when locks change
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === 'portfolio-locks') {
        console.log('🔄 QuickPortfolioReference - portfolio-locks query cache updated:', {
          state: event.query.state.status,
          dataUpdatedAt: event.query.state.dataUpdatedAt,
        })
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  // AUTO-REFRESH ON HOUR CHANGE (Clear stale locks immediately)
  const [lastCheckedHour, setLastCheckedHour] = useState(getESTHour())
  useEffect(() => {
    // Check every 30 seconds if the hour has changed
    const intervalId = setInterval(() => {
      const currentHour = getESTHour()
      if (currentHour !== lastCheckedHour) {
        console.log('⏰ QuickPortfolioReference - Hour changed from', lastCheckedHour, 'to', currentHour, '- Clearing stale locks...')
        setLastCheckedHour(currentHour)
        // Force refetch and clear old data
        queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
        queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
        queryClient.invalidateQueries({ queryKey: ['hourly-coverage'] })
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [lastCheckedHour, queryClient])

  // Fetch all issues to get recent workers
  const { data: allIssues = [] } = useQuery<Issue[]>({
    queryKey: ['issues'],
    queryFn: () => issueService.getAll({}),
    refetchInterval: 5000, // Auto-refresh every 5 seconds (reduced from 1s to prevent page freeze)
    staleTime: 3000, // Consider data fresh for 3 seconds
  })

  // Fetch users to map emails to display names
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  })

  // Update lastUpdated when data changes (using EST time)
  useEffect(() => {
    if (portfolios && portfolios.length > 0) {
      setLastUpdated(getESTTime())
    }
  }, [portfolios, loading])

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Failed to fetch portfolio activity:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : (error as any)?.response?.data?.error || 'Failed to load portfolio activity'
      toast.error(errorMessage)
    }
  }, [error])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'updated':
        return 'bg-green-100 border-green-300'
      case '1h':
        return 'bg-blue-100 border-blue-300'
      case '2h':
        return 'bg-yellow-100 border-yellow-400'
      case '3h':
        return 'bg-orange-100 border-orange-400'
      case 'no-activity':
        return 'bg-red-100 border-red-300'
      default:
        return 'bg-red-100 border-red-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'updated':
        return 'Updated (<1h)'
      case '1h':
        return '1h Inactive'
      case '2h':
        return '2h Inactive'
      case '3h':
        return '3h Inactive'
      case 'no-activity':
        return 'No Activity (4h+)'
      default:
        return 'No Activity (4h+)'
    }
  }

  const formatTime = (date: Date | string | null) => {
    if (!date) return 'N/A'
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return 'Invalid Date'
    // Format time in EST timezone
    return formatESTTime(dateObj)
  }

  const filteredPortfolios: PortfolioActivity[] = (portfolios || []).filter((p: PortfolioActivity) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get the last person who logged issues for a portfolio
  const getLastWorker = (portfolioId: string) => {
    // Get issues for this portfolio, sorted by most recent
    const portfolioIssues = allIssues
      .filter(issue => issue.portfolio_id === portfolioId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Get the most recent issue
    if (portfolioIssues.length === 0) return null

    const mostRecentIssue = portfolioIssues[0]
    if (!mostRecentIssue.monitored_by || !Array.isArray(mostRecentIssue.monitored_by) || mostRecentIssue.monitored_by.length === 0) {
      return null
    }

    // Get the first monitored_by email (most recent issue)
    const email = mostRecentIssue.monitored_by[0]
    const user = users.find(u => u.email === email)
    const displayName = user?.full_name || email.split('@')[0] || 'Unknown'

    return {
      email,
      displayName,
      lastWorked: new Date(mostRecentIssue.created_at)
    }
  }

  if (loading && portfolios.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Header Skeleton */}
        <div className="mb-6 animate-pulse">
          <div className="flex justify-between items-center mb-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-48 hidden sm:block"></div>
          </div>

          {/* Legend Skeleton */}
          <div className="flex gap-4 mb-6 pb-4 border-b border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>

          {/* Controls Skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div className="h-10 bg-gray-200 rounded w-64"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="bg-gray-50 border-2 border-gray-100 rounded-lg p-2.5 h-20 animate-pulse flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-8"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Header Section */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Quick Portfolio Reference</h2>
          <div className="text-xs sm:text-sm text-gray-700">
            <span className="hidden sm:inline">Last updated (EST): </span>
            <span className="font-semibold">{formatTime(lastUpdated)}</span>
            <span className="hidden lg:inline"> (Auto-refreshes every 15s)</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 sm:gap-6 mb-4 pb-4 border-b border-gray-200 flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-gray-700">Legend:</span>
          {['updated', '1h', '2h', '3h', 'no-activity'].map((status) => {
            const colors = getStatusColor(status).split(' ')
            const bgColor = colors[0]
            const borderColor = colors[1] || colors[0]
            return (
              <div key={status} className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded border-2 ${bgColor} ${borderColor}`}></div>
                <span className="text-xs text-gray-600">{getStatusLabel(status)}</span>
              </div>
            )
          })}
          {/* Add Lock Legend */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded border-[4px] border-purple-600 bg-white"></div>
            <span className="text-xs text-gray-600">Locked</span>
          </div>
        </div>

        {/* Search and Log Issue */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 mb-4">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 pl-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
          <Button
            onClick={() => {
              if (isReadOnly) {
                toast.error(`Cannot log issues while client is ${selectedTenant?.status}`)
                return
              }
              navigate('/issues?action=log')
            }}
            disabled={isReadOnly}
            className={`w-full sm:w-auto ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="hidden sm:inline">+ Log New Issue</span>
            <span className="sm:hidden">+ Log Issue</span>
          </Button>
        </div>
      </div>

      {/* Portfolio Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3">
        {filteredPortfolios.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No portfolios found</p>
          </div>
        ) : (
          filteredPortfolios.map((portfolio) => {
            // Normalize portfolio ID to string for comparison - handle both number and string IDs safely
            // STRICT COMPARISON: Always compare as strings to avoid "123" matching "123-abc" via parseInt
            const portfolioIdString = String(portfolio.id || '').trim()

            // Check for ANY active lock for this portfolio, regardless of hour
            const activeLock = (locks || []).find(l => {
              const lockPortfolioId = String(l.portfolio_id || '').trim()
              // Use case-insensitive string matching ONLY
              return lockPortfolioId.toLowerCase() === portfolioIdString.toLowerCase()
            })
            const isLocked = !!activeLock

            // Debug log for "BESS & AES Trimark" specifically
            if (portfolio.name && portfolio.name.toLowerCase().includes('bess')) {
              console.log('🔍 QuickPortfolioReference - BESS portfolio lock check:', {
                portfolioId: portfolioIdString,
                portfolioName: portfolio.name,
                locksCount: locks.length,
                isLocked,
                activeLock: activeLock ? {
                  portfolio_id: activeLock.portfolio_id,
                  portfolio_id_type: typeof activeLock.portfolio_id,
                  hour: activeLock.issue_hour,
                  monitored_by: activeLock.monitored_by,
                } : null,
                allLocks: locks.map(l => ({
                  portfolio_id: l.portfolio_id,
                  portfolio_id_type: typeof l.portfolio_id,
                  hour: l.issue_hour,
                  monitored_by: l.monitored_by,
                })),
              })
            }

            const statusColors = getStatusColor(portfolio.status)
            const colors = statusColors.split(' ')
            const bgColor = colors[0]
            const borderColor = colors[1] || colors[0]

            return (
              <div
                key={portfolio.id}
                className={`${bgColor} rounded-md ${isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} transition-all duration-500 ease-in-out relative border ${isLocked ? 'border-[3.5px] border-purple-600 ring-2 ring-purple-200' : borderColor} ${isReadOnly ? '' : 'hover:shadow-sm hover:scale-[1.02]'} flex items-stretch h-14 overflow-hidden`}
                style={{
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onClick={() => {
                  if (isReadOnly) {
                    toast.error(`Cannot work on portfolios while client is ${selectedTenant?.status}`)
                    return
                  }
                  setSelectedPortfolioId(portfolio.id)
                  // Don't open sidebar directly - open modal first
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const viewportHeight = window.innerHeight
                  const spaceAbove = rect.top
                  const spaceBelow = viewportHeight - rect.bottom

                  // Show tooltip above if there's more space above, otherwise below
                  const showAbove = spaceAbove > spaceBelow

                  setHoveredPortfolio(portfolio.id)
                  setTooltipPosition({
                    top: showAbove ? rect.top - 10 : rect.bottom + 10,
                    left: rect.left + rect.width / 2,
                    showAbove: showAbove
                  })
                }}
                onMouseLeave={() => {
                  setHoveredPortfolio(null)
                  setTooltipPosition(null)
                }}
              >
                {/* Content Section - REVERTED - NAME ONLY */}
                <div className="flex-1 pl-3 py-1 flex flex-col justify-center min-w-0 pr-14">
                  <h3 className="font-bold text-black text-[14px] leading-tight truncate">
                    {isLocked && <span className="mr-1 text-[11px]">🔒</span>}
                    {portfolio.name}
                  </h3>
                  {portfolio.subtitle && (
                    <p className="text-[12px] text-gray-700 font-medium truncate mt-0.5">
                      {portfolio.subtitle}
                    </p>
                  )}
                </div>

                {/* Y/H Badge - Top Right Corner - REFINED SIZE */}
                <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white p-0 rounded-sm shadow-sm z-10 border border-blue-500/10">
                  <span className="text-[10.5px] font-black leading-none block px-1 py-0.5">
                    {portfolio.yValue.charAt(0)} {portfolio.yValue.slice(1)}
                  </span>
                </div>

                {/* Hover Site Range Overlay - RESTORED HOVER ONLY */}
                {portfolio.siteRange && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 bg-white/95 flex items-center justify-center p-2 z-20 text-center pointer-events-none border-x border-blue-100">
                    <span className="text-blue-700 font-bold text-xs">📍 {portfolio.siteRange}</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Hover Tooltip */}
      {hoveredPortfolio && tooltipPosition && (() => {
        const portfolio = portfolios.find(p => p.id === hoveredPortfolio)
        if (!portfolio) return null

        // Find ANY active lock for this portfolio
        const lockInfo = (locks || []).find(l =>
          String(l.portfolio_id || '').trim().toLowerCase() === String(portfolio.id).trim().toLowerCase()
        )
        // Only show as locked if there's actually a lock
        const isLockedTooltip = !!lockInfo

        return (
          <div
            className="fixed z-[9999] bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-4 pointer-events-none border border-gray-700"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: tooltipPosition.showAbove
                ? 'translate(-50%, -100%) translateY(-8px)'
                : 'translate(-50%, 0) translateY(8px)',
              transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
              opacity: hoveredPortfolio ? 1 : 0,
            }}
          >
            <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">
              {portfolio.name}
              {portfolio.siteRange && ` (${portfolio.siteRange})`}
            </div>
            <div className="space-y-2">
              <div className="text-gray-200">
                <span className="text-gray-400">Status:</span> {getStatusLabel(portfolio.status)}
              </div>
              <div className="text-gray-200">
                <span className="text-gray-400">Y/H Value:</span> {portfolio.yValue}
              </div>

              {/* Show "Logged by" - current lock owner if locked, or last worker if not locked */}
              {(() => {
                if (isLockedTooltip && lockInfo && lockInfo.monitored_by) {
                  // Portfolio is locked for current hour - show current lock owner
                  // Use case-insensitive email matching
                  const lockUser = users.find(u =>
                    u.email?.toLowerCase() === lockInfo.monitored_by?.toLowerCase()
                  )
                  const lockOwnerName = lockUser?.full_name || lockInfo.monitored_by?.split('@')[0] || 'Unknown'
                  return (
                    <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-700">
                      <div className="text-gray-200 text-xs">
                        <span className="text-gray-400">Logged by:</span> {lockOwnerName}
                      </div>
                    </div>
                  )
                } else {
                  // Portfolio is not locked for current hour - show last person who logged issues
                  const lastWorker = getLastWorker(portfolio.id)
                  if (lastWorker) {
                    return (
                      <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-700">
                        <div className="text-gray-200 text-xs">
                          <span className="text-gray-400">Last logged by:</span> {lastWorker.displayName}
                        </div>
                      </div>
                    )
                  }
                }
                return null
              })()}

              {/* Separate box for "Last Activity" */}
              {portfolio.lastUpdated && (
                <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-700">
                  <div className="text-gray-200 text-xs">
                    <span className="text-gray-400">Last Activity:</span> {formatTime(portfolio.lastUpdated)}
                  </div>
                </div>
              )}

              {/* Separate box for lock info if locked */}
              {isLockedTooltip && lockInfo && (
                <div className="bg-purple-900/30 rounded px-2 py-1.5 border border-purple-500/30">
                  <div className="text-purple-300 text-xs">
                    🔒 Locked - Hour {lockInfo.issue_hour}:00
                  </div>
                </div>
              )}

              {/* "Click for options" in blue, separate box */}
              <div className="bg-blue-900/30 rounded px-2 py-1.5 border border-blue-500/30">
                <div className="text-blue-400 text-xs font-semibold text-center">
                  Click for options
                </div>
              </div>
            </div>
            {/* Arrow pointing to card */}
            <div
              className={`absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent ${tooltipPosition.showAbove
                ? 'top-full -mt-1 border-t-gray-900'
                : 'bottom-full mb-1 border-b-gray-900'
                }`}
            ></div>
          </div>
        )
      })()}

      {/* Portfolio Detail Modal */}
      {selectedPortfolioId && (
        <PortfolioDetailModal
          isOpen={!!selectedPortfolioId}
          onClose={() => setSelectedPortfolioId(null)}
          portfolioId={selectedPortfolioId}
          selectedHour={selectedHour}
          onLogIssue={(portfolioId, hour) => {
            setSelectedPortfolioId(null) // Close modal
            if (onPortfolioSelected) {
              onPortfolioSelected(portfolioId, hour)
            }
          }}
        />
      )}
    </div>
  )
}

export default QuickPortfolioReference

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
            // Checked today in EST - show the exact hour it was checked
            yValue = `H${checkedHour}`
            yValueNumber = checkedHour

            // Calculate hour difference in EST (handle day rollover)
            let hoursDiff = currentHourEST - checkedHour
            if (hoursDiff < 0) {
              hoursDiff = 24 + hoursDiff // Handle midnight rollover
            }

            // Set status based on hours - green if checked in current hour (EST)
            if (hoursDiff === 0) {
              status = 'updated' // Green - checked in current hour (EST)
            } else if (hoursDiff === 1) {
              status = '1h'
            } else if (hoursDiff === 2) {
              status = '2h'
            } else if (hoursDiff === 3) {
              status = '3h'
            } else {
              status = 'no-activity'
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
  const { data: locks = [], error: locksError, isLoading: locksLoading } = useQuery<PortfolioLock[]>({
    queryKey: ['portfolio-locks'],
    queryFn: async () => {
      console.log('🔄 QuickPortfolioReference - Fetching locks...')
      const result = await adminService.getLocks()
      console.log('✅ QuickPortfolioReference - Locks fetched:', {
        count: result.length,
        locks: result.map(l => ({
          portfolio_id: l.portfolio_id,
          portfolio_id_type: typeof l.portfolio_id,
          hour: l.issue_hour,
          monitored_by: l.monitored_by,
        })),
      })
      return result
    },
    refetchInterval: 2000, // Refresh every 2 seconds for faster updates
    retry: 2, // Retry up to 2 times on failure
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 0, // Always consider data stale to ensure fresh locks
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    gcTime: 0, // Don't cache - always fetch fresh data
  })

  // Debug: Log when locks change
  useEffect(() => {
    console.log('🔒 QuickPortfolioReference - Locks state changed:', {
      locksCount: locks.length,
      locksLoading,
      locks: locks.map(l => ({
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
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded border-[3px] border-purple-600 bg-white"></div>
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
            onClick={() => navigate('/issues?action=log')}
            className="w-full sm:w-auto"
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
            // Normalize portfolio ID to string for comparison - handle both number and string IDs
            const portfolioIdString = String(portfolio.id || '').trim()
            const portfolioIdNumber = typeof portfolio.id === 'number' ? portfolio.id : parseInt(portfolioIdString, 10)
            
            // Check for ANY active lock for this portfolio, regardless of hour
            // Try both string and number comparison to handle type mismatches
            const activeLock = (locks || []).find(l => {
              const lockPortfolioId = String(l.portfolio_id || '').trim()
              const lockPortfolioIdNumber = typeof l.portfolio_id === 'number' 
                ? l.portfolio_id 
                : parseInt(lockPortfolioId, 10)
              
              // Try multiple comparison methods
              const stringMatch = lockPortfolioId.toLowerCase() === portfolioIdString.toLowerCase()
              const numberMatch = !isNaN(portfolioIdNumber) && !isNaN(lockPortfolioIdNumber) && portfolioIdNumber === lockPortfolioIdNumber
              const matches = stringMatch || numberMatch
              
              if (matches) {
                console.log('🔒 QuickPortfolioReference - Found lock match:', {
                  portfolioId: portfolioIdString,
                  portfolioIdNumber,
                  lockPortfolioId,
                  lockPortfolioIdNumber,
                  portfolioName: portfolio.name,
                  hour: l.issue_hour,
                  monitored_by: l.monitored_by,
                  matchType: stringMatch ? 'string' : 'number',
                })
              }
              return matches
            })
            const isLocked = !!activeLock
            
            // Debug log for "BESS & AES Trimark" specifically
            if (portfolio.name && portfolio.name.toLowerCase().includes('bess')) {
              console.log('🔍 QuickPortfolioReference - BESS portfolio lock check:', {
                portfolioId: portfolioIdString,
                portfolioIdNumber,
                portfolioIdType: typeof portfolio.id,
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
                className={`${bgColor} rounded-lg p-2.5 cursor-pointer transition-all duration-300 ease-in-out relative shadow-md ${isLocked
                  ? 'border-[6px] border-purple-600'
                  : `border-2 ${borderColor}`
                  } hover:shadow-2xl hover:scale-110 hover:-translate-y-1 hover:z-10`}
                style={{
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onClick={() => {
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
                {/* Y/H Badge - Top Right */}
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                  <span className="text-xs font-bold">
                    {portfolio.yValue.startsWith('H') ? 'H' : 'Y'}
                  </span>
                  <span className="text-sm font-bold">
                    {portfolio.yValue.replace(/^[YH]/, '')}
                  </span>
                </div>

                {/* Portfolio Name with Site Range */}
                <div className="pr-16 pt-1">
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    {portfolio.name}
                    {portfolio.siteRange && (
                      <span className="text-gray-600 font-normal text-sm"> ({portfolio.siteRange})</span>
                    )}
                  </h3>
                </div>

                {/* Subtitle */}
                {portfolio.subtitle && (
                  <p className="text-xs text-gray-700 font-medium mt-1">{portfolio.subtitle}</p>
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

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { portfolioService } from '../../services/portfolioService'
import { adminService, PortfolioLock } from '../../services/adminService'
import { useAuth } from '../../context/AuthContext'
import { issueService } from '../../services/issueService'
import { Portfolio } from '../../types/portfolio.types'
import { Issue } from '../../types/issue.types'
import toast from 'react-hot-toast'

interface PortfolioDetailModalProps {
  isOpen: boolean
  onClose: () => void
  portfolioId: string
  onLogIssue?: (portfolioId: string, hour: number) => void
  selectedHour?: number
}

const PortfolioDetailModal: React.FC<PortfolioDetailModalProps> = ({
  isOpen,
  onClose,
  portfolioId,
  onLogIssue,
  selectedHour,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [allSitesChecked, setAllSitesChecked] = useState<'Yes' | 'No' | null>(null)
  const [sitesCheckedDetails, setSitesCheckedDetails] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [showUnlockSection, setShowUnlockSection] = useState(false)

  // Fetch portfolio details
  const { data: portfolio, isLoading } = useQuery<Portfolio>({
    queryKey: ['portfolio', portfolioId],
    queryFn: () => portfolioService.getById(portfolioId),
    enabled: isOpen && !!portfolioId,
  })

  // Check if portfolio is locked by current user
  const { data: locks = [] } = useQuery<PortfolioLock[]>({
    queryKey: ['portfolio-locks'],
    queryFn: adminService.getLocks,
    refetchInterval: 3000, // Refresh every 3 seconds (reduced from 1s to prevent page freeze)
    staleTime: 2000, // Consider data fresh for 2 seconds
  })

  const currentHour = new Date().getHours()

  // Get any active lock for this portfolio (to get the hour they were working on)
  const activeLockForPortfolio = useMemo(() => {
    if (!isOpen || !portfolioId || !locks.length) return null
    return locks.find(
      (lock) => String(lock.portfolio_id || '').trim().toLowerCase() === String(portfolioId).trim().toLowerCase()
    ) || null
  }, [isOpen, portfolioId, locks])

  // Check if portfolio is locked by current user (for the locked hour, not just current hour)
  const isLockedByMe = useMemo(() => {
    if (!activeLockForPortfolio || !user?.email) return false
    return activeLockForPortfolio.monitored_by?.toLowerCase() === user.email.toLowerCase()
  }, [activeLockForPortfolio, user?.email])

  // Check if portfolio is locked by anyone
  const isLockedByAnyone = isOpen && portfolioId && !!activeLockForPortfolio

  // CRITICAL: Check if current user has ANY other active lock on a DIFFERENT portfolio
  const userOtherLock = useMemo(() => {
    if (!isOpen || !user?.email || !locks.length) return null
    return locks.find(
      (lock) =>
        lock.monitored_by?.toLowerCase() === user.email.toLowerCase() &&
        String(lock.portfolio_id || '').trim().toLowerCase() !== String(portfolioId).trim().toLowerCase()
    ) || null
  }, [isOpen, user?.email, locks, portfolioId])

  const hasOtherLock = !!userOtherLock

  // Get the lock info to show who locked it
  const lockInfo = activeLockForPortfolio

  // Fetch issues for this portfolio to check if current user has entered any
  const { data: portfolioIssues = [] } = useQuery<Issue[]>({
    queryKey: ['issues', portfolioId],
    queryFn: () => issueService.getAll({ portfolio_id: portfolioId }),
    enabled: isOpen && !!portfolioId,
    refetchInterval: 5000, // Refetch every 5 seconds (reduced from 1s to prevent page freeze)
    staleTime: 3000, // Consider data fresh for 3 seconds
  })

  // Get the hour the user is working on (from lock if exists, otherwise Dashboard selection, otherwise current hour)
  const workingHour = activeLockForPortfolio?.issue_hour !== undefined && activeLockForPortfolio?.issue_hour !== null
    ? activeLockForPortfolio.issue_hour
    : (selectedHour !== undefined ? selectedHour : currentHour)

  // Check if current user has entered at least one issue for this portfolio
  // CRITICAL: If portfolio is locked by current user, MUST check for issues at the locked hour ONLY
  // We should NOT count old issues from previous hours - only issues for the current lock session
  const hasIssuesByCurrentUser = useMemo(() => {
    // Always return false if no user email
    if (!user?.email) {
      console.warn('PortfolioDetailModal - No user email, hasIssuesByCurrentUser = false')
      return false
    }

    // Always return false if no issues exist
    if (portfolioIssues.length === 0) {
      console.warn('PortfolioDetailModal - No issues found, hasIssuesByCurrentUser = false', {
        portfolioId,
        userEmail: user.email,
      })
      return false
    }

    // CRITICAL: If portfolio is locked by current user, ONLY check for issues at the locked hour
    // AND created AFTER the lock was created (to ensure they're from this lock session)
    if (isLockedByMe && activeLockForPortfolio) {
      const lockedHour = activeLockForPortfolio.issue_hour
      const lockReservedAt = activeLockForPortfolio.reserved_at ? new Date(activeLockForPortfolio.reserved_at).getTime() : 0

      // Filter issues by current user, the locked hour, AND created after lock was created
      const issuesAtLockedHour = portfolioIssues.filter(issue => {
        let issueMonitoredBy: string | undefined
        if (Array.isArray(issue.monitored_by)) {
          issueMonitoredBy = issue.monitored_by[0] as string | undefined
        } else {
          issueMonitoredBy = issue.monitored_by as string | undefined
        }

        if (!issueMonitoredBy || typeof issueMonitoredBy !== 'string') return false

        const isByCurrentUser = issueMonitoredBy.toLowerCase() === user.email.toLowerCase()
        const isAtLockedHour = issue.issue_hour === lockedHour

        // Check if issue was created after lock was created (to ensure it's from this lock session)
        let isAfterLock = true
        if (lockReservedAt > 0 && issue.created_at) {
          const issueCreatedAt = new Date(issue.created_at).getTime()
          isAfterLock = issueCreatedAt >= lockReservedAt
        }

        return isByCurrentUser && isAtLockedHour && isAfterLock
      })

      console.log('🔒 PortfolioDetailModal - Portfolio is LOCKED by current user, checking issues at locked hour created AFTER lock:', {
        portfolioId,
        userEmail: user.email,
        lockedHour,
        lockReservedAt: activeLockForPortfolio.reserved_at,
        issuesAtLockedHour: issuesAtLockedHour.length,
        totalIssues: portfolioIssues.length,
        issuesAtLockedHourDetails: issuesAtLockedHour.map(i => ({
          id: i.id,
          hour: i.issue_hour,
          created_at: i.created_at,
          monitoredBy: Array.isArray(i.monitored_by) ? i.monitored_by[0] : i.monitored_by
        })),
        allIssuesAtHour: portfolioIssues.filter(i => {
          const monitoredBy = Array.isArray(i.monitored_by) ? i.monitored_by[0] : i.monitored_by
          return monitoredBy?.toLowerCase() === user.email.toLowerCase() && i.issue_hour === lockedHour
        }).map(i => ({ id: i.id, hour: i.issue_hour, created_at: i.created_at })),
      })

      if (issuesAtLockedHour.length === 0) {
        console.warn('❌ PortfolioDetailModal - No issues at locked hour created after lock, hasIssuesByCurrentUser = false')
        return false
      }

      console.log('✅ PortfolioDetailModal - User has issues at locked hour created after lock, hasIssuesByCurrentUser = true')
      return true
    }

    // If portfolio is NOT locked by current user, still require at least one issue
    // But we should check if there's ANY lock first - if locked by someone else, don't allow
    if (activeLockForPortfolio && !isLockedByMe) {
      // Portfolio is locked by someone else - don't allow marking as checked
      console.warn('❌ PortfolioDetailModal - Portfolio locked by someone else, hasIssuesByCurrentUser = false')
      return false
    }

    // Portfolio is not locked - check if user has any issues (any hour)
    const issuesByCurrentUser = portfolioIssues.filter(issue => {
      let issueMonitoredBy: string | undefined
      if (Array.isArray(issue.monitored_by)) {
        issueMonitoredBy = issue.monitored_by[0] as string | undefined
      } else {
        issueMonitoredBy = issue.monitored_by as string | undefined
      }

      if (!issueMonitoredBy || typeof issueMonitoredBy !== 'string') return false

      return issueMonitoredBy.toLowerCase() === user.email.toLowerCase()
    })

    console.log('🔍 PortfolioDetailModal - Portfolio NOT locked by current user, checking for any issues by user:', {
      portfolioId,
      userEmail: user.email,
      totalIssues: portfolioIssues.length,
      issuesByCurrentUser: issuesByCurrentUser.length,
      isLockedByMe,
      activeLockForPortfolio: activeLockForPortfolio ? { hour: activeLockForPortfolio.issue_hour, monitoredBy: activeLockForPortfolio.monitored_by } : null,
      workingHour,
    })

    if (issuesByCurrentUser.length === 0) {
      console.warn('❌ PortfolioDetailModal - No issues by current user, hasIssuesByCurrentUser = false')
      return false
    }

    console.log('✅ PortfolioDetailModal - User has issues, hasIssuesByCurrentUser = true')
    return true
  }, [portfolioIssues, user?.email, isLockedByMe, activeLockForPortfolio, workingHour, portfolioId])

  // Update all sites checked status
  const updateMutation = useMutation({
    mutationFn: (data: { allSitesChecked: 'Yes' | 'No'; sitesCheckedDetails?: string }) => {
      // Double-check: Prevent API call if user hasn't entered any issues
      if (!hasIssuesByCurrentUser) {
        console.error('PortfolioDetailModal - Attempted to save without issues!', {
          portfolioId,
          userEmail: user?.email,
          hasIssuesByCurrentUser,
        })
        throw new Error('Please log at least one issue before marking sites as checked.')
      }

      const now = new Date()
      // Use the hour from any active lock for this portfolio if available, otherwise use current hour
      // This ensures we save the hour the user was actually working on (e.g., hour 5)
      const hourToSave = activeLockForPortfolio?.issue_hour !== undefined && activeLockForPortfolio?.issue_hour !== null
        ? activeLockForPortfolio.issue_hour
        : now.getHours()

      console.log('Saving all_sites_checked with hour:', hourToSave, 'from activeLock:', activeLockForPortfolio?.issue_hour, 'current hour:', now.getHours())

      return portfolioService.updateAllSitesChecked(portfolioId, {
        allSitesChecked: data.allSitesChecked,
        hour: hourToSave, // Use lock hour or current hour
        date: now.toISOString().split('T')[0], // Date only (YYYY-MM-DD) since column is DATE type
        checkedBy: user?.id || '', // Use user ID (UUID) - required for database
        notes: data.sitesCheckedDetails,
      })
    },
    onSuccess: async (_, variables) => {
      if (variables.allSitesChecked === 'Yes') {
        toast.success('Portfolio status updated and unlocked successfully')
      } else {
        toast.success('Portfolio status updated successfully')
      }

      // Invalidate and refetch all related queries to update UI
      queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
      queryClient.invalidateQueries({ queryKey: ['locks'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      queryClient.invalidateQueries({ queryKey: ['admin-logs'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })

      // Force refetch to immediately update the UI
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['portfolio-locks'] }),
        queryClient.refetchQueries({ queryKey: ['locks'] }),
        queryClient.refetchQueries({ queryKey: ['portfolio-activity'] }),
        queryClient.refetchQueries({ queryKey: ['admin-logs'] }),
      ])

      setAllSitesChecked(null)
      setSitesCheckedDetails('')
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.error || 'Failed to update portfolio status'
      toast.error(errorMessage)
      // If error is about no issues, also show a more detailed message
      if (errorMessage.includes('issue')) {
        console.error('PortfolioDetailModal - Error saving without issues:', error)
      }
    },
  })

  // Unlock portfolio mutation
  const unlockMutation = useMutation({
    mutationFn: () => {
      if (!portfolioId) return Promise.resolve()
      return portfolioService.unlock(portfolioId, unlockReason || 'User unlocked without reason')
    },
    onSuccess: async () => {
      // Immediately invalidate and refetch to update UI instantly
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
      queryClient.invalidateQueries({ queryKey: ['locks'] })
      queryClient.invalidateQueries({ queryKey: ['admin-logs'] }) // Invalidate admin logs on success

      // Force immediate refetch to update UI without waiting for next interval
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['portfolio-locks'] }),
        queryClient.refetchQueries({ queryKey: ['locks'] }),
        queryClient.refetchQueries({ queryKey: ['portfolio-activity'] }),
        queryClient.refetchQueries({ queryKey: ['admin-logs'] }), // Refetch admin logs
      ])

      toast.success('Portfolio unlocked')
      setUnlockReason('')
      setShowUnlockSection(false)
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to unlock portfolio'

      // If portfolio is already unlocked, show a more user-friendly message
      if (errorMessage.includes('not currently locked') || errorMessage.includes('not locked')) {
        toast.error('Portfolio is already unlocked')
      } else if (errorMessage.includes('Only the user who locked')) {
        toast.error('Only the user who locked this portfolio can unlock it')
      } else {
        toast.error(errorMessage)
      }

      console.error('Error unlocking portfolio:', error)
    }
  })

  // Reset form when modal opens/closes or portfolio changes
  useEffect(() => {
    if (isOpen && portfolio) {
      // Convert 'Pending' to null, only allow 'Yes' or 'No'
      const checkedStatus = portfolio.all_sites_checked === 'Pending'
        ? null
        : (portfolio.all_sites_checked === 'Yes' || portfolio.all_sites_checked === 'No'
          ? portfolio.all_sites_checked
          : null)
      setAllSitesChecked(checkedStatus)
      setSitesCheckedDetails(portfolio.sites_checked_details || '')
    } else {
      setAllSitesChecked(null)
      setSitesCheckedDetails('')
    }
  }, [isOpen, portfolio])

  const handleAllSitesChecked = (value: 'Yes' | 'No') => {
    // CRITICAL: Prevent selection if current user hasn't entered any issues
    // This check must happen FIRST before any state changes
    if (!hasIssuesByCurrentUser) {
      console.error('PortfolioDetailModal - Blocked attempt to mark sites checked without issues:', {
        portfolioId,
        userEmail: user?.email,
        hasIssuesByCurrentUser,
        totalIssues: portfolioIssues.length,
        isLockedByMe,
        workingHour,
      })
      toast.error('Please log at least one issue before marking sites as checked.')
      return
    }

    // Additional safety check - verify user email exists
    if (!user?.email) {
      console.error('PortfolioDetailModal - No user email found')
      toast.error('User not authenticated. Please refresh the page.')
      return
    }

    setAllSitesChecked(value)
    // Auto-save when "Yes" is selected
    if (value === 'Yes') {
      updateMutation.mutate({
        allSitesChecked: 'Yes',
        sitesCheckedDetails: sitesCheckedDetails || undefined,
      })
    }
  }

  const handleSaveSitesChecked = () => {
    if (allSitesChecked) {
      updateMutation.mutate({
        allSitesChecked,
        sitesCheckedDetails: sitesCheckedDetails || undefined,
      })
    }
  }

  const handleViewIssues = () => {
    onClose()
    const currentHour = new Date().getHours()
    navigate(`/issues?portfolio=${portfolioId}&hour=${currentHour}`)
  }

  const handleLogNewIssue = () => {
    // Only allow logging if locked by current user or not locked at all
    // Use the robustly detected activeLockForPortfolio
    if (activeLockForPortfolio && activeLockForPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase()) {
      toast.error(`This portfolio is locked by ${activeLockForPortfolio.monitored_by?.split('@')[0] || 'another user'}. Only they can log issues.`)
      return
    }

    if (onLogIssue) {
      onLogIssue(portfolioId, workingHour)
      onClose()
    } else {
      onClose()
      navigate(`/issues?action=log&portfolio=${portfolioId}`)
    }
  }

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    )
  }

  if (!portfolio) return null

  const displayName = portfolio.site_range
    ? `${portfolio.name} (${portfolio.site_range})`
    : portfolio.name

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={displayName} size="sm">
      <div className="space-y-4">
        {/* All Sites Checked Question */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-base font-semibold text-gray-900">
              All sites checked?
            </label>
            {allSitesChecked && (
              <span className="text-sm text-gray-500 font-normal">({allSitesChecked})</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Confirm after you verify every site belonging to this portfolio.
          </p>
          {!hasIssuesByCurrentUser && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ BLOCKED:</strong> You must log at least one issue before you can mark sites as checked.
                {isLockedByMe && activeLockForPortfolio && (
                  <span className="block mt-1 font-bold">You need to log an issue for hour {workingHour}:00.</span>
                )}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!hasIssuesByCurrentUser) {
                  toast.error('Please log at least one issue before marking sites as checked.')
                  return
                }
                handleAllSitesChecked('Yes')
              }}
              disabled={!hasIssuesByCurrentUser}
              className={`flex-1 px-5 py-3 rounded-lg font-medium transition-colors border-2 ${!hasIssuesByCurrentUser
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                : allSitesChecked === 'Yes'
                  ? 'bg-white border-gray-300 text-gray-900'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              aria-disabled={!hasIssuesByCurrentUser}
            >
              Yes
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!hasIssuesByCurrentUser) {
                  toast.error('Please log at least one issue before marking sites as checked.')
                  return
                }
                handleAllSitesChecked('No')
              }}
              disabled={!hasIssuesByCurrentUser}
              className={`flex-1 px-5 py-3 rounded-lg font-medium transition-colors border-2 ${!hasIssuesByCurrentUser
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                : allSitesChecked === 'No'
                  ? 'bg-yellow-400 border-yellow-500 text-gray-900'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              aria-disabled={!hasIssuesByCurrentUser}
            >
              No
            </button>
          </div>
        </div>

        {/* Sites Checked Details */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Which sites have you checked? (e.g., "Site 1 to Site 5", "Sites 1-10")
          </label>
          <input
            type="text"
            value={sitesCheckedDetails}
            onChange={(e) => {
              setSitesCheckedDetails(e.target.value)
              // Auto-save if "Yes" is already selected and user is typing details
              if (allSitesChecked === 'Yes' && e.target.value.trim()) {
                // Debounce the save to avoid too many API calls
                const timeoutId = setTimeout(() => {
                  updateMutation.mutate({
                    allSitesChecked: 'Yes',
                    sitesCheckedDetails: e.target.value.trim() || undefined,
                  })
                }, 1000)
                return () => clearTimeout(timeoutId)
              }
            }}
            placeholder="Enter sites checked (e.g., Site 1 to Site 5)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-4">What would you like to do?</p>

          {/* View Issues Button */}
          <button
            onClick={handleViewIssues}
            className="w-full flex items-center justify-between px-5 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div className="text-left">
                <div className="font-semibold text-base">View Issues</div>
                <div className="text-sm text-blue-100 mt-0.5">See all logged issues for this portfolio</div>
              </div>
            </div>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Log New Issue Button */}
          <button
            onClick={handleLogNewIssue}
            disabled={!!(isLockedByAnyone && !isLockedByMe) || hasOtherLock}
            className={`w-full flex items-center justify-between px-5 py-3 rounded-lg transition-colors shadow-sm ${(isLockedByAnyone && !isLockedByMe) || hasOtherLock
              ? 'bg-gray-400 cursor-not-allowed opacity-60'
              : ''
              }`}
            style={(isLockedByAnyone && !isLockedByMe) || hasOtherLock ? {} : { backgroundColor: '#76ab3f', color: 'white' }}
            onMouseEnter={(e) => {
              if (!((isLockedByAnyone && !isLockedByMe) || hasOtherLock)) {
                e.currentTarget.style.opacity = '0.9'
              }
            }}
            onMouseLeave={(e) => {
              if (!((isLockedByAnyone && !isLockedByMe) || hasOtherLock)) {
                e.currentTarget.style.opacity = '1'
              }
            }}
          >
            <div className="flex items-center gap-3 text-left">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base truncate">
                  {hasOtherLock
                    ? `Finish "${userOtherLock?.portfolio?.name || 'other lock'}"${userOtherLock?.tenant?.name ? ` in "${userOtherLock.tenant.name}"` : ''} (Hour ${userOtherLock?.issue_hour}) first`
                    : isLockedByAnyone && !isLockedByMe
                      ? `Locked by ${lockInfo?.monitored_by?.split('@')[0] || 'another user'}`
                      : 'Log New Issue'}
                </div>
                <div className="text-sm truncate" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {hasOtherLock
                    ? `Close your current lock before starting a new one.`
                    : isLockedByAnyone && !isLockedByMe
                      ? 'Only the user who locked it can log issues'
                      : 'Report a new issue for this portfolio'}
                </div>
              </div>
            </div>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Unlock Section - Only show if portfolio is locked by current user */}
        {isLockedByMe && (
          <div className="pt-4 border-t border-gray-200">
            {!showUnlockSection ? (
              <button
                onClick={() => setShowUnlockSection(true)}
                className="w-full px-5 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-sm"
              >
                UNLOCK
              </button>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Why are you unlocking? What have you checked so far?
                </label>
                <textarea
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Enter reason for unlocking..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowUnlockSection(false)
                      setUnlockReason('')
                    }}
                    className="flex-1 px-5 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!unlockReason.trim()) {
                        toast.error('Please enter why you are unlocking.')
                        return
                      }
                      unlockMutation.mutate()
                    }}
                    disabled={unlockMutation.isPending}
                    className="flex-1 px-5 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {unlockMutation.isPending ? 'Unlocking...' : 'UNLOCK'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default PortfolioDetailModal


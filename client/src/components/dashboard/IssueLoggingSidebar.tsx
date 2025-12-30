import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { issueService } from '../../services/issueService'
import { CreateIssueData } from '../../types/issue.types'
import { portfolioService } from '../../services/portfolioService'
import { adminService, PortfolioLock } from '../../services/adminService'
import { useAuth } from '../../context/AuthContext'
import { Portfolio } from '../../types/portfolio.types'
import { Issue } from '../../types/issue.types'
import { User } from '../../types/user.types'
import toast from 'react-hot-toast'
import Button from '../common/Button'

interface IssueLoggingSidebarProps {
  isOpen: boolean
  onClose: () => void
  portfolioId: string | null
  hour: number | undefined
}

const IssueLoggingSidebar: React.FC<IssueLoggingSidebarProps> = ({
  isOpen,
  onClose,
  portfolioId,
  hour,
}) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [issuePresent, setIssuePresent] = useState<string>('')
  const [caseNumber, setCaseNumber] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [missedAlertsBy, setMissedAlertsBy] = useState<string>('')

  // Fetch portfolio details
  const { data: portfolio } = useQuery<Portfolio>({
    queryKey: ['portfolio', portfolioId],
    queryFn: () => portfolioService.getById(portfolioId!),
    enabled: isOpen && !!portfolioId,
  })

  // Fetch users for dropdowns
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  })

  // Fetch locks to get who has the lock for this portfolio
  const { data: locks = [], isLoading: locksLoading } = useQuery<PortfolioLock[]>({
    queryKey: ['portfolio-locks'],
    queryFn: adminService.getLocks,
    refetchInterval: 3000, // Refresh every 3 seconds (reduced from 1s to prevent page freeze)
    staleTime: 2000, // Consider data fresh for 2 seconds
  })

  // Fetch issues for this portfolio and hour
  const currentHour = hour !== undefined && hour !== null ? hour : new Date().getHours()
  const { data: issues = [] } = useQuery<Issue[]>({
    queryKey: ['issues', portfolioId, currentHour],
    queryFn: () => issueService.getAll({ portfolio_id: portfolioId!, issue_hour: currentHour }),
    enabled: isOpen && !!portfolioId,
  })

  // Get the lock info for this portfolio and hour to determine who should be monitored_by
  const lockForThisPortfolio: PortfolioLock | undefined = useMemo(() => {
    if (!isOpen || !portfolioId) return undefined
    return (locks || []).find(
      (lock) =>
        String(lock.portfolio_id || '').trim().toLowerCase() === String(portfolioId).trim().toLowerCase() &&
        Number(lock.issue_hour) === currentHour
    )
  }, [isOpen, portfolioId, locks, currentHour])

  // Lock portfolio when sidebar opens
  const lockMutation = useMutation({
    mutationFn: () => {
      if (!portfolioId) {
        console.error('❌ Lock mutation - Missing portfolioId', { portfolioId })
        return Promise.reject(new Error('Portfolio ID is required'))
      }
      const currentHour = hour !== undefined && hour !== null ? hour : new Date().getHours()
      if (currentHour < 0 || currentHour > 23) {
        console.error('❌ Lock mutation - Invalid hour', { hour: currentHour })
        return Promise.reject(new Error('Valid hour (0-23) is required'))
      }
      console.log('🔒 Lock mutation - Calling portfolioService.lock', {
        portfolioId,
        currentHour,
        userEmail: user?.email,
      })
      return portfolioService.lock(portfolioId, currentHour)
    },
    onSuccess: async (data) => {
      console.log('✅ Lock mutation - SUCCESS', {
        responseData: data,
        portfolioId,
        hour,
      })

      // Immediately invalidate all related queries
      console.log('🔄 Lock mutation - Invalidating queries...')
      await queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      await queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
      await queryClient.invalidateQueries({ queryKey: ['locks'] })

      // Force immediate refetch for active queries
      console.log('🔄 Lock mutation - Refetching queries...')
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ['portfolio-locks'],
        }),
        queryClient.refetchQueries({
          queryKey: ['locks'],
        }),
        queryClient.refetchQueries({
          queryKey: ['portfolio-activity'],
        }),
      ])

      // Also manually trigger a refetch after a short delay to ensure UI updates
      setTimeout(async () => {
        console.log('🔄 Lock mutation - Delayed refetch after 500ms...')
        await queryClient.refetchQueries({ queryKey: ['portfolio-locks'] })
        console.log('✅ Lock mutation - Delayed refetch completed')
      }, 500)

      console.log('✅ Lock mutation - All queries updated, showing success toast')
      toast.success('Portfolio locked successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to lock portfolio'

      console.error('❌ Lock mutation - ERROR', {
        message: errorMessage,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        portfolioId,
        hour,
      })

      // Check if error is about a stale lock (portfolio not found)
      if (errorMessage.includes('not found in database')) {
        // Stale lock detected - show helpful message and suggest going to Active Locks
        toast.error('Found a stale lock for a deleted portfolio. Please go to Admin Panel → Active Locks to clean it up, or try again in a moment.', {
          duration: 6000
        })
      } else {
        toast.error(errorMessage)
      }
    },
  })

  // Create issue mutation
  const createMutation = useMutation({
    mutationFn: issueService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', portfolioId, hour] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      toast.success('Issue logged successfully')
      // Reset form
      setIssuePresent('')
      setCaseNumber('')
      setIssueDescription('')
      setMissedAlertsBy('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to log issue')
    },
  })

  // Lock portfolio when sidebar opens - don't wait for locks to load
  useEffect(() => {
    console.log('🔒 IssueLoggingSidebar - useEffect triggered:', {
      isOpen,
      portfolioId,
      userEmail: user?.email,
      hour,
      locksLoading,
      locksCount: locks.length,
      lockMutationPending: lockMutation.isPending,
    })

    if (isOpen && portfolioId && user?.email) {
      // SKIP AUTO-LOCK FOR SUPER ADMIN
      if (user.role === 'super_admin') {
        console.log('🛡️ IssueLoggingSidebar - Super Admin viewing only (auto-lock skipped)')
        return
      }

      const currentHour = hour !== undefined && hour !== null ? hour : new Date().getHours()
      console.log('🔒 IssueLoggingSidebar - Conditions met, checking locks...', {
        currentHour,
        locksLoading,
        locksCount: locks.length,
      })

      // Only check existing locks if they've loaded, but don't wait for them
      if (!locksLoading && locks.length > 0) {
        console.log('🔒 IssueLoggingSidebar - Locks loaded, checking for existing lock...', {
          locks: locks.map(l => ({
            portfolio_id: l.portfolio_id,
            hour: l.issue_hour,
            monitored_by: l.monitored_by,
          })),
        })

        // Check if portfolio is already locked by current user for this hour
        const existingLockForThisPortfolio = locks.find(
          (lock) =>
            String(lock.portfolio_id || '').trim().toLowerCase() === String(portfolioId).trim().toLowerCase() &&
            Number(lock.issue_hour) === currentHour &&
            lock.monitored_by?.toLowerCase() === user.email.toLowerCase()
        )

        if (existingLockForThisPortfolio) {
          console.log('✅ IssueLoggingSidebar - Portfolio already locked by current user, skipping lock')
          // Already locked by current user - no need to lock again
          return
        }

        // Check if portfolio is locked by someone else for this hour
        const lockBySomeoneElse = locks.find(
          (lock) =>
            String(lock.portfolio_id || '').trim().toLowerCase() === String(portfolioId).trim().toLowerCase() &&
            Number(lock.issue_hour) === currentHour &&
            lock.monitored_by?.toLowerCase() !== user.email.toLowerCase()
        )

        if (lockBySomeoneElse) {
          console.log('⚠️ IssueLoggingSidebar - Portfolio locked by someone else:', lockBySomeoneElse.monitored_by)
          // Portfolio is locked by someone else - show error but still try (server will handle it)
          const otherUserEmail = lockBySomeoneElse.monitored_by
          const otherUserName = users.find(u => u.email === otherUserEmail)?.full_name || otherUserEmail?.split('@')[0] || 'another user'
          toast.error(`This portfolio is locked by ${otherUserName} for hour ${currentHour}. Only they can log issues.`, {
            duration: 5000
          })
          // Don't proceed with lock if someone else has it
          return
        }
      }

      // Lock the portfolio with the current hour immediately when sidebar opens
      // Server will handle validation and return proper error if user has another lock
      if (currentHour >= 0 && currentHour <= 23) {
        // Only lock if mutation is not already pending
        if (!lockMutation.isPending) {
          console.log('🔒 IssueLoggingSidebar - Calling lockMutation.mutate()', {
            portfolioId,
            currentHour,
            userEmail: user.email,
          })
          lockMutation.mutate()
        } else {
          console.log('⏳ IssueLoggingSidebar - Lock mutation already pending, skipping')
        }
      } else {
        console.error('❌ IssueLoggingSidebar - Invalid hour:', currentHour)
        toast.error('Invalid hour value. Please try again.')
      }
    } else {
      console.log('⏸️ IssueLoggingSidebar - Conditions not met, not locking:', {
        isOpen,
        hasPortfolioId: !!portfolioId,
        hasUserEmail: !!user?.email,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, portfolioId, hour, user?.email])

  // Close sidebar without unlocking (lock stays until user unlocks or marks all sites checked)
  const handleClose = () => {
    onClose()
  }

  const handleAddIssue = () => {
    // Validation
    if (!portfolioId) {
      toast.error('Portfolio is required')
      return
    }

    if (!issuePresent || (issuePresent !== 'yes' && issuePresent !== 'no')) {
      toast.error('Please select "Yes" or "No" for Issue Present')
      return
    }

    if (issuePresent === 'yes' && (!issueDescription.trim() || issueDescription === 'No issue')) {
      toast.error('Please provide issue details when issue is present')
      return
    }

    // Determine monitored_by: use lock's monitored_by if portfolio is locked, otherwise use current user
    // This ensures issues are created with the same monitored_by as the lock (matching the tooltip)
    // Always fallback to current user if lock is not found
    const monitoredByEmail = (lockForThisPortfolio?.monitored_by && lockForThisPortfolio.monitored_by.trim())
      ? lockForThisPortfolio.monitored_by
      : (user?.email || '')

    if (!monitoredByEmail) {
      toast.error('Unable to determine who is monitoring this portfolio. Please refresh and try again.')
      return
    }

    // Prepare issue data - map to database schema
    // Map to database schema - monitored_by is VARCHAR(255) (string), missed_by is TEXT[] (array)
    const issueData: any = {
      portfolio_id: portfolioId,
      site_name: '',
      issue_hour: currentHour,
      description: issuePresent === 'no' ? 'No issue' : issueDescription.trim(),
      severity: (issuePresent === 'yes' ? 'high' : 'low').toLowerCase(), // Database uses lowercase
      status: 'open',
      monitored_by: monitoredByEmail, // Use lock's monitored_by if locked, otherwise current user
      missed_by: (issuePresent === 'yes' && missedAlertsBy) ? [missedAlertsBy] : null, // Array for missed_by, null if empty
      notes: caseNumber ? `Case #: ${caseNumber}` : null,
    }

    // Remove null/undefined fields
    Object.keys(issueData).forEach(key => {
      if (issueData[key] === null || issueData[key] === undefined) {
        delete issueData[key]
      }
    })

    createMutation.mutate(issueData)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM'
    const displayHour = date.getHours() % 12 || 12
    return `${month}/${day}/${year}, ${displayHour}:${minutes}:${seconds} ${ampm}`
  }

  if (!isOpen || !portfolioId) return null

  const displayName = portfolio?.site_range
    ? `${portfolio.name} (${portfolio.site_range})`
    : portfolio?.name || 'Loading...'

  // Get monitored_by name: use lock's monitored_by if locked, otherwise current user
  const monitoredByEmail = (lockForThisPortfolio?.monitored_by && lockForThisPortfolio.monitored_by.trim())
    ? lockForThisPortfolio.monitored_by
    : (user?.email || '')
  const monitoredByUser = monitoredByEmail ? users.find(u => u.email === monitoredByEmail) : null
  const monitoredByName = monitoredByUser?.full_name || monitoredByUser?.email?.split('@')[0] || (monitoredByEmail ? monitoredByEmail.split('@')[0] : 'Unknown')

  return (
    <div className="sticky top-[120px] h-[calc(100vh-140px)] w-full bg-white shadow-xl flex flex-col border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {displayName} - Hour {hour}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600">Monitored by {monitoredByName}</p>

        {/* Lock Status Indicator */}
        <div className="mt-3 flex items-center gap-2">
          {user?.role === 'super_admin' ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              👀 SUPER ADMIN VIEW
            </span>
          ) : lockMutation.isPending ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full animate-pulse">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              SECURING LOCK...
            </span>
          ) : lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() === user?.email?.toLowerCase() ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              🔒 LICENSED MONITORING (LOCKED BY YOU)
            </span>
          ) : lockForThisPortfolio ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              🚩 LOCKED BY {monitoredByName.toUpperCase()}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              ⚠️ VIEW ONLY (NOT LOCKED)
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Quick Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            Use this panel to log all issues for this portfolio and hour in one place. Each row below is a sub-issue that auto-saves when you click Add.
          </p>
        </div>

        {/* Add Issue Form */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Add issue for this hour:</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Issue Present</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIssuePresent('yes')
                  if (issueDescription === 'No issue') {
                    setIssueDescription('')
                  }
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${issuePresent === 'yes'
                  ? 'bg-red-100 text-red-800 border-2 border-red-300'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIssuePresent('no')
                  setIssueDescription('No issue')
                  setMissedAlertsBy('') // Clear missed alerts when No is selected
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${issuePresent === 'no'
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                No
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Case #</label>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="Case number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Issue Description</label>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder={issuePresent === '' ? "Select issue present first" : issuePresent === 'no' ? "No issue" : "Describe the problem..."}
              disabled={issuePresent === 'no'}
              rows={4}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${issuePresent === 'no' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Issues Missed By (optional)</label>
            <select
              value={missedAlertsBy}
              onChange={(e) => setMissedAlertsBy(e.target.value)}
              disabled={issuePresent === 'no' || issuePresent === ''}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${issuePresent === 'no' || issuePresent === '' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
            >
              <option value="">Select</option>
              {users
                .filter(u => u.is_active)
                .map((u) => {
                  const username = u.email.split('@')[0]
                  return (
                    <option key={u.id} value={u.email}>
                      {username} ({u.full_name})
                    </option>
                  )
                })}
            </select>
          </div>

          <Button
            onClick={handleAddIssue}
            disabled={createMutation.isPending || !issueDescription.trim() || (lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase())}
            className="w-full"
            style={{ backgroundColor: (lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase()) ? '#9ca3af' : '#76ab3f' }}
          >
            {createMutation.isPending ? 'Adding...' : (lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase()) ? 'Locked by another user' : 'Add Issue'}
          </Button>

          {lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase() && (
            <p className="text-[10px] text-center text-red-600 font-medium">
              You cannot log issues because this portfolio is locked by {monitoredByName}.
            </p>
          )}
        </div>

        {/* Existing Issues */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900">Issues for this hour ({issues.length}):</h4>
          {issues.length === 0 ? (
            <div className="text-sm text-gray-500 py-4 text-center">No issues logged yet</div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {issue.description ? (
                        <p className="text-sm text-gray-900 mb-1">{issue.description}</p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No issue</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {issue.monitored_by && issue.monitored_by.length > 0 ? (
                          <>
                            <span>•</span>
                            <span>{issue.monitored_by[0]?.split('@')[0] || 'Unknown'}</span>
                          </>
                        ) : null}
                        {issue.created_at && (
                          <>
                            <span>•</span>
                            <span>{formatDateTime(issue.created_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <Button
          onClick={handleClose}
          variant="secondary"
          className="w-full"
        >
          Close
        </Button>
      </div>
    </div>
  )
}

export default IssueLoggingSidebar


import React, { useState, useEffect, useMemo, useRef } from 'react'
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
import SidebarHeader from './sidebar/SidebarHeader'
import IssueForm from './sidebar/IssueForm'
import SitesChecked from './sidebar/SitesChecked'
import IssueList from './sidebar/IssueList'

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
  const [allSitesChecked, setAllSitesChecked] = useState<'Yes' | 'No' | null>(null)
  const [sitesCheckedDetails, setSitesCheckedDetails] = useState('')

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

  // Refs to track previous values for auto-save
  const prevPortfolioIdRef = useRef<string | null>(portfolioId)
  const prevHourRef = useRef<number | undefined>(hour)
  const currentFormStateRef = useRef({
    issuePresent,
    issueDescription,
    caseNumber,
    missedAlertsBy,
    portfolioId,
    hour,
    monitoredBy: (lockForThisPortfolio?.monitored_by && lockForThisPortfolio.monitored_by.trim())
      ? lockForThisPortfolio.monitored_by
      : (user?.email || '')
  })

  // Update form state ref on every change
  useEffect(() => {
    currentFormStateRef.current = {
      issuePresent,
      issueDescription,
      caseNumber,
      missedAlertsBy,
      portfolioId,
      hour,
      monitoredBy: (lockForThisPortfolio?.monitored_by && lockForThisPortfolio.monitored_by.trim())
        ? lockForThisPortfolio.monitored_by
        : (user?.email || '')
    }
  }, [issuePresent, issueDescription, caseNumber, missedAlertsBy, portfolioId, hour, lockForThisPortfolio, user?.email])


  // Check if at least one issue at this hour was logged by current user
  const hasIssuesAtThisHour = useMemo(() => {
    if (!user?.email || issues.length === 0) return false

    return issues.some(issue => {
      let issueMonitoredBy: string | undefined
      if (Array.isArray(issue.monitored_by)) {
        issueMonitoredBy = issue.monitored_by[0] as string | undefined
      } else {
        issueMonitoredBy = issue.monitored_by as string | undefined
      }
      return issueMonitoredBy?.toLowerCase() === user.email.toLowerCase()
    })
  }, [issues, user?.email])

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
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
      queryClient.invalidateQueries({ queryKey: ['locks'] })

      // Force immediate refetch for active queries - don't await, fire and forget for speed
      console.log('🔄 Lock mutation - Refetching queries...')
      queryClient.refetchQueries({
        queryKey: ['portfolio-locks'],
        type: 'active', // Only refetch active queries
      })
      queryClient.refetchQueries({
        queryKey: ['locks'],
        type: 'active',
      })
      queryClient.refetchQueries({
        queryKey: ['portfolio-activity'],
        type: 'active',
      })

      // Also manually trigger multiple refetches with delays to ensure UI updates
      setTimeout(() => {
        console.log('🔄 Lock mutation - Delayed refetch after 200ms...')
        queryClient.refetchQueries({ queryKey: ['portfolio-locks'], type: 'active' })
      }, 200)
      
      setTimeout(() => {
        console.log('🔄 Lock mutation - Delayed refetch after 500ms...')
        queryClient.refetchQueries({ queryKey: ['portfolio-locks'], type: 'active' })
      }, 500)
      
      setTimeout(() => {
        console.log('🔄 Lock mutation - Delayed refetch after 1000ms...')
        queryClient.refetchQueries({ queryKey: ['portfolio-locks'], type: 'active' })
        console.log('✅ Lock mutation - All delayed refetches completed')
      }, 1000)

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

  // Update all sites checked status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: { allSitesChecked: 'Yes' | 'No'; sitesCheckedDetails?: string }) => {
      if (!hasIssuesAtThisHour) {
        throw new Error('Please log at least one issue before marking sites as checked.')
      }

      const now = new Date()
      const hourToSave = hour !== undefined && hour !== null ? hour : now.getHours()

      return portfolioService.updateAllSitesChecked(portfolioId!, {
        allSitesChecked: data.allSitesChecked,
        hour: hourToSave,
        date: now.toISOString().split('T')[0],
        checkedBy: user?.id || '',
        notes: data.sitesCheckedDetails,
      })
    },
    onSuccess: async (_, variables) => {
      if (variables.allSitesChecked === 'Yes') {
        toast.success('Portfolio status updated and unlocked successfully')
      } else {
        toast.success('Portfolio status updated successfully')
      }

      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
      queryClient.invalidateQueries({ queryKey: ['locks'] })

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['portfolio-locks'] }),
        queryClient.refetchQueries({ queryKey: ['locks'] }),
        queryClient.refetchQueries({ queryKey: ['portfolio-activity'] }),
      ])
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.error || 'Failed to update portfolio status')
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

  // Sync sites checked state with portfolio data
  useEffect(() => {
    if (isOpen && portfolio) {
      const checkedStatus = portfolio.all_sites_checked === 'Pending'
        ? null
        : (portfolio.all_sites_checked === 'Yes' || portfolio.all_sites_checked === 'No'
          ? portfolio.all_sites_checked
          : null)
      setAllSitesChecked(checkedStatus)
      setSitesCheckedDetails(portfolio.sites_checked_details || '')
    } else if (!isOpen) {
      setAllSitesChecked(null)
      setSitesCheckedDetails('')
    }
  }, [isOpen, portfolio])

  // Trigger auto-save when hour or portfolioId changes
  useEffect(() => {
    // Check if we switched context (different portfolio or different hour)
    const contextChanged = prevPortfolioIdRef.current !== portfolioId || prevHourRef.current !== hour

    if (contextChanged) {
      const stateToSave = currentFormStateRef.current

      // Validation for auto-save: must have something typed and a valid selection
      const hasValidDraft = stateToSave.issuePresent === 'no' ||
        (stateToSave.issuePresent === 'yes' && stateToSave.issueDescription.trim().length > 0 && stateToSave.issueDescription !== 'No issue')

      if (hasValidDraft && stateToSave.portfolioId && stateToSave.hour !== undefined) {
        console.log('💾 Context changed, auto-saving draft...', {
          from: { portfolioId: prevPortfolioIdRef.current, hour: prevHourRef.current },
          to: { portfolioId, hour },
          draft: stateToSave.issueDescription
        })

        const issueData: any = {
          portfolio_id: stateToSave.portfolioId,
          site_name: '',
          issue_hour: stateToSave.hour,
          description: stateToSave.issuePresent === 'no' ? 'No issue' : stateToSave.issueDescription.trim(),
          severity: (stateToSave.issuePresent === 'yes' ? 'high' : 'low').toLowerCase(),
          status: 'open',
          monitored_by: stateToSave.monitoredBy,
          missed_by: (stateToSave.issuePresent === 'yes' && stateToSave.missedAlertsBy) ? [stateToSave.missedAlertsBy] : null,
          notes: stateToSave.caseNumber ? `Case #: ${stateToSave.caseNumber} (Auto-saved)` : 'Auto-saved',
        }

        // Remove nulls/undefined but keep required fields
        Object.keys(issueData).forEach(key => {
          if (issueData[key] === null || issueData[key] === undefined) {
            delete issueData[key]
          }
        })

        // Use a silent version of the mutation (don't show toasts or reset CURRENT form)
        // because the user is already looking at a new hour/portfolio
        issueService.create(issueData).then(() => {
          queryClient.invalidateQueries({ queryKey: ['issues', stateToSave.portfolioId, stateToSave.hour] })
          queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
          console.log('✅ Auto-save successful')
        }).catch(err => {
          console.error('❌ Auto-save failed:', err)
        })
      }

      // Update refs for next change
      prevPortfolioIdRef.current = portfolioId
      prevHourRef.current = hour
    }
  }, [portfolioId, hour, queryClient, user?.tenantId, user?.email])

  // Browser refresh auto-save
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const stateToSave = currentFormStateRef.current
      const hasValidDraft = stateToSave.issuePresent === 'no' ||
        (stateToSave.issuePresent === 'yes' && stateToSave.issueDescription.trim().length > 0 && stateToSave.issueDescription !== 'No issue')

      if (hasValidDraft) {
        // Standard browser dialog
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

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

  const handleAllSitesChecked = (value: 'Yes' | 'No') => {
    if (!hasIssuesAtThisHour) {
      toast.error('Please log at least one issue before marking sites as checked.')
      return
    }

    setAllSitesChecked(value)

    // Always call the update mutation to persist the status
    updateStatusMutation.mutate({
      allSitesChecked: value,
      sitesCheckedDetails: sitesCheckedDetails || undefined,
    })

    // If "No" is selected and we don't have a lock, automatically re-lock
    if (value === 'No' && !lockForThisPortfolio) {
      console.log('🔄 All sites checked set to "No", triggering auto-lock...')
      lockMutation.mutate()
    }
  }

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSitesCheckedDetails(value)

    // Auto-save if "Yes" is already selected and user is typing details (debounced)
    if (allSitesChecked === 'Yes' && value.trim()) {
      const timeoutId = setTimeout(() => {
        updateStatusMutation.mutate({
          allSitesChecked: 'Yes',
          sitesCheckedDetails: value.trim() || undefined,
        })
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
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
      <SidebarHeader
        displayName={displayName}
        hour={hour || 0}
        monitoredByName={monitoredByName}
        user={user}
        lockMutation={lockMutation}
        lockForThisPortfolio={lockForThisPortfolio}
        onClose={handleClose}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Quick Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            Use this panel to log all issues for this portfolio and hour in one place. Each row below is a sub-issue that auto-saves when you click Add.
          </p>
        </div>

        <IssueForm
          issuePresent={issuePresent}
          setIssuePresent={setIssuePresent}
          setIssueDescription={setIssueDescription}
          setMissedAlertsBy={setMissedAlertsBy}
          caseNumber={caseNumber}
          setCaseNumber={setCaseNumber}
          issueDescription={issueDescription}
          missedAlertsBy={missedAlertsBy}
          users={users}
          handleAddIssue={handleAddIssue}
          createMutation={createMutation}
          lockMutation={lockMutation}
          lockForThisPortfolio={lockForThisPortfolio}
          user={user}
          monitoredByName={monitoredByName}
        />

        <SitesChecked
          hasIssuesAtThisHour={hasIssuesAtThisHour || false}
          allSitesChecked={allSitesChecked}
          handleAllSitesChecked={handleAllSitesChecked}
          sitesCheckedDetails={sitesCheckedDetails}
          handleDetailsChange={handleDetailsChange}
        />

        <IssueList
          issues={issues}
          formatDateTime={formatDateTime}
        />
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


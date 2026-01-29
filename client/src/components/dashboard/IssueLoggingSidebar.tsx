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
import { getESTHour, getESTDateString } from '../../utils/timezone'

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
  const [notes, setNotes] = useState('')
  const [allSitesChecked, setAllSitesChecked] = useState<'Yes' | 'No' | null>(null)
  const [sitesCheckedDetails, setSitesCheckedDetails] = useState('')
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null)

  // Fetch portfolio details
  const { data: portfolio } = useQuery<Portfolio>({
    queryKey: ['portfolio', portfolioId],
    queryFn: () => portfolioService.getById(portfolioId!),
    enabled: isOpen && !!portfolioId,
  })

  // AUTO-CLOSE ON HOUR CHANGE
  // Prevents "rolling over" the lock to the next hour if the user leaves the sidebar open
  const [lastCheckedHourSidebar, setLastCheckedHourSidebar] = useState(getESTHour())

  useEffect(() => {
    if (!isOpen) return

    const intervalId = setInterval(() => {
      const currentRealHour = getESTHour()
      if (currentRealHour !== lastCheckedHourSidebar) {
        console.log('⏰ IssueLoggingSidebar - Hour changed from', lastCheckedHourSidebar, 'to', currentRealHour, '- Closing sidebar to prevent accidental lock roll-over')
        setLastCheckedHourSidebar(currentRealHour)
        onClose()
        toast('Hour changed. Closing session for previous hour.', {
          icon: '⏰',
          duration: 5000
        })
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [isOpen, lastCheckedHourSidebar, onClose])

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

  // Fetch issues for this portfolio and hour (use EST timezone)
  const currentHour = hour !== undefined && hour !== null ? hour : getESTHour()
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

  // Refs to track previous values for auto-save and auto-locking
  const lastLockedRef = useRef<{ portfolioId: string; hour: number } | null>(null)
  const prevPortfolioIdRef = useRef<string | null>(portfolioId)
  const prevHourRef = useRef<number | undefined>(hour)
  const currentFormStateRef = useRef({
    issuePresent,
    issueDescription,
    caseNumber,
    notes,
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
      notes,
      missedAlertsBy,
      portfolioId,
      hour,
      monitoredBy: (lockForThisPortfolio?.monitored_by && lockForThisPortfolio.monitored_by.trim())
        ? lockForThisPortfolio.monitored_by
        : (user?.email || '')
    }
  }, [issuePresent, issueDescription, caseNumber, notes, missedAlertsBy, portfolioId, hour, lockForThisPortfolio, user?.email])

  const resetForm = () => {
    setIssuePresent('')
    setCaseNumber('')
    setIssueDescription('')
    setMissedAlertsBy('')
    setNotes('')
    setEditingIssueId(null)
  }

  const handleEditClick = (issue: Issue) => {
    setEditingIssueId(issue.id)
    setIssuePresent(issue.description && issue.description.toLowerCase() !== 'no issue' ? 'yes' : 'no')
    setIssueDescription(issue.description || '')

    // Parse combined notes field
    const rawNotes = issue.notes || ''
    const caseMatch = rawNotes.match(/Case #: ([^\n|]*)/)
    const caseVal = caseMatch ? caseMatch[1].trim() : ''
    // Remove "Case #: ..." and "(Auto-saved)" from the notes
    const cleanNotes = rawNotes
      .replace(/Case #: [^\n|]*/, '')
      .replace(/\(Auto-saved\)/, '')
      .trim()

    setCaseNumber(caseVal)
    setNotes(cleanNotes)

    setMissedAlertsBy(Array.isArray(issue.missed_by) && issue.missed_by.length > 0 ? issue.missed_by[0] : '')

    // Scroll to form
    const formElement = document.getElementById('issue-form-container')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Update issue mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => issueService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', portfolioId, hour] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      toast.success('Issue updated successfully')
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update issue')
    },
  })

  const handleUpdateIssue = () => {
    if (!editingIssueId) return

    // Validation
    if (issuePresent === 'yes' && (!issueDescription.trim() || issueDescription === 'No issue')) {
      toast.error('Please provide issue details when issue is present')
      return
    }

    // Combine Case # and Notes
    let combinedNotes = ''
    if (caseNumber.trim()) combinedNotes += `Case #: ${caseNumber.trim()}`
    if (notes.trim()) {
      combinedNotes += combinedNotes ? ` | ${notes.trim()}` : notes.trim()
    }

    const issueData: any = {
      description: issuePresent === 'no' ? 'No issue' : issueDescription.trim(),
      severity: (issuePresent === 'yes' ? 'high' : 'low').toLowerCase(),
      missed_by: (issuePresent === 'yes' && missedAlertsBy) ? [missedAlertsBy] : null,
      notes: combinedNotes || null,
    }

    updateMutation.mutate({ id: editingIssueId, data: issueData })
  }


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
      const currentHour = hour !== undefined && hour !== null ? hour : getESTHour()
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
    onMutate: async () => {
      const currentHour = hour !== undefined && hour !== null ? hour : getESTHour()

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['portfolio-locks'] })
      await queryClient.cancelQueries({ queryKey: ['locks'] })

      // Snapshot the previous value
      const previousLocks = queryClient.getQueryData(['portfolio-locks'])
      const previousLocksList = queryClient.getQueryData(['locks'])

      // Optimistically update to the new value
      if (portfolioId && user?.email) {
        const optimisticLock = {
          id: 'optimistic-' + Date.now(),
          portfolio_id: portfolioId,
          monitored_by: user.email,
          issue_hour: currentHour,
          reserved_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          // Metadata to help UI distinguish optimistic state if needed
          isOptimistic: true
        }

        queryClient.setQueryData(['portfolio-locks'], (old: any) => {
          return Array.isArray(old) ? [...old, optimisticLock] : [optimisticLock]
        })

        queryClient.setQueryData(['locks'], (old: any) => {
          return Array.isArray(old) ? [...old, optimisticLock] : [optimisticLock]
        })
      }

      // Return a context object with the snapshotted value
      return { previousLocks, previousLocksList }
    },
    onSuccess: async (data) => {
      console.log('✅ Lock mutation - SUCCESS', {
        responseData: data,
        portfolioId,
        hour,
      })

      // Immediately invalidate all related queries - but rely on onSettled for final sync
      queryClient.invalidateQueries({ queryKey: ['locks'] })

      console.log('✅ Lock mutation - Optimistic success confirmed by server')
      toast.success('Portfolio locked successfully')
    },
    onError: (error: any, _variables, context: any) => {
      // Rollback to previous state on error
      if (context?.previousLocks) {
        queryClient.setQueryData(['portfolio-locks'], context.previousLocks)
      }
      if (context?.previousLocksList) {
        queryClient.setQueryData(['locks'], context.previousLocksList)
      }

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
        toast.error('Found a stale lock for a deleted portfolio. Please go to Admin Panel → Active Locks to clean it up.', {
          duration: 6000
        })
      } else {
        toast.error(errorMessage)
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we are in sync with the server
      queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
      queryClient.invalidateQueries({ queryKey: ['locks'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
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

      // Use EST timezone for date and hour
      const hourToSave = hour !== undefined && hour !== null ? hour : getESTHour()
      const dateEST = getESTDateString()

      return portfolioService.updateAllSitesChecked(portfolioId!, {
        allSitesChecked: data.allSitesChecked,
        hour: hourToSave,
        date: dateEST, // Use EST date string
        checkedBy: user?.id || '',
        notes: data.sitesCheckedDetails,
      })
    },
    onSuccess: async (_, variables) => {
      // Auto-unlock if marked as completed
      if (variables.allSitesChecked === 'Yes' && portfolioId) {
        try {
          const hourToUnlock = hour !== undefined && hour !== null ? hour : getESTHour()
          await portfolioService.unlock(portfolioId, hourToUnlock, 'All sites checked completed')
          toast.success('Portfolio status updated and unlocked successfully')
        } catch (error) {
          console.error('Failed to auto-unlock:', error)
          toast.success('Portfolio status updated (unlock failed)')
        }
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

      // CLOSE SIDEBAR ON SUCCESSFUL COMPLETION
      // This prevents "auto-locking" if the user leaves the sidebar open during hour rollovers
      if (variables.allSitesChecked === 'Yes') {
        onClose()
      }
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.error || 'Failed to update portfolio status')
    },
  })

  // Lock portfolio when sidebar opens
  useEffect(() => {
    if (isOpen && portfolioId && user?.email) {
      // SKIP AUTO-LOCK FOR SUPER ADMIN
      if (user.role === 'super_admin') {
        console.log('🛡️ IssueLoggingSidebar - Super Admin viewing only (auto-lock skipped)')
        return
      }

      const currentHour = hour !== undefined && hour !== null ? hour : getESTHour()

      // CRITICAL FIX: Only auto-lock if we haven't locked this specific portfolio+hour combination yet
      // This prevents "auto-locking" when the hour rolls over while the sidebar is open
      if (lastLockedRef.current?.portfolioId === portfolioId && lastLockedRef.current?.hour === currentHour) {
        console.log('✅ IssueLoggingSidebar - Already locked this portfolio+hour combo, skipping redundant lock')
        return
      }

      console.log('🔒 IssueLoggingSidebar - Conditions met, checking locks...', {
        currentHour,
        locksLoading,
        locksCount: locks.length,
      })

      // Only check existing locks if they've loaded, but don't wait for them
      if (!locksLoading && locks.length > 0) {
        // Check if portfolio is already locked by current user for this hour
        const existingLockForThisPortfolio = locks.find(
          (lock) =>
            String(lock.portfolio_id || '').trim().toLowerCase() === String(portfolioId).trim().toLowerCase() &&
            Number(lock.issue_hour) === currentHour &&
            lock.monitored_by?.toLowerCase() === user.email.toLowerCase()
        )

        if (existingLockForThisPortfolio) {
          console.log('✅ IssueLoggingSidebar - Portfolio already locked by current user, skipping lock')
          // Update ref so we don't try again
          lastLockedRef.current = { portfolioId, hour: currentHour }
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
          const otherUserEmail = lockBySomeoneElse.monitored_by
          const otherUserName = users.find(u => u.email === otherUserEmail)?.full_name || otherUserEmail?.split('@')[0] || 'another user'
          toast.error(`This portfolio is locked by ${otherUserName} for hour ${currentHour}. Only they can log issues.`, {
            duration: 5000
          })
          return
        }
      }

      // Lock the portfolio with the current hour immediately when sidebar opens
      if (currentHour >= 0 && currentHour <= 23) {
        // Only lock if mutation is not already pending
        if (!lockMutation.isPending) {
          console.log('🔒 IssueLoggingSidebar - Calling lockMutation.mutate()', {
            portfolioId,
            currentHour,
            userEmail: user.email,
          })
          // Update ref BEFORE calling mutate to avoid race conditions
          lastLockedRef.current = { portfolioId, hour: currentHour }
          lockMutation.mutate()
        } else {
          console.log('⏳ IssueLoggingSidebar - Lock mutation already pending, skipping')
        }
      } else {
        console.error('❌ IssueLoggingSidebar - Invalid hour:', currentHour)
        toast.error('Invalid hour value. Please try again.')
      }
    } else if (!isOpen) {
      // Clear ref when sidebar closes so it can re-lock on next open
      lastLockedRef.current = null
    }
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

    // Determine monitored_by
    const monitoredByEmail = (lockForThisPortfolio?.monitored_by && lockForThisPortfolio.monitored_by.trim())
      ? lockForThisPortfolio.monitored_by
      : (user?.email || '')

    if (!monitoredByEmail) {
      toast.error('Unable to determine who is monitoring this portfolio. Please refresh and try again.')
      return
    }

    // Combine Case # and Notes
    let combinedNotes = ''
    if (caseNumber.trim()) combinedNotes += `Case #: ${caseNumber.trim()}`
    if (notes.trim()) {
      combinedNotes += combinedNotes ? ` | ${notes.trim()}` : notes.trim()
    }

    // Prepare issue data
    const issueData: any = {
      portfolio_id: portfolioId,
      site_name: '',
      issue_hour: currentHour,
      description: issuePresent === 'no' ? 'No issue' : issueDescription.trim(),
      severity: (issuePresent === 'yes' ? 'high' : 'low').toLowerCase(),
      status: 'open',
      monitored_by: monitoredByEmail,
      missed_by: (issuePresent === 'yes' && missedAlertsBy) ? [missedAlertsBy] : null,
      notes: combinedNotes || null,
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
          notes={notes}
          setNotes={setNotes}
          missedAlertsBy={missedAlertsBy}
          users={users}
          handleAddIssue={handleAddIssue}
          handleUpdateIssue={handleUpdateIssue}
          onCancelEdit={resetForm}
          editingIssueId={editingIssueId}
          createMutation={createMutation}
          updateMutation={updateMutation}
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
          onEditClick={handleEditClick}
          editingIssueId={editingIssueId}
          currentUserEmail={user?.email}
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


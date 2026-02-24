import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { issueService } from '../../services/issueService'
import { portfolioService } from '../../services/portfolioService'
import { adminService } from '../../services/adminService'
import { Issue } from '../../types/issue.types'
import { Portfolio } from '../../types/portfolio.types'
import { User } from '../../types/user.types'
import { useAuth } from '../../context/AuthContext'
import Card from '../common/Card'
import Button from '../common/Button'
import { getESTHour, getESTDateString, getESTRelativeDateString, formatESTDateISO } from '../../utils/timezone'
import Spinner from '../common/Spinner'

interface UserHourData {
    completionsCount: number
    issues: Issue[]
    activeIssues: Issue[]
    portfolios: string[]
}

const MyCoverageMatrix: React.FC = () => {
    const { user: currentUser } = useAuth()
    const [fromDate, setFromDate] = useState(() => getESTDateString())
    const [toDate, setToDate] = useState(() => getESTDateString())

    // Fetch portfolios
    const { data: portfolios = [] } = useQuery<Portfolio[]>({
        queryKey: ['portfolios'],
        queryFn: portfolioService.getAll,
    })

    // Fetch users to map user IDs to emails
    const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
        queryKey: ['admin-users'],
        queryFn: adminService.getUsers,
    })

    // Fetch admin logs
    const { data: adminLogs = [] } = useQuery<any[]>({
        queryKey: ['admin-logs'],
        queryFn: adminService.getLogs,
    })

    // Filter issues by date range and current user
    const { data: allIssues = [], isLoading: issuesLoading } = useQuery<Issue[]>({
        queryKey: ['issues', fromDate, toDate],
        queryFn: () => issueService.getAll({}),
    })

    const handleQuickRange = (range: 'today' | 'yesterday' | 'week' | 'month') => {
        const todayStr = getESTDateString()

        if (range === 'today') {
            setFromDate(todayStr)
            setToDate(todayStr)
        } else if (range === 'yesterday') {
            const yesterdayStr = getESTRelativeDateString(-1)
            setFromDate(yesterdayStr)
            setToDate(yesterdayStr)
        } else if (range === 'week') {
            const weekAgoStr = getESTRelativeDateString(-7)
            setFromDate(weekAgoStr)
            setToDate(todayStr)
        } else if (range === 'month') {
            const monthAgoStr = getESTRelativeDateString(-30)
            setFromDate(monthAgoStr)
            setToDate(todayStr)
        }
    }

    const matrixData = useMemo(() => {
        if (usersLoading || !currentUser) return null

        const userEmail = currentUser.email.toLowerCase()

        // Initialize matrix data for the current user
        const userData = {
            displayName: currentUser.name || userEmail.split('@')[0],
            email: userEmail,
            totalPortfolios: 0,
            hours: {} as { [hour: number]: UserHourData }
        }

        const initHour = (hour: number) => {
            if (!userData.hours[hour]) {
                userData.hours[hour] = {
                    completionsCount: 0,
                    issues: [],
                    activeIssues: [],
                    portfolios: [],
                }
            }
            return userData.hours[hour]
        }

        // Process logs for the current user
        const normalizedFromDate = fromDate ? fromDate.split('T')[0] : null
        const normalizedToDate = toDate ? toDate.split('T')[0] : null
        const processedKeys = new Set<string>()

        adminLogs.forEach(log => {
            if (log.action_type !== 'PORTFOLIO_CHECKED') return
            if ((log.admin_name || '').toLowerCase() !== userEmail) return

            let checkDate = formatESTDateISO(log.created_at)
            let meta = log.metadata
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta) } catch (e) { }
            }
            if (meta?.date) checkDate = meta.date.split('T')[0]

            if (normalizedFromDate && checkDate < normalizedFromDate) return
            if (normalizedToDate && checkDate > normalizedToDate) return

            const rawHour = meta?.hour !== undefined ? meta.hour : new Date(log.created_at).getHours()
            const logHour = Number(rawHour)
            const portfolioId = log.related_portfolio_id

            if (!portfolioId) return

            // Deduplication key: portfolio + date + hour (normalized ID)
            const key = `${String(portfolioId)}_${checkDate}_${logHour}`
            if (processedKeys.has(key)) return
            processedKeys.add(key)

            const hourData = initHour(logHour)
            hourData.completionsCount++
            userData.totalPortfolios++

            const portfolio = portfolios.find(p => p.id === portfolioId)
            if (portfolio) {
                const portfolioDetail = `${portfolio.name}${portfolio.site_range ? ` (${portfolio.site_range})` : ''}`
                if (!hourData.portfolios.includes(portfolioDetail)) {
                    hourData.portfolios.push(portfolioDetail)
                }
            }
        })

        // Process fallback portfolios (where logs might be missing but portfolios are marked checked)
        // This part is simplified from CoverageMatrix.tsx
        portfolios.forEach(portfolio => {
            if (portfolio.all_sites_checked !== 'Yes') return
            if (!portfolio.all_sites_checked_by || !portfolio.all_sites_checked_date) return

            const checkedByValue = String(portfolio.all_sites_checked_by).toLowerCase()
            // Check if it's the current user (either by ID or email)
            const isCurrentUser = checkedByValue === userEmail || checkedByValue === String(currentUser.userId).toLowerCase()
            if (!isCurrentUser) return

            const checkedDateStr = formatESTDateISO(portfolio.all_sites_checked_date)
            if (normalizedFromDate && checkedDateStr < normalizedFromDate) return
            if (normalizedToDate && checkedDateStr > normalizedToDate) return

            const completionHour = portfolio.all_sites_checked_hour ?? 0

            const portfolioId = portfolio.id || (portfolio as any).portfolio_id
            const key = `${String(portfolioId)}_${checkedDateStr}_${completionHour}`

            if (processedKeys.has(key)) return
            processedKeys.add(key)

            const hourData = initHour(completionHour)
            hourData.completionsCount++
            userData.totalPortfolios++

            const portfolioDetail = `${portfolio.name}${portfolio.site_range ? ` (${portfolio.site_range})` : ''}`
            if (!hourData.portfolios.includes(portfolioDetail)) {
                hourData.portfolios.push(portfolioDetail)
            }
        })

        // Process issues for the current user
        allIssues.forEach(issue => {
            const issueDate = new Date(issue.created_at).toISOString().split('T')[0]
            if (normalizedFromDate && issueDate < normalizedFromDate) return
            if (normalizedToDate && issueDate > normalizedToDate) return

            const monitoredBy = Array.isArray(issue.monitored_by) ? issue.monitored_by : [issue.monitored_by]
            const isMonitoredByUs = monitoredBy.some(m => String(m).toLowerCase() === userEmail)

            if (isMonitoredByUs) {
                const hour = issue.issue_hour ?? 0
                const hourData = initHour(hour)
                hourData.issues.push(issue)
                if (issue.description && issue.description.toLowerCase() !== 'no issue') {
                    hourData.activeIssues.push(issue)
                }
            }
        })

        return userData
    }, [adminLogs, allIssues, fromDate, toDate, portfolios, currentUser, usersLoading])

    const summaryStats = useMemo(() => {
        if (!currentUser || usersLoading) return { today: 0, yesterday: 0, week: 0, month: 0 }

        const userEmail = currentUser.email.toLowerCase()
        const todayStr = getESTDateString()
        const yesterdayStr = getESTRelativeDateString(-1)
        const weekAgoStr = getESTRelativeDateString(-7)
        const monthStartStr = `${todayStr.substring(0, 7)}-01`

        let today = 0
        let yesterday = 0
        let week = 0
        let month = 0

        const processedKeys = new Set<string>()

        // Helper to process a potential completion
        const processCompletion = (logDate: string, logUser: string, pId: string, hour: number) => {
            if (logUser !== userEmail) return

            const key = `${pId}_${logDate}_${hour}`
            if (processedKeys.has(key)) return
            processedKeys.add(key)

            if (logDate === todayStr) today++
            if (logDate === yesterdayStr) yesterday++
            if (logDate >= weekAgoStr) week++
            if (logDate >= monthStartStr) month++
        }

        // Process from logs
        adminLogs.forEach(log => {
            if (log.action_type !== 'PORTFOLIO_CHECKED') return
            let checkDate = formatESTDateISO(log.created_at)
            let meta = log.metadata
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta) } catch (e) { }
            }
            if (meta?.date) checkDate = meta.date.split('T')[0]
            const rawHour = meta?.hour !== undefined ? meta.hour : new Date(log.created_at).getHours()

            processCompletion(checkDate, (log.admin_name || '').toLowerCase(), String(log.related_portfolio_id), Number(rawHour))
        })

        // Process from portfolios (fallback)
        portfolios.forEach(portfolio => {
            if (portfolio.all_sites_checked !== 'Yes') return
            if (!portfolio.all_sites_checked_by || !portfolio.all_sites_checked_date) return

            const checkedByValue = String(portfolio.all_sites_checked_by).toLowerCase()
            const isCurrentUser = checkedByValue === userEmail || checkedByValue === String(currentUser.userId).toLowerCase()
            if (!isCurrentUser) return

            const checkedDateStr = formatESTDateISO(portfolio.all_sites_checked_date)
            const completionHour = portfolio.all_sites_checked_hour ?? 0
            const portfolioId = portfolio.id || (portfolio as any).portfolio_id

            processCompletion(checkedDateStr, userEmail, String(portfolioId), Number(completionHour))
        })

        return { today, yesterday, week, month }
    }, [adminLogs, portfolios, currentUser, usersLoading])

    const getCellColorClass = (count: number) => {
        if (count === 0) return 'bg-white dark:bg-gray-800 border border-subtle text-muted'
        if (count >= 3) return 'bg-green-600 text-white font-semibold'
        if (count >= 1) return 'bg-green-300 dark:bg-green-800 text-green-900 dark:text-green-100 font-semibold'
        return 'bg-white dark:bg-gray-800 border border-subtle text-muted'
    }

    if (usersLoading || issuesLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size="lg" />
            </div>
        )
    }

    const StatCard = ({ label, value, total, subtext, color }: { label: string, value: number, total?: number, subtext: string, color: string }) => (
        <Card className="flex-1 max-w-[200px] border-l-4 !p-4" style={{ borderLeftColor: color }}>
            <div className="flex flex-col">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-0.5">{label}</p>
                <div className="flex items-baseline gap-1.5">
                    <h3 className="text-2xl font-extrabold text-primary">
                        {value}
                        {total !== undefined && (
                            <span className="text-sm text-secondary font-medium ml-1">
                                / {total}
                            </span>
                        )}
                    </h3>
                    <span className="text-[9px] font-bold text-secondary">Portfolios</span>
                </div>
                <p className="text-[9px] text-muted font-medium mt-1.5 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 text-[#87bb44]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {subtext}
                </p>
            </div>
        </Card>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-primary">My Coverage Matrix</h2>
                    <p className="text-secondary mt-1">Your performance and portfolio coverage summary</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="px-3 py-2 border border-subtle rounded-lg bg-card text-primary text-sm focus:ring-2 focus:ring-green-500"
                    />
                    <span className="self-center text-secondary">to</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="px-3 py-2 border border-subtle rounded-lg bg-card text-primary text-sm focus:ring-2 focus:ring-green-500"
                    />
                    <Button
                        variant="secondary"
                        onClick={() => handleQuickRange('today')}
                        className={fromDate === getESTDateString() && toDate === getESTDateString() ? 'bg-green-50 text-green-600 border-green-200' : ''}
                    >
                        Today
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => handleQuickRange('yesterday')}
                    >
                        Yesterday
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => handleQuickRange('week')}
                    >
                        This Week
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => handleQuickRange('month')}
                    >
                        This Month
                    </Button>
                </div>
            </div>

            {/* Summary Visualization Cards */}
            <div className="flex justify-center gap-6">
                <StatCard
                    label="Today's Checks"
                    value={summaryStats.today}
                    total={portfolios.length}
                    subtext="Targeting full coverage today"
                    color="#87bb44"
                />
                <StatCard
                    label="Yesterday"
                    value={summaryStats.yesterday}
                    total={portfolios.length}
                    subtext="Total checks completed yesterday"
                    color="#fbbf24"
                />
                <StatCard
                    label="This Week"
                    value={summaryStats.week}
                    subtext="Total checks in last 7 days"
                    color="#3b82f6"
                />
                <StatCard
                    label="Current Month"
                    value={summaryStats.month}
                    subtext="Total checks this month"
                    color="#ec4899"
                />
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-subtle">
                        <thead>
                            <tr className="bg-main">
                                <th className="px-4 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider sticky left-0 z-10 bg-main border-r border-subtle w-48">
                                    Time (EST)
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-secondary uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                                    Portfolios Completed
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-secondary uppercase tracking-wider">
                                    Issues Logged
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-subtle">
                            {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                                const hourData = matrixData?.hours[hour]
                                const count = hourData?.completionsCount || 0
                                const issuesCount = hourData?.issues.length || 0

                                return (
                                    <tr key={hour} className="hover:bg-main/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary sticky left-0 z-10 bg-card border-r border-subtle">
                                            {hour.toString().padStart(2, '0')}:00
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm transition-all ${getCellColorClass(count)}`}>
                                                {count}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-secondary">
                                            {hourData?.portfolios && hourData.portfolios.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {hourData.portfolios.map((p, idx) => (
                                                        <span key={idx} className="bg-main px-2 py-1 rounded text-xs border border-subtle">
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted italic text-xs">No portfolios checked</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium text-primary">
                                            {issuesCount > 0 ? (
                                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2.5 py-1 rounded-full text-xs">
                                                    {issuesCount} issues
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-main border-t-2 border-subtle">
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-primary sticky left-0 z-10 bg-main border-r border-subtle">
                                    TOTAL
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center text-lg font-bold text-green-600 dark:text-[#87bb44]">
                                    {matrixData?.totalPortfolios || 0}
                                </td>
                                <td className="px-4 py-3" colSpan={2}>
                                    <p className="text-xs text-secondary font-medium">
                                        Total portfolios checked across the selected period.
                                    </p>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </div>
    )
}

export default MyCoverageMatrix

import React, { useState } from 'react'
import { PortfolioLock } from '../../../services/adminService'
import { portfolioService } from '../../../services/portfolioService'
import { UseMutationResult, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface SidebarHeaderProps {
    displayName: string
    hour: number
    monitoredByName: string
    user: any
    lockMutation: UseMutationResult<any, any, void, unknown>
    lockForThisPortfolio: PortfolioLock | undefined
    onClose: () => void
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
    displayName,
    hour,
    monitoredByName,
    user,
    lockMutation,
    lockForThisPortfolio,
    onClose,
}) => {
    const queryClient = useQueryClient()
    const [isUnlocking, setIsUnlocking] = useState(false)

    const handleUnlock = async () => {
        if (!lockForThisPortfolio) return

        const reason = window.prompt('Please enter a reason for unlocking this portfolio early:')
        if (reason === null) return // Cancelled

        try {
            setIsUnlocking(true)
            await portfolioService.unlock(lockForThisPortfolio.portfolio_id, hour, reason || 'Manual unlock')

            toast.success('Portfolio unlocked successfully')

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
            queryClient.invalidateQueries({ queryKey: ['locks'] })
            queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
        } catch (error: any) {
            console.error('Failed to unlock:', error)
            toast.error(error.message || 'Failed to unlock portfolio')
        } finally {
            setIsUnlocking(false)
        }
    }

    return (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                    {displayName} - Hour {hour}
                </h3>
                <button
                    onClick={onClose}
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
                ) : lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() === user?.email?.toLowerCase() ? (
                    <button
                        onClick={handleUnlock}
                        disabled={isUnlocking}
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 hover:bg-green-200 hover:border-green-300 transition-all cursor-pointer group"
                        title="Click to unlock early"
                    >
                        <span className="w-2 h-2 bg-green-500 rounded-full group-hover:animate-pulse"></span>
                        {isUnlocking ? 'UNLOCKING...' : '🔒 LICENSED MONITORING (YOU) - CLICK TO UNLOCK'}
                    </button>
                ) : lockMutation.isPending ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full animate-pulse">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        SECURING LOCK...
                    </span>
                ) : lockForThisPortfolio ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        🚩 LOCKED BY {monitoredByName.toUpperCase()}
                    </span>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                            ⚠️ VIEW ONLY (NOT LOCKED)
                        </span>
                        <button
                            onClick={() => lockMutation.mutate()}
                            disabled={lockMutation.isPending}
                            className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {lockMutation.isPending ? 'LOCKING...' : 'LOCK NOW'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SidebarHeader

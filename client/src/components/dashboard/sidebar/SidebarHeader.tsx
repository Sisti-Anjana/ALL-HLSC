import React from 'react'
import { PortfolioLock } from '../../../services/adminService'
import { UseMutationResult } from '@tanstack/react-query'

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

import React from 'react'
import { Issue } from '../../../types/issue.types'

interface IssueListProps {
    issues: Issue[]
    formatDateTime: (dateString: string) => string
    onEditClick: (issue: Issue) => void
    editingIssueId: string | null
    currentUserEmail?: string
}

const IssueList: React.FC<IssueListProps> = ({ issues, formatDateTime, onEditClick, editingIssueId, currentUserEmail }) => {
    return (
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
                                    {(() => {
                                        const rawNotes = issue.notes || ''
                                        const cleanNote = rawNotes
                                            .replace(/Case #: [^\n|]*/, '')
                                            .replace(/\|/, '')
                                            .replace(/\(Auto-saved\)/, '')
                                            .trim()

                                        if (!cleanNote) return null
                                        return (
                                            <p className="text-xs text-gray-600 mb-1 bg-yellow-50 p-1 rounded border border-yellow-100">
                                                <span className="font-semibold">Note:</span> {cleanNote}
                                            </p>
                                        )
                                    })()}
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {issue.monitored_by && issue.monitored_by.length > 0 ? (
                                            <>
                                                <span>•</span>
                                                <span>{Array.isArray(issue.monitored_by) ? issue.monitored_by[0]?.split('@')[0] : (issue.monitored_by as string).split('@')[0] || 'Unknown'}</span>
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
                                {(() => {
                                    if (!currentUserEmail) return null
                                    const monitor = issue.monitored_by
                                    const authorEmail = Array.isArray(monitor)
                                        ? monitor[0]
                                        : (monitor as any) as string

                                    if (authorEmail?.toLowerCase() !== currentUserEmail.toLowerCase()) return null

                                    return (
                                        <button
                                            onClick={() => onEditClick(issue)}
                                            disabled={editingIssueId === issue.id}
                                            className={`ml-2 p-1.5 rounded-md transition-colors ${editingIssueId === issue.id
                                                ? 'bg-blue-100 text-blue-600'
                                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                                }`}
                                            title="Edit issue"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                    )
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default IssueList

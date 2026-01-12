import React from 'react'
import { Issue } from '../../../types/issue.types'

interface IssueListProps {
    issues: Issue[]
    formatDateTime: (dateString: string) => string
}

const IssueList: React.FC<IssueListProps> = ({ issues, formatDateTime }) => {
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
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default IssueList

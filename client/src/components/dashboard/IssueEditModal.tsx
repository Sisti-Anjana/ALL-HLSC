import React, { useState, useEffect } from 'react'
import { Issue, UpdateIssueData } from '../../types/issue.types'
import { User } from '../../types/user.types'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { issueService } from '../../services/issueService'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface IssueEditModalProps {
    isOpen: boolean
    onClose: () => void
    issue: Issue | null
    users: User[]
}

const IssueEditModal: React.FC<IssueEditModalProps> = ({ isOpen, onClose, issue, users }) => {
    const queryClient = useQueryClient()
    const [issuePresent, setIssuePresent] = useState<string>('')
    const [description, setDescription] = useState('')
    const [caseNumber, setCaseNumber] = useState('')
    const [notes, setNotes] = useState('')
    const [missedBy, setMissedBy] = useState<string>('')

    useEffect(() => {
        if (issue) {
            setIssuePresent(issue.description && issue.description.toLowerCase() !== 'no issue' ? 'yes' : 'no')
            setDescription(issue.description || '')

            // Parse combined notes field
            const rawNotes = issue.notes || ''
            const caseMatch = rawNotes.match(/Case #: ([^\n|]*)/)
            const caseVal = caseMatch ? caseMatch[1].trim() : ''
            const cleanNotes = rawNotes
                .replace(/Case #: [^\n|]*/, '')
                .replace(/\(Auto-saved\)/, '')
                .trim()

            setCaseNumber(caseVal)
            setNotes(cleanNotes)

            setMissedBy(Array.isArray(issue.missed_by) && issue.missed_by.length > 0 ? issue.missed_by[0] : '')
        }
    }, [issue, isOpen])

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateIssueData }) => issueService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] })
            queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
            toast.success('Issue updated successfully')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update issue')
        },
    })

    const handleUpdate = () => {
        if (!issue) return

        if (issuePresent === 'yes' && (!description.trim() || description === 'No issue')) {
            toast.error('Please provide issue details')
            return
        }

        // Combine Case # and Notes
        let combinedNotes = ''
        if (caseNumber.trim()) combinedNotes += `Case #: ${caseNumber.trim()}`
        if (notes.trim()) {
            combinedNotes += combinedNotes ? ` | ${notes.trim()}` : notes.trim()
        }

        const data: UpdateIssueData = {
            description: issuePresent === 'no' ? 'No issue' : description.trim(),
            severity: (issuePresent === 'yes' ? 'high' : 'low').toLowerCase() as any,
            missed_by: (issuePresent === 'yes' && missedBy) ? [missedBy] : undefined,
            notes: combinedNotes || undefined,
        }

        updateMutation.mutate({ id: issue.id, data })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Issue Details">
            <div className="space-y-6 pt-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                            <span className="text-gray-500">Portfolio:</span>
                            <span className="ml-2 font-semibold text-gray-900">{issue?.portfolio?.name}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Hour:</span>
                            <span className="ml-2 font-semibold text-gray-900">{issue?.issue_hour}:00</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Monitored By:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                                {Array.isArray(issue?.monitored_by) ? issue?.monitored_by[0] : issue?.monitored_by}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Created:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                                {issue?.created_at ? new Date(issue.created_at).toLocaleDateString() : ''}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Present</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIssuePresent('yes')
                                if (description === 'No issue') setDescription('')
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
                                setDescription('No issue')
                                setMissedBy('')
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
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={issuePresent === 'no'}
                        rows={4}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${issuePresent === 'no' ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add additional notes here..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issues Missed By (optional)</label>
                    <select
                        value={missedBy}
                        onChange={(e) => setMissedBy(e.target.value)}
                        disabled={issuePresent === 'no'}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${issuePresent === 'no' ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                    >
                        <option value="">Select</option>
                        {users
                            .filter((u) => u.is_active)
                            .map((u) => (
                                <option key={u.id} value={u.email}>
                                    {u.email.split('@')[0]} ({u.full_name})
                                </option>
                            ))}
                    </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                        onClick={handleUpdate}
                        disabled={updateMutation.isPending}
                        className="flex-1"
                        style={{ backgroundColor: '#76ab3f' }}
                    >
                        {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                    </Button>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

export default IssueEditModal

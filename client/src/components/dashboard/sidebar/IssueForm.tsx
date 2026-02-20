import React from 'react'
import Button from '../../common/Button'
import { PortfolioLock } from '../../../services/adminService'
import { User } from '../../../types/user.types'
import { UseMutationResult } from '@tanstack/react-query'

interface IssueFormProps {
    issuePresent: string
    setIssuePresent: (value: string) => void
    setIssueDescription: (value: string) => void
    setMissedAlertsBy: (value: string) => void
    caseNumber: string
    setCaseNumber: (value: string) => void
    issueDescription: string
    notes: string
    setNotes: (value: string) => void
    missedAlertsBy: string
    users: User[]
    handleAddIssue: () => void
    handleNoIssueSubmit: () => void
    handleUpdateIssue: () => void
    onCancelEdit: () => void
    editingIssueId: string | null
    createMutation: UseMutationResult<any, any, any, unknown>
    updateMutation: UseMutationResult<any, any, any, unknown>
    lockMutation: UseMutationResult<any, any, void, unknown>
    lockForThisPortfolio: PortfolioLock | undefined
    user: any
    monitoredByName: string
}

const IssueForm: React.FC<IssueFormProps> = ({
    issuePresent,
    setIssuePresent,
    setIssueDescription,
    setMissedAlertsBy,
    caseNumber,
    setCaseNumber,
    issueDescription,
    notes,
    setNotes,
    missedAlertsBy,
    users,
    handleAddIssue,
    handleNoIssueSubmit,
    handleUpdateIssue,
    onCancelEdit,
    editingIssueId,
    createMutation,
    updateMutation,
    lockMutation,
    lockForThisPortfolio,
    user,
    monitoredByName,
}) => {
    return (
        <div className="space-y-4" id="issue-form-container">
            <h4 className="font-semibold text-gray-900">
                {editingIssueId ? 'Edit issue:' : 'Add issue for this hour:'}
            </h4>

            {/* ... other fields remain same ... */}
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
                        onClick={handleNoIssueSubmit}
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
                <label className="block text-sm font-medium text-secondary mb-2">Case #</label>
                <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="Case number"
                    className="w-full px-3 py-2 border border-subtle bg-card text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-secondary mb-2">Issue Description</label>
                <textarea
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder={issuePresent === '' ? "Select issue present first" : issuePresent === 'no' ? "No issue" : "Describe the problem..."}
                    disabled={issuePresent === 'no'}
                    rows={4}
                    className={`w-full px-3 py-2 border border-subtle bg-card text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${issuePresent === 'no' ? 'opacity-50 cursor-not-allowed bg-subtle' : ''
                        }`}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-secondary mb-2">Note</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add additional notes here..."
                    rows={3}
                    className="w-full px-3 py-2 border border-subtle bg-card text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-secondary mb-2">Issues Missed By (optional)</label>
                <select
                    value={missedAlertsBy}
                    onChange={(e) => setMissedAlertsBy(e.target.value)}
                    disabled={issuePresent === 'no' || issuePresent === ''}
                    className={`w-full px-3 py-2 border border-subtle bg-card text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${issuePresent === 'no' || issuePresent === '' ? 'opacity-50 cursor-not-allowed bg-subtle' : ''
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

            <div className="flex gap-2">
                {editingIssueId ? (
                    <>
                        <Button
                            onClick={handleUpdateIssue}
                            disabled={updateMutation.isPending}
                            className="flex-1"
                            style={{ backgroundColor: '#76ab3f' }}
                        >
                            {updateMutation.isPending ? 'Updating...' : 'Update Issue'}
                        </Button>
                        <Button
                            onClick={onCancelEdit}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={() => {
                            if (lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() === user?.email?.toLowerCase()) {
                                handleAddIssue()
                            } else {
                                lockMutation.mutate()
                            }
                        }}
                        disabled={createMutation.isPending || (lockMutation.isPending && (!lockForThisPortfolio || lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase())) || (!lockForThisPortfolio && (user?.role === 'super_admin')) || (lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase())}
                        className="w-full"
                        style={{
                            backgroundColor: (lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase())
                                ? '#9ca3af'
                                : !lockForThisPortfolio
                                    ? '#3b82f6' // Blue for "Lock to Add"
                                    : '#76ab3f' // Green for "Add Issue"
                        }}
                    >
                        {createMutation.isPending ? 'Adding...' :
                            (lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() === user?.email?.toLowerCase()) ? 'Add Issue' :
                                lockMutation.isPending ? 'Locking...' :
                                    (lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase()) ? 'Locked by another user' :
                                        'Lock Portfolio to Add Issue'}
                    </Button>
                )}
            </div>

            {lockForThisPortfolio && lockForThisPortfolio.monitored_by?.toLowerCase() !== user?.email?.toLowerCase() && (
                <p className="text-[10px] text-center text-red-600 font-medium">
                    You cannot log issues because this portfolio is locked by {monitoredByName}.
                </p>
            )}
        </div>
    )
}

export default IssueForm

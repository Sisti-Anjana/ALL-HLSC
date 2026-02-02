import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { issueService, IssueFilters } from '../../services/issueService'
import { portfolioService } from '../../services/portfolioService'
import { Issue, CreateIssueData } from '../../types/issue.types'
import { Portfolio } from '../../types/portfolio.types'
import toast from 'react-hot-toast'
import IssueForm from './IssueForm'
import Badge from '../common/Badge'
import EmptyState from '../common/EmptyState'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import { useTenant } from '../../context/TenantContext'
import { useAuth } from '../../context/AuthContext'

const IssueList: React.FC = () => {
  const { user } = useAuth()
  const { selectedTenant } = useTenant()
  const isReadOnly = selectedTenant?.status === 'suspended' || selectedTenant?.status === 'inactive'

  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState<IssueFilters>({})
  const [formData, setFormData] = useState<CreateIssueData>({
    portfolio_id: '',
    site_name: '',
    issue_hour: 0,
    description: '',
    severity: 'Medium',
    status: 'open',
  })

  const queryClient = useQueryClient()

  const { data: portfolios } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfolioService.getAll,
  })

  const { data: issues, isLoading } = useQuery<Issue[]>({
    queryKey: ['issues', filters],
    queryFn: () => issueService.getAll(filters),
  })

  const createMutation = useMutation({
    mutationFn: issueService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Issue created successfully')
      setShowModal(false)
      setFormData({
        portfolio_id: '',
        site_name: '',
        issue_hour: 0,
        description: '',
        severity: 'Medium',
        status: 'open',
      })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create issue')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: issueService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Issue deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete issue')
    },
  })

  const handleSubmit = (data: CreateIssueData) => {
    createMutation.mutate(data)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      deleteMutation.mutate(id)
    }
  }

  const getSeverityColor = (severity: string) => {
    const sev = severity?.toLowerCase() || ''
    switch (sev) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-800' // Blue for low as shown in screenshot
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    const stat = status?.toLowerCase() || ''
    switch (stat) {
      case 'open':
        return 'bg-pink-100 text-pink-800' // Pink for open as shown in screenshot
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Issues</h1>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.portfolio_id || ''}
            onChange={(e) => setFilters({ ...filters, portfolio_id: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Portfolios</option>
            {portfolios?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.severity || ''}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <input
            type="number"
            placeholder="Hour (0-23)"
            min="0"
            max="23"
            value={filters.issue_hour !== undefined ? filters.issue_hour : ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                issue_hour: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (isReadOnly) return
              setShowModal(true)
            }}
            disabled={isReadOnly}
            className={`ml-auto px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${isReadOnly ? 'bg-gray-400 cursor-not-allowed opacity-60 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            <span>+</span>
            <span>{isReadOnly ? 'Disabled' : 'Log Issue'}</span>
          </button>
        </div>
      </div>

      {isReadOnly && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-3">
          <span className="text-xl">🚫</span>
          <div>
            <p className="font-bold">Client is {selectedTenant?.status}</p>
            <p className="text-sm">You are in read-only mode. Adding new issues or deleting existing ones is disabled.</p>
          </div>
        </div>
      )}

      {/* Issues Table */}
      {issues && issues.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="No issues found"
          description="Log your first issue to start tracking"
          action={{
            label: 'Log Issue',
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">PORTFOLIO</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SITE</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">HOUR</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DESCRIPTION</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SEVERITY</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {issues?.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.portfolio?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{issue.site_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{issue.issue_hour}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{issue.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity || '')}`}>
                      {(issue.severity || '').toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status || '')}`}>
                      {issue.status || 'open'}
                    </span>
                  </td>
                  {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          if (isReadOnly) return
                          handleDelete(issue.id)
                        }}
                        disabled={isReadOnly}
                        className={`px-3 py-1 text-white rounded transition-colors text-sm ${isReadOnly ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-red-600 hover:bg-red-700'
                          }`}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <IssueForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        portfolios={portfolios || []}
        isLoading={createMutation.isPending}
      />
    </div>
  )
}

export default IssueList

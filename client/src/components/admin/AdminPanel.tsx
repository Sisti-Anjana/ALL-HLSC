import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { adminService } from '../../services/adminService'
import { portfolioService } from '../../services/portfolioService'
import { User, CreateUserData } from '../../types/user.types'
import { Portfolio } from '../../types/portfolio.types'
import toast from 'react-hot-toast'
import UserManagement from './UserManagement'
import PortfolioForm from '../portfolio/PortfolioForm'
import Badge from '../common/Badge'
import Spinner from '../common/Spinner'
import EmptyState from '../common/EmptyState'
import Button from '../common/Button'
import Input from '../common/Input'
import Modal from '../common/Modal'

const AdminPanel: React.FC = () => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  
  const [activeTab, setActiveTab] = useState<'portfolios' | 'users' | 'locks' | 'logs' | 'clients'>(
    'portfolios'
  )

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'portfolios', label: 'Portfolios' },
            { id: 'users', label: 'Users' },
            { id: 'locks', label: 'Active Locks' },
            { id: 'logs', label: 'Admin Logs' },
            ...(isSuperAdmin ? [{ id: 'clients', label: 'Clients' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'portfolios' && <PortfoliosTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'locks' && <LocksTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'clients' && isSuperAdmin && <ClientsTab />}
      </div>
    </div>
  )
}

const PortfoliosTab: React.FC = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null)
  const queryClient = useQueryClient()

  const { data: portfolios, isLoading } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfolioService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: portfolioService.create,
    onSuccess: async () => {
      // Invalidate both queries to update Admin Panel and Dashboard
      await queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      await queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      // Force refetch dashboard query immediately
      await queryClient.refetchQueries({ queryKey: ['portfolio-activity'] })
      toast.success('Portfolio created successfully')
      setShowModal(false)
      setEditingPortfolio(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create portfolio')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => portfolioService.update(id, data),
    onSuccess: async () => {
      // Invalidate both queries to update Admin Panel and Dashboard
      await queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      await queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      // Force refetch dashboard query immediately
      await queryClient.refetchQueries({ queryKey: ['portfolio-activity'] })
      toast.success('Portfolio updated successfully')
      setShowModal(false)
      setEditingPortfolio(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update portfolio')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: portfolioService.delete,
    onSuccess: async () => {
      // Invalidate both queries to update Admin Panel and Dashboard
      await queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      await queryClient.invalidateQueries({ queryKey: ['portfolio-activity'] })
      // Force refetch dashboard query immediately
      await queryClient.refetchQueries({ queryKey: ['portfolio-activity'] })
      toast.success('Portfolio deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete portfolio')
    },
  })

  const handleSubmit = (data: any) => {
    if (editingPortfolio) {
      updateMutation.mutate({ id: editingPortfolio.id, data })
    } else {
      createMutation.mutate(data)
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
    <div>
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portfolio Management</h2>
          <p className="text-gray-600 mt-1">Create, edit, and manage portfolios</p>
        </div>
        <Button onClick={() => { setEditingPortfolio(null); setShowModal(true) }}>
          + Add Portfolio
        </Button>
      </div>

      {portfolios && portfolios.length === 0 ? (
        <EmptyState title="No portfolios yet" description="Create your first portfolio to get started" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtitle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolios?.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.subtitle || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.site_range || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        p.all_sites_checked === 'Yes'
                          ? 'bg-green-100 text-green-800'
                          : p.all_sites_checked === 'No'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {p.all_sites_checked || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingPortfolio(p)
                          setShowModal(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${p.name}"?`)) {
                            deleteMutation.mutate(p.id)
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <PortfolioForm
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingPortfolio(null)
          }}
          onSubmit={handleSubmit}
          portfolio={editingPortfolio}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}

const UsersTab: React.FC = () => {
  return <UserManagement />
}

const LocksTab: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: locks, isLoading, refetch } = useQuery({
    queryKey: ['locks'],
    queryFn: adminService.getLocks,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const unlockMutation = useMutation({
    mutationFn: adminService.unlockPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locks'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
      toast.success('Portfolio unlocked successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to unlock portfolio')
    },
  })

  const unlockAllMutation = useMutation({
    mutationFn: adminService.unlockAllLocksForUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locks'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
      toast.success('All your locks have been unlocked')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to unlock all locks')
    },
  })

  const handleRefresh = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['locks'] })
    queryClient.invalidateQueries({ queryKey: ['portfolio-locks'] })
    toast.success('Locks refreshed')
  }

  const handleUnlockAll = () => {
    if (window.confirm('Are you sure you want to unlock ALL your active locks? This will unlock all portfolios you have locked.')) {
      unlockAllMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  // Filter locks for current user if needed (for debugging)
  const currentUserLocks = locks?.filter(lock => 
    lock.monitored_by?.toLowerCase() === user?.email?.toLowerCase()
  ) || []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Portfolio Locks</h2>
          <p className="text-gray-600 mt-1">View and manage portfolio locks</p>
        </div>
        <div className="flex gap-2">
          {currentUserLocks.length > 0 && (
            <Button 
              onClick={handleUnlockAll} 
              variant="danger" 
              size="sm"
              isLoading={unlockAllMutation.isPending}
            >
              Unlock All My Locks ({currentUserLocks.length})
            </Button>
          )}
          <Button onClick={handleRefresh} variant="secondary" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Debug info - show current user's locks */}
      {currentUserLocks.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Your active locks ({currentUserLocks.length}):</strong>{' '}
            {currentUserLocks.map(lock => {
              const name = lock.portfolio?.name || `Portfolio ID: ${lock.portfolio_id || 'N/A'}`
              return name
            }).join(', ')}
          </p>
        </div>
      )}

      {locks && locks.length === 0 ? (
        <EmptyState title="No active locks" description="No portfolios are currently locked" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Portfolio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hour</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserved At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locks?.map((lock) => (
                <tr key={lock.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lock.portfolio?.name || `Portfolio ID: ${lock.portfolio_id || 'N/A'}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lock.issue_hour}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(lock.reserved_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(lock.expires_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to unlock this portfolio?')) {
                          unlockMutation.mutate(lock.portfolio_id)
                        }
                      }}
                    >
                      Unlock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const LogsTab: React.FC = () => {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    actionType: '',
    actionDescription: '',
  })
  const queryClient = useQueryClient()

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: adminService.getLogs,
  })

  const createLogMutation = useMutation({
    mutationFn: adminService.createLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-logs'] })
      toast.success('Log entry created successfully')
      setShowModal(false)
      setFormData({ actionType: '', actionDescription: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create log entry')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Activity Logs</h2>
          <p className="text-gray-600 mt-1">View activity history and add custom log entries</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Log Entry</Button>
      </div>

      {logs && logs.length === 0 ? (
        <EmptyState title="No logs yet" description="Admin activity will appear here" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs?.map((log) => (
                <tr key={log.log_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.admin_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="info">{log.action_type}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.action_description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Add Log Entry</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createLogMutation.mutate(formData)
              }}
              className="space-y-4"
            >
              <Input
                label="Action Type"
                value={formData.actionType}
                onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                required
                placeholder="e.g., Manual Entry"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.actionDescription}
                  onChange={(e) => setFormData({ ...formData, actionDescription: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" isLoading={createLogMutation.isPending} className="flex-1">
                  Add Log
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const ClientsTab: React.FC = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: adminService.getTenants,
    enabled: true,
  })

  const createMutation = useMutation({
    mutationFn: adminService.createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Client created successfully!')
      setShowModal(false)
      setEditingTenant(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create client')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminService.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Client updated successfully')
      setShowModal(false)
      setEditingTenant(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update client')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Client deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete client')
    },
  })

  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    contactEmail: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.tenant_id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (tenant: any) => {
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name,
      subdomain: tenant.subdomain,
      contactEmail: tenant.contact_email,
      status: tenant.status,
      adminEmail: '',
      adminPassword: '',
      adminName: '',
    })
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this client? This will permanently delete:\n\n' +
        '• All users associated with this client\n' +
        '• All portfolios\n' +
        '• All issues\n' +
        '• All related data\n\n' +
        'This action cannot be undone.'
      )
    ) {
      deleteMutation.mutate(id)
    }
  }

  const handleNew = () => {
    setEditingTenant(null)
    setFormData({
      name: '',
      subdomain: '',
      contactEmail: '',
      status: 'active',
      adminEmail: '',
      adminPassword: '',
      adminName: '',
    })
    setShowModal(true)
  }

  if (isLoading) {
    return <Spinner />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">Clients Management</h2>
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
          + Create New Client
        </Button>
      </div>

      {tenants && tenants.length === 0 ? (
        <EmptyState
          title="No clients found"
          description="Create your first client to start managing multiple tenants"
          action={{
            label: 'Create Client',
            onClick: handleNew,
          }}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Subdomain</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contact Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants?.map((tenant) => (
                <tr key={tenant.tenant_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tenant.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.subdomain}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.contact_email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={
                        tenant.status === 'active'
                          ? 'success'
                          : tenant.status === 'suspended'
                          ? 'danger'
                          : 'default'
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(tenant)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tenant.tenant_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingTenant(null)
        }}
        title={editingTenant ? 'Edit Client' : 'Create New Client'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Client Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Standard Solar"
          />
          <Input
            label="Subdomain"
            value={formData.subdomain}
            onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            required
            placeholder="e.g., standardsolar"
            helperText="Lowercase letters, numbers, and hyphens only"
          />
          <Input
            label="Contact Email"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            required
            placeholder="admin@client.com"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {!editingTenant && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-3">Create Admin User (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Create the first admin user for this client. If left blank, you can create the admin user manually later.
              </p>
              <Input
                label="Admin Email"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@client.com"
              />
              <Input
                label="Admin Name"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                placeholder="Admin User"
              />
              <Input
                label="Admin Password"
                type="password"
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                placeholder="Minimum 8 characters"
                helperText={formData.adminPassword && formData.adminPassword.length < 8 ? 'Password must be at least 8 characters' : ''}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setShowModal(false)
                setEditingTenant(null)
              }}
              className="bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingTenant ? 'Update' : 'Create'} Client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AdminPanel

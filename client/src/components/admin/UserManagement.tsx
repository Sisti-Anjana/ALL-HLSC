import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '../../services/adminService'
import { User, CreateUserData, UpdateUserData } from '../../types/user.types'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Badge from '../common/Badge'
import EmptyState from '../common/EmptyState'
import Spinner from '../common/Spinner'

import { useTenant } from '../../context/TenantContext'

const UserManagement: React.FC = () => {
  const { selectedTenant } = useTenant()
  const isReadOnly = selectedTenant?.status === 'suspended' || selectedTenant?.status === 'inactive'

  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
  })

  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  })

  const createMutation = useMutation({
    mutationFn: adminService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User created successfully')
      setShowModal(false)
      setFormData({ email: '', password: '', fullName: '', role: 'user' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User updated successfully')
      setShowModal(false)
      setEditingUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: formData })
    } else {
      createMutation.mutate(formData)
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
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
        <Button
          onClick={() => {
            if (isReadOnly) return
            setEditingUser(null)
            setFormData({ email: '', password: '', fullName: '', role: 'user' })
            setShowModal(true)
          }}
          disabled={isReadOnly}
          className={isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {isReadOnly ? 'Add Disabled' : '+ Add User'}
        </Button>
      </div>

      {isReadOnly && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 italic">
          <span>ℹ️</span>
          <span>User management is disabled because the client is currently {selectedTenant?.status}.</span>
        </div>
      )}

      {users && users.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No users yet"
          description="Create your first user account"
          action={{
            label: 'Add User',
            onClick: () => {
              setEditingUser(null)
              setFormData({ email: '', password: '', fullName: '', role: 'user' })
              setShowModal(true)
            },
          }}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.map((user) => {
                // Check if full_name looks invalid (might be a password)
                const fullName = user.full_name || ''
                const isInvalidName = !fullName || fullName.trim() === '' || fullName.length > 100 || (!fullName.includes(' ') && fullName.length > 20)
                const suggestedName = user.email.split('@')[0]
                const displayName = isInvalidName
                  ? `${fullName || '(Invalid)'} ⚠️`
                  : fullName

                return (
                  <tr key={user.id} className={`hover:bg-gray-50 ${isInvalidName ? 'bg-yellow-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span className={isInvalidName ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                          {displayName}
                        </span>
                        {isInvalidName && (
                          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                            Fix needed
                          </span>
                        )}
                      </div>
                      {isInvalidName && (
                        <div className="text-xs text-gray-500 mt-1">
                          Suggested: {suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="info">{user.role}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <Button
                        size="sm"
                        variant={isInvalidName ? "primary" : "secondary"}
                        onClick={() => {
                          if (isReadOnly) return
                          setEditingUser(user)
                          // If name is invalid, suggest a better name - preserve casing after first letter
                          const suggestedFullName = isInvalidName
                            ? suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1)
                            : user.full_name
                          setFormData({
                            email: user.email,
                            password: '',
                            fullName: suggestedFullName,
                            role: user.role,
                          })
                          setShowModal(true)
                        }}
                        disabled={isReadOnly}
                        className={isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        {isInvalidName ? 'Fix Name' : 'Edit'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (isReadOnly) return
                          if (window.confirm('Are you sure you want to delete this user?')) {
                            deleteMutation.mutate(user.id)
                          }
                        }}
                        disabled={isReadOnly}
                        className={isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingUser(null)
        }}
        title={editingUser ? 'Edit User' : 'Create User'}
        size="md"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={!!editingUser}
          />

          {!editingUser && (
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
          )}

          {editingUser && (
            <Input
              label="New Password (leave blank to keep current)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          )}

          <Input
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
            helperText={
              formData.fullName && (!formData.fullName.includes(' ') || formData.fullName.length > 100)
                ? 'Please enter first and last name separated by a space (e.g., "John Doe")'
                : 'Enter the user\'s full name (first and last name)'
            }
            error={
              formData.fullName && formData.fullName.length > 100
                ? 'Name is too long (max 100 characters)'
                : formData.fullName && !formData.fullName.includes(' ') && formData.fullName.length > 20
                  ? 'Name should include first and last name separated by a space'
                  : undefined
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="tenant_admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="flex-1">
              {editingUser ? 'Update' : 'Create'} User
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                setEditingUser(null)
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default UserManagement

import api from './api'
import { ApiResponse } from '../types/api.types'
import { User, CreateUserData, UpdateUserData } from '../types/user.types'

export interface MonitoredPersonnel {
  id: string
  tenant_id: string
  name: string
  role: string
  is_active: boolean
  created_at: string
}

export interface AdminLog {
  log_id: string
  tenant_id: string
  admin_name: string
  action_type: string
  action_description: string
  related_portfolio_id?: string
  related_user_id?: string
  metadata?: any
  created_at: string
}

export interface PortfolioLock {
  id: string
  tenant_id: string
  portfolio_id: string
  portfolio?: { name: string }
  tenant?: { name: string }
  issue_hour: number
  monitored_by: string
  reserved_at: string
  expires_at: string
}

export interface Tenant {
  tenant_id: string
  name: string
  subdomain: string
  contact_email: string
  status: 'active' | 'inactive' | 'suspended'
  subscription_plan?: 'basic' | 'pro' | 'enterprise' | null
  created_at: string
  updated_at?: string
}

export interface CreateTenantData {
  name: string
  subdomain: string
  contactEmail: string
  status?: 'active' | 'inactive' | 'suspended'
  adminEmail?: string
  adminPassword?: string
  adminName?: string
}

export const adminService = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>('/admin/users')
    return response.data.data || []
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/admin/users', data)
    return response.data.data!
  },

  checkUserExists: async (email: string): Promise<User | null> => {
    const response = await api.get<ApiResponse<User | null>>(`/admin/users/check/${email}`)
    return response.data.data || null
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}`, data)
    return response.data.data!
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`)
  },

  // Personnel
  getPersonnel: async (): Promise<MonitoredPersonnel[]> => {
    const response = await api.get<ApiResponse<MonitoredPersonnel[]>>('/admin/personnel')
    return response.data.data || []
  },

  createPersonnel: async (data: { name: string; role?: string }): Promise<MonitoredPersonnel> => {
    const response = await api.post<ApiResponse<MonitoredPersonnel>>('/admin/personnel', data)
    return response.data.data!
  },

  updatePersonnel: async (id: string, data: Partial<MonitoredPersonnel>): Promise<MonitoredPersonnel> => {
    const response = await api.put<ApiResponse<MonitoredPersonnel>>(`/admin/personnel/${id}`, data)
    return response.data.data!
  },

  deletePersonnel: async (id: string): Promise<void> => {
    await api.delete(`/admin/personnel/${id}`)
  },

  // Locks
  getLocks: async (): Promise<PortfolioLock[]> => {
    const response = await api.get<ApiResponse<PortfolioLock[]>>('/admin/locks')
    return response.data.data || []
  },

  unlockPortfolio: async (portfolioId: string): Promise<void> => {
    await api.post(`/admin/locks/${portfolioId}/unlock`)
  },

  unlockAllLocksForUser: async (): Promise<void> => {
    await api.post('/admin/locks/unlock-all')
  },

  // Logs
  getLogs: async (): Promise<AdminLog[]> => {
    const response = await api.get<ApiResponse<AdminLog[]>>('/admin/logs')
    return response.data.data || []
  },

  createLog: async (data: {
    actionType: string
    actionDescription: string
    relatedPortfolioId?: string
    relatedUserId?: string
    metadata?: any
  }): Promise<AdminLog> => {
    const response = await api.post<ApiResponse<AdminLog>>('/admin/logs', data)
    return response.data.data!
  },

  // Tenants (Super Admin Only)
  getTenants: async (): Promise<Tenant[]> => {
    const response = await api.get<ApiResponse<Tenant[]>>('/admin/tenants')
    return response.data.data || []
  },

  getTenantById: async (id: string): Promise<Tenant> => {
    const response = await api.get<ApiResponse<Tenant>>(`/admin/tenants/${id}`)
    return response.data.data!
  },

  createTenant: async (data: CreateTenantData): Promise<{ tenant: Tenant; adminUser?: User }> => {
    const response = await api.post<ApiResponse<{ tenant: Tenant; adminUser?: User }>>('/admin/tenants', data)
    return response.data.data!
  },

  updateTenant: async (id: string, data: Partial<CreateTenantData>): Promise<Tenant> => {
    const response = await api.put<ApiResponse<Tenant>>(`/admin/tenants/${id}`, data)
    return response.data.data!
  },

  deleteTenant: async (id: string): Promise<void> => {
    await api.delete(`/admin/tenants/${id}`)
  },
}


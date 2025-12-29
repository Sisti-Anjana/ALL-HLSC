import api from './api'
import { ApiResponse } from '../types/api.types'
import { Issue, CreateIssueData, UpdateIssueData } from '../types/issue.types'

export interface IssueFilters {
  portfolio_id?: string
  status?: string
  severity?: string
  issue_hour?: number
  search?: string
  description?: string // For filtering by description (e.g., '!No issue' to exclude "No issue" entries)
}

export const issueService = {
  getAll: async (filters?: IssueFilters): Promise<Issue[]> => {
    const params = new URLSearchParams()
    if (filters?.portfolio_id) params.append('portfolio_id', filters.portfolio_id)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.issue_hour !== undefined) params.append('issue_hour', filters.issue_hour.toString())
    if (filters?.description) params.append('description', filters.description)
    if (filters?.search) params.append('search', filters.search)

    const response = await api.get<ApiResponse<Issue[]>>(`/issues?${params.toString()}`)
    return response.data.data || []
  },

  getById: async (id: string): Promise<Issue> => {
    const response = await api.get<ApiResponse<Issue>>(`/issues/${id}`)
    return response.data.data!
  },

  create: async (data: CreateIssueData): Promise<Issue> => {
    const response = await api.post<ApiResponse<Issue>>('/issues', data)
    return response.data.data!
  },

  update: async (id: string, data: UpdateIssueData): Promise<Issue> => {
    const response = await api.put<ApiResponse<Issue>>(`/issues/${id}`, data)
    return response.data.data!
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/issues/${id}`)
  },

  export: async (filters?: IssueFilters): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/issues/export', { filters })
    return response.data.data
  },
}


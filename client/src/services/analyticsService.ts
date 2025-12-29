import api from './api'
import { ApiResponse } from '../types/api.types'
import {
  DashboardStats,
  HourlyCoverage,
  IssuesOverTime,
  PortfolioHeatmap,
  CoverageMatrix,
  PortfolioActivity,
} from '../types/analytics.types'

export const analyticsService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<DashboardStats>>('/analytics/dashboard')
    return response.data.data!
  },

  getHourlyCoverage: async (): Promise<HourlyCoverage[]> => {
    const response = await api.get<ApiResponse<HourlyCoverage[]>>('/analytics/hourly-coverage')
    return response.data.data || []
  },

  getIssuesOverTime: async (days: number = 30): Promise<IssuesOverTime[]> => {
    const response = await api.get<ApiResponse<IssuesOverTime[]>>(`/analytics/issues-over-time?days=${days}`)
    return response.data.data || []
  },

  getPortfolioHeatmap: async (): Promise<PortfolioHeatmap[]> => {
    const response = await api.get<ApiResponse<PortfolioHeatmap[]>>('/analytics/portfolio-heatmap')
    return response.data.data || []
  },

  getCoverageMatrix: async (): Promise<CoverageMatrix> => {
    const response = await api.get<ApiResponse<CoverageMatrix>>('/analytics/coverage-matrix')
    return response.data.data!
  },

  getPortfolioActivity: async (): Promise<PortfolioActivity[]> => {
    try {
      const response = await api.get<ApiResponse<PortfolioActivity[]>>('/analytics/portfolio-activity')
      console.log('Portfolio activity API response:', response.data)
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      return []
    } catch (error: any) {
      console.error('Error fetching portfolio activity:', error)
      console.error('Error response:', error.response?.data)
      throw error
    }
  },

  getHourlyCoverageWithDateRange: async (startDate?: string, endDate?: string): Promise<HourlyCoverage[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const queryString = params.toString()
    const url = `/analytics/hourly-coverage-range${queryString ? `?${queryString}` : ''}`
    const response = await api.get<ApiResponse<HourlyCoverage[]>>(url)
    return response.data.data || []
  },
}


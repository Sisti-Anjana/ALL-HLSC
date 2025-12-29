import api from './api'
import { ApiResponse } from '../types/api.types'
import { Portfolio, CreatePortfolioData, UpdatePortfolioData } from '../types/portfolio.types'

export const portfolioService = {
  getAll: async (): Promise<Portfolio[]> => {
    const response = await api.get<ApiResponse<Portfolio[]>>('/portfolios')
    return response.data.data || []
  },

  getById: async (id: string): Promise<Portfolio> => {
    const response = await api.get<ApiResponse<Portfolio>>(`/portfolios/${id}`)
    return response.data.data!
  },

  create: async (data: CreatePortfolioData): Promise<Portfolio> => {
    const response = await api.post<ApiResponse<Portfolio>>('/portfolios', data)
    return response.data.data!
  },

  update: async (id: string, data: UpdatePortfolioData): Promise<Portfolio> => {
    const response = await api.put<ApiResponse<Portfolio>>(`/portfolios/${id}`, data)
    return response.data.data!
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/portfolios/${id}`)
  },

  lock: async (id: string, issueHour: number): Promise<any> => {
    const response = await api.post<ApiResponse<any>>(`/portfolios/${id}/lock`, { issueHour })
    return response.data.data
  },

  unlock: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/portfolios/${id}/unlock`, { reason })
  },

  updateAllSitesChecked: async (
    id: string,
    data: {
      allSitesChecked: 'Yes' | 'No' | 'Pending'
      hour?: number
      date?: string
      checkedBy?: string
      notes?: string
    }
  ): Promise<Portfolio> => {
    const response = await api.put<ApiResponse<Portfolio>>(`/portfolios/${id}/all-sites-checked`, data)
    return response.data.data!
  },
}


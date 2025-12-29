import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { analyticsService } from '../services/analytics.service'

export const analyticsController = {
  getDashboardStats: async (req: AuthRequest, res: Response) => {
    try {
      const stats = await analyticsService.getDashboardStats(req.tenantId || null)
      res.json({ success: true, data: stats })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getHourlyCoverage: async (req: AuthRequest, res: Response) => {
    try {
      const data = await analyticsService.getHourlyCoverage(req.tenantId || null)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getIssuesOverTime: async (req: AuthRequest, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30
      const data = await analyticsService.getIssuesOverTime(req.tenantId || null, days)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getPortfolioHeatmap: async (req: AuthRequest, res: Response) => {
    try {
      const data = await analyticsService.getPortfolioHeatmap(req.tenantId || null)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getCoverageMatrix: async (req: AuthRequest, res: Response) => {
    try {
      const data = await analyticsService.getCoverageMatrix(req.tenantId || null)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getPortfolioActivity: async (req: AuthRequest, res: Response) => {
    try {
      console.log('Getting portfolio activity for tenant:', req.tenantId)
      const data = await analyticsService.getPortfolioActivity(req.tenantId || null)
      console.log('Portfolio activity data:', data)
      res.json({ success: true, data })
    } catch (error: any) {
      console.error('Error in getPortfolioActivity:', error)
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getHourlyCoverageWithDateRange: async (req: AuthRequest, res: Response) => {
    try {
      const startDate = req.query.startDate as string | undefined
      const endDate = req.query.endDate as string | undefined
      const data = await analyticsService.getHourlyCoverageWithDateRange(
        req.tenantId || null,
        startDate,
        endDate
      )
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
}


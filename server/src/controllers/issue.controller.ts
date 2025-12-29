import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { issueService } from '../services/issue.service'

export const issueController = {
  getAll: async (req: AuthRequest, res: Response) => {
    try {
      const issues = await issueService.getAll(req.tenantId || null, req.query)
      res.json({ success: true, data: issues })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const issue = await issueService.getById(req.tenantId, req.params.id)
      res.json({ success: true, data: issue })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const issue = await issueService.create(req.tenantId, {
        ...req.body,
        created_by: req.user!.userId,
      }, req.user!.email)
      res.json({ success: true, data: issue })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const issue = await issueService.update(req.tenantId, req.params.id, req.body)
      res.json({ success: true, data: issue })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      await issueService.delete(req.tenantId, req.params.id)
      res.json({ success: true, message: 'Issue deleted successfully' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  export: async (req: AuthRequest, res: Response) => {
    try {
      const issues = await issueService.getAll(req.user!.tenantId, req.body.filters)
      // TODO: Implement Excel/CSV export
      res.json({ success: true, data: issues, message: 'Export functionality coming soon' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
}


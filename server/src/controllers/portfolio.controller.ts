import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { portfolioService } from '../services/portfolio.service'
import { adminService } from '../services/admin.service'
import { supabase } from '../config/database.config'

export const portfolioController = {
  getAll: async (req: AuthRequest, res: Response) => {
    try {
      const portfolios = await portfolioService.getAll(req.tenantId || null)
      res.json({ success: true, data: portfolios })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const portfolio = await portfolioService.getById(req.tenantId, req.params.id)
      res.json({ success: true, data: portfolio })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const portfolio = await portfolioService.create(req.tenantId, req.body)
      res.json({ success: true, data: portfolio })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const portfolio = await portfolioService.update(req.tenantId, req.params.id, req.body)
      res.json({ success: true, data: portfolio })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      await portfolioService.delete(req.tenantId, req.params.id)
      res.json({ success: true, message: 'Portfolio deleted successfully' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  lock: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client/tenant first. Locks require a tenant ID.' })
      }

      if (req.body.issueHour === undefined || req.body.issueHour === null) {
        return res.status(400).json({ success: false, error: 'issueHour is required' })
      }

      const issueHour = parseInt(String(req.body.issueHour))
      if (isNaN(issueHour) || issueHour < 0 || issueHour > 23) {
        return res.status(400).json({ success: false, error: `issueHour must be a number between 0 and 23, got: ${req.body.issueHour}` })
      }

      if (!req.user?.email) {
        return res.status(400).json({ success: false, error: 'User not authenticated' })
      }

      const lock = await portfolioService.lock(
        req.tenantId,
        req.params.id,
        req.user.email,
        issueHour
      )
      res.json({ success: true, data: lock })
    } catch (error: any) {
      console.error('Error in lock controller:', error)
      res.status(400).json({ success: false, error: error.message })
    }
  },

  unlock: async (req: AuthRequest, res: Response) => {
    try {
      const reason = req.body?.reason || ''
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      if (!req.user?.email) {
        return res.status(400).json({ success: false, error: 'User not authenticated' })
      }
      await portfolioService.unlock(req.tenantId, req.params.id, req.user.email)
      console.log('Portfolio unlocked by user', { user: req.user.email, portfolioId: req.params.id, reason })
      res.json({ success: true, message: 'Portfolio unlocked successfully' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  updateAllSitesChecked: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }

      if (!req.user?.userId) {
        return res.status(400).json({ success: false, error: 'User not authenticated' })
      }

      // Use the authenticated user's ID (UUID) instead of the body value
      // This ensures we always use a valid UUID
      const updateData: any = {
        all_sites_checked: req.body.allSitesChecked,
        all_sites_checked_by: req.user.userId, // Use authenticated user's UUID
      }

      // Only update date/hour if "Yes" is selected
      if (req.body.allSitesChecked === 'Yes') {
        const currentHour = new Date().getHours()
        const checkedHour = req.body.hour !== undefined ? req.body.hour : currentHour
        const checkedDate = req.body.date || new Date().toISOString().split('T')[0]

        updateData.all_sites_checked_hour = checkedHour
        // Use date string (YYYY-MM-DD) - database column is DATE type
        updateData.all_sites_checked_date = checkedDate
        updateData.all_sites_checked_notes = req.body.notes

        // HISTORICAL LOGGING: Create a log entry for this completion
        // This allows us to count multiple completions of the same portfolio
        try {
          const { data: portfolioInfo } = await supabase
            .from('portfolios')
            .select('name')
            .eq('portfolio_id', req.params.id)
            .single()

          await adminService.createLog(req.tenantId, {
            adminName: (req.user?.email || 'Unknown User').toLowerCase(),
            actionType: 'PORTFOLIO_CHECKED',
            actionDescription: `Portfolio "${portfolioInfo?.name || req.params.id}" marked as checked for hour ${checkedHour}:00`,
            relatedPortfolioId: req.params.id,
            relatedUserId: req.user?.userId,
            metadata: {
              hour: checkedHour,
              date: checkedDate,
              notes: req.body.notes
            }
          })
        } catch (logError) {
          console.error('Failed to create historical log for portfolio completion:', logError)
          // Don't fail the primary update if logging fails
        }
      } else {
        // If "No", clear the date and hour
        updateData.all_sites_checked_date = null
        updateData.all_sites_checked_hour = null
        updateData.all_sites_checked_notes = req.body.notes
      }

      const portfolio = await portfolioService.update(req.tenantId, req.params.id, updateData)

      // AUTOMATIC UNLOCK: If "Yes" is selected, release any active lock for this portfolio
      if (req.body.allSitesChecked === 'Yes' && req.user?.email) {
        try {
          // Attempt to unlock the portfolio - this is optional but recommended
          await portfolioService.unlock(req.tenantId, req.params.id, req.user.email)
          console.log(`Successfully auto-unlocked portfolio ${req.params.id} after marking as checked`)
        } catch (unlockError: any) {
          // If unlock fails (e.g. no lock exists), just log it and continue
          // No need to fail the entire request since the check status was already saved
          console.log(`Auto-unlock skipped or failed for portfolio ${req.params.id}: ${unlockError.message}`)
        }
      }

      res.json({ success: true, data: portfolio })
    } catch (error: any) {
      console.error('Error updating all sites checked:', error)
      res.status(400).json({ success: false, error: error.message })
    }
  },
}


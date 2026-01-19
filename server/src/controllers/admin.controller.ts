import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { adminService } from '../services/admin.service'

export const adminController = {
  getUsers: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const users = await adminService.getUsers(req.tenantId)
      res.json({ success: true, data: users })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  createUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      console.log('Creating user with data:', {
        email: req.body.email,
        fullName: req.body.fullName,
        role: req.body.role,
        hasPassword: !!req.body.password,
        tenantId: req.tenantId,
      })
      const user = await adminService.createUser(req.tenantId, req.body)
      res.json({ success: true, data: user })
    } catch (error: any) {
      console.error('Error creating user:', error)
      res.status(400).json({ success: false, error: error.message })
    }
  },

  updateUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const user = await adminService.updateUser(req.tenantId, req.params.id, req.body)
      res.json({ success: true, data: user })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  deleteUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      await adminService.deleteUser(req.tenantId, req.params.id)
      res.json({ success: true, message: 'User deleted successfully' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getPersonnel: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const personnel = await adminService.getPersonnel(req.tenantId)
      res.json({ success: true, data: personnel })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  createPersonnel: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const personnel = await adminService.createPersonnel(req.tenantId, req.body)
      res.json({ success: true, data: personnel })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  updatePersonnel: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const personnel = await adminService.updatePersonnel(req.tenantId, req.params.id, req.body)
      res.json({ success: true, data: personnel })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  deletePersonnel: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      await adminService.deletePersonnel(req.tenantId, req.params.id)
      res.json({ success: true, message: 'Personnel deleted successfully' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getLocks: async (req: AuthRequest, res: Response) => {
    try {
      // Cleanup is handled in adminService.getLocks
      const locks = await adminService.getLocks(req.tenantId || null, req.user?.email)
      res.json({ success: true, data: locks })
    } catch (error: any) {
      console.error('Error in getLocks controller:', error)
      res.status(400).json({ success: false, error: error.message })
    }
  },

  unlockPortfolio: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      await adminService.unlockPortfolio(req.tenantId, req.params.id)
      res.json({ success: true, message: 'Portfolio unlocked successfully' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  unlockAllLocksForUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      if (!req.user?.email) {
        return res.status(400).json({ success: false, error: 'User email not found' })
      }
      await adminService.unlockAllLocksForUser(req.tenantId, req.user.email)
      res.json({ success: true, message: 'All your locks have been unlocked' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getLogs: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const logs = await adminService.getLogs(req.tenantId)
      res.json({ success: true, data: logs })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  createLog: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ success: false, error: 'Please select a client first' })
      }
      const log = await adminService.createLog(req.tenantId, {
        ...req.body,
        adminName: req.user!.email,
      })
      res.json({ success: true, data: log })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  // Tenant Management (Super Admin Only)
  getAllTenants: async (req: AuthRequest, res: Response) => {
    try {
      // Only super_admin can access this
      if (req.user!.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Super admin only.' })
      }
      const tenants = await adminService.getAllTenants()
      res.json({ success: true, data: tenants })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  getTenantById: async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Super admin only.' })
      }
      const tenant = await adminService.getTenantById(req.params.id)
      res.json({ success: true, data: tenant })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  createTenant: async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Super admin only.' })
      }
      const result = await adminService.createTenant(req.body)
      res.json({ success: true, data: result })
    } catch (error: any) {
      console.error('Error creating tenant:', error)
      res.status(400).json({ success: false, error: error.message })
    }
  },

  updateTenant: async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Super admin only.' })
      }
      const tenant = await adminService.updateTenant(req.params.id, req.body)
      res.json({ success: true, data: tenant })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  deleteTenant: async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Super admin only.' })
      }
      await adminService.deleteTenant(req.params.id)
      res.json({ success: true, message: 'Tenant deleted successfully' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
}


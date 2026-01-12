import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { authService } from '../services/auth.service'

export const authController = {
  login: async (req: Request, res: Response) => {
    try {
      console.log('🔐 Login request received')
      console.log('   Email:', req.body.email)
      console.log('   Password:', req.body.password ? '***' : '(missing)')
      console.log('   TenantId:', req.body.tenantId || '(not specified)')
      const result = await authService.login(req.body)

      // Handle multi-tenant response
      if ('multiple' in result && result.multiple) {
        console.log('🏢 Multiple accounts found, returning selection list')
        res.json({ success: true, data: result })
        return
      }

      console.log('✅ Login successful for:', result.user?.email)
      res.json({ success: true, data: result })
    } catch (error: any) {
      console.error('❌ Login failed with detailed error:')
      console.error('   Message:', error.message)
      console.error('   Name:', error.name)
      console.error('   Cause:', error.cause)
      console.error('   Stack:', error.stack)

      res.status(400).json({
        success: false,
        error: error.message,
        name: error.name,
        cause: error.cause,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  },

  adminLogin: async (req: Request, res: Response) => {
    try {
      console.log('🔐 Admin login request received')
      console.log('   Email:', req.body.email)
      console.log('   Password:', req.body.password ? '***' : '(missing)')
      const result = await authService.adminLogin(req.body)
      console.log('✅ Admin login successful for:', result.user.email)
      res.json({ success: true, data: result })
    } catch (error: any) {
      console.error('❌ Admin login failed:', error.message)
      console.error('   Stack:', error.stack)
      res.status(400).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  },

  register: async (req: Request, res: Response) => {
    try {
      const result = await authService.register(req.body)
      res.json({ success: true, data: result })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  switchTenant: async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.body
      const user = (req as AuthRequest).user

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' })
      }

      console.log('🔄 Tenant switch requested by:', user.email, 'to:', tenantId)
      const result = await authService.switchTenant(user.email, tenantId)

      res.json({ success: true, data: result })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  logout: async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Logged out successfully' })
  },

  refreshToken: async (req: Request, res: Response) => {
    try {
      const result = await authService.refreshToken(req.body)
      res.json({ success: true, data: result })
    } catch (error: any) {
      res.status(401).json({ success: false, error: error.message })
    }
  },

  getCurrentUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' })
      }
      const user = await authService.getCurrentUser(req.user.userId)
      res.json({ success: true, data: user })
    } catch (error: any) {
      res.status(401).json({ success: false, error: error.message })
    }
  },

  forgotPassword: async (req: Request, res: Response) => {
    try {
      await authService.forgotPassword(req.body.email)
      res.json({ success: true, message: 'Password reset email sent' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    try {
      await authService.resetPassword(req.body)
      res.json({ success: true, message: 'Password reset successfully' })
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message })
    }
  },
}


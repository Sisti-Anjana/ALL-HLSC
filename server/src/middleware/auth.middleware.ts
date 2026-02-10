import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.util'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    tenantId: string | null // Super admin can have null tenantId
    email: string
    role: string
  }
  tenantId?: string | null // Added by tenantIsolation middleware
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }

    const decoded = verifyToken(token)
    req.user = decoded as any

    next()
  } catch (error: any) {
    console.error('❌ Auth error:', error.message)
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}


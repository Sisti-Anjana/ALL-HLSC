import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'

/**
 * ⭐ CRITICAL MIDDLEWARE: Tenant Isolation
 * 
 * This middleware ensures that all database queries are automatically
 * filtered by the user's tenant_id, preventing cross-tenant data access.
 * 
 * How it works:
 * 1. Extracts tenant_id from req.user (set by auth.middleware)
 * 2. Attaches tenant_id to request object for easy access
 * 3. All service layer queries MUST use req.tenantId
 * 4. Database RLS policies provide additional protection
 */
export const tenantIsolation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Ensure user is authenticated (should be set by auth.middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      })
    }

    // Super admin can have null tenant_id (not assigned to any client)
    // They can access all tenants by specifying tenant_id in query params
    if (req.user.role === 'super_admin') {
      if (req.query.tenant_id) {
        // Super admin can access any tenant by specifying tenant_id in query
        req.tenantId = req.query.tenant_id as string
      } else {
        // Super admin without tenant_id - set to null (they can access all tenants)
        req.tenantId = null as any
      }
    } else {
      // Regular users and tenant admins must have a tenant_id
      if (!req.user.tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required. Tenant ID not found.',
        })
      }
      req.tenantId = req.user.tenantId
    }

    // Continue to next middleware/route handler
    next()
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Tenant isolation middleware error',
    })
  }
}

/**
 * Middleware to verify that a resource belongs to the user's tenant
 * Use this when accessing resources by ID (e.g., GET /portfolios/:id)
 */
export const verifyTenantOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      })
    }

    // If resource has tenant_id in params or body, verify it matches
    if (req.params.tenant_id && req.params.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Resource does not belong to your tenant',
      })
    }

    // If tenant_id is in body, verify it matches (prevent tampering)
    if (req.body.tenant_id && req.body.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Cannot modify tenant_id',
      })
    }

    // Ensure tenant_id is set correctly (prevent missing tenant_id)
    if (req.method === 'POST' || req.method === 'PUT') {
      req.body.tenant_id = tenantId
    }

    next()
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Tenant ownership verification error',
    })
  }
}


import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import { supabase } from '../config/database.config'

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
        // Super admin explicitly selecting a tenant via query param
        req.tenantId = req.query.tenant_id as string
      } else if (req.user.tenantId) {
        // Super admin logged into a specific tenant context (via token)
        req.tenantId = req.user.tenantId
      } else {
        // Global super admin context (can access all tenants in some endpoints, or none in others)
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

    // Verify tenant status (allow read‑only GET for inactive/suspended tenants)
    // SKIP this check for super_admin so they can reactivate/manage suspended tenants
    if (req.tenantId && req.user.role !== 'super_admin') {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('status')
        .eq('tenant_id', req.tenantId)
        .single()

      if (error || !tenant) {
        return res.status(401).json({
          success: false,
          error: 'Tenant not found or deactivated.',
        })
      }

      if (tenant.status !== 'active') {
        // Allow safe read‑only operations (GET) for inactive tenants
        if (req.method === 'GET') {
          // Continue to next middleware/handler – data can be read
        } else {
          return res.status(403).json({
            success: false,
            error: `Access denied. This tenant is currently ${tenant.status}.`,
          })
        }
      }
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


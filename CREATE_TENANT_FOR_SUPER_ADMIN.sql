-- ============================================
-- Create a Tenant for Super Admin (Optional)
-- ============================================
-- If you don't have a tenant yet, run this first
-- Then use the tenant_id from the result in the super admin script

INSERT INTO tenants (
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan,
    settings
) VALUES (
    'System',                    -- Name for system tenant
    'system',                   -- Subdomain
    'admin@system.com',         -- Contact email
    'active',                   -- Status
    'enterprise',               -- Plan
    '{}'::jsonb                 -- Settings
)
RETURNING tenant_id, name, subdomain;

-- ============================================
-- Copy the tenant_id from above result
-- Then use it in QUICK_CREATE_SUPER_ADMIN.sql
-- ============================================


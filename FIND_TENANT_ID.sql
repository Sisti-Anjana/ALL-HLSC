-- ============================================
-- Find Your Tenant ID
-- ============================================
-- Run this query first to find your tenant_id
-- Then use that tenant_id in the super admin creation script

SELECT 
    tenant_id,
    name,
    subdomain,
    contact_email,
    status,
    created_at
FROM tenants
ORDER BY created_at DESC;

-- ============================================
-- After running above, copy the tenant_id
-- and use it in QUICK_CREATE_SUPER_ADMIN.sql
-- ============================================


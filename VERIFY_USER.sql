-- ============================================
-- Verify CleanLeaf Tenant and User
-- ============================================
-- Run these queries to check if everything is set up correctly

-- Check if tenant exists
SELECT 
    tenant_id,
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan,
    created_at
FROM tenants
WHERE tenant_id = 'efe6334f-2a03-4ace-9ff0-e384d5824edd';

-- Check if user exists
SELECT 
    user_id,
    email,
    full_name,
    role,
    is_active,
    tenant_id,
    created_at
FROM users
WHERE tenant_id = 'efe6334f-2a03-4ace-9ff0-e384d5824edd'
  AND email = 'admin@cleanleaf.com';

-- ============================================
-- If both queries return results, you're all set!
-- ============================================




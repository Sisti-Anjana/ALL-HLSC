-- ============================================
-- Complete Check for Super Admin User
-- ============================================
-- Run this to verify everything is correct

-- 1. Check user exists and get details
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    u.role,
    u.tenant_id,
    u.is_active,
    CASE WHEN u.password_hash IS NOT NULL THEN true ELSE false END as has_password_hash,
    LENGTH(u.password_hash::text) as hash_length,
    t.name as tenant_name,
    t.status as tenant_status
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.tenant_id
WHERE u.email = 'ShreeY@amgsol.com';

-- ============================================
-- Expected Results:
-- ============================================
-- ✅ user_id: Should show a UUID
-- ✅ email: ShreeY@amgsol.com
-- ✅ role: super_admin
-- ✅ tenant_id: Should match your tenant (efe6334f-2a03-4ace-9ff0-e384d5824edd)
-- ✅ is_active: true
-- ✅ has_password_hash: true
-- ✅ hash_length: Should be around 60 characters
-- ✅ tenant_name: Should show your tenant name (e.g., CleanLeaf)
-- ✅ tenant_status: active
--
-- If tenant_name is NULL, that's the problem!
-- The tenant relationship is missing.
-- ============================================

-- ============================================
-- If tenant_name is NULL, run this to verify tenant exists:
-- ============================================
SELECT tenant_id, name, status 
FROM tenants 
WHERE tenant_id = 'efe6334f-2a03-4ace-9ff0-e384d5824edd';


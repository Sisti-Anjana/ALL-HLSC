-- ============================================
-- Remove Tenant Assignment from Super Admin
-- ============================================
-- This script removes the tenant assignment from the super admin user
-- Super admins should not be assigned to any specific client/tenant

UPDATE users
SET tenant_id = NULL
WHERE email = 'ShreeY@amgsol.com' 
  AND role = 'super_admin';

-- ============================================
-- Verify the update
-- ============================================
SELECT 
    user_id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    CASE 
        WHEN tenant_id IS NULL THEN '✅ No tenant assigned (Correct for super admin)'
        ELSE '❌ Still assigned to tenant: ' || tenant_id
    END as status
FROM users 
WHERE email = 'ShreeY@amgsol.com' 
  AND role = 'super_admin';

-- ============================================
-- Expected Result:
-- ============================================
-- tenant_id: NULL
-- status: ✅ No tenant assigned (Correct for super admin)
-- ============================================


-- ============================================
-- Complete User Verification
-- ============================================
-- Run this to verify ALL aspects of the user account

SELECT 
    u.user_id,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.tenant_id,
    u.password_hash IS NOT NULL as has_password,
    t.name as tenant_name,
    t.status as tenant_status,
    -- Check if everything is correct
    CASE 
        WHEN u.is_active = false THEN '❌ USER IS INACTIVE'
        WHEN u.tenant_id IS NULL THEN '❌ NO TENANT ID'
        WHEN u.password_hash IS NULL THEN '❌ NO PASSWORD HASH'
        WHEN t.name IS NULL THEN '❌ TENANT NOT FOUND'
        WHEN t.status != 'active' THEN '⚠️ TENANT NOT ACTIVE'
        ELSE '✅ ALL CHECKS PASSED'
    END as status_check
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.tenant_id
WHERE LOWER(u.email) = LOWER('ShreeY@amgsol.com');

-- ============================================
-- Expected Result:
-- ============================================
-- status_check: ✅ ALL CHECKS PASSED
-- is_active: true
-- tenant_name: Should show your tenant name
-- tenant_status: active
-- ============================================


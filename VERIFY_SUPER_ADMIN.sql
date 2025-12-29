-- ============================================
-- Verify Super Admin User Exists
-- ============================================
-- Run this to check if your super admin user was created

SELECT 
    user_id,
    email,
    full_name,
    role,
    tenant_id,
    is_active,
    created_at
FROM users 
WHERE email = 'ShreeY@amgsol.com';

-- ============================================
-- If the query returns no results, the user doesn't exist
-- Run QUICK_CREATE_SUPER_ADMIN.sql again
-- ============================================

-- ============================================
-- Check if password hash looks correct
-- ============================================
-- Password hash should start with $2b$10$
-- If it doesn't, the hash is incorrect

SELECT 
    email,
    CASE 
        WHEN password_hash LIKE '$2b$10$%' THEN '✅ Hash format looks correct'
        ELSE '❌ Hash format is incorrect'
    END as hash_status,
    LENGTH(password_hash) as hash_length
FROM users 
WHERE email = 'ShreeY@amgsol.com';

-- ============================================
-- Check tenant relationship
-- ============================================
-- Make sure the tenant exists and is linked

SELECT 
    u.user_id,
    u.email,
    u.role,
    u.tenant_id,
    t.name as tenant_name,
    t.status as tenant_status
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.tenant_id
WHERE u.email = 'ShreeY@amgsol.com';


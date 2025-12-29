-- ============================================
-- Complete Fix: Remove Tenant Assignment from Super Admin
-- ============================================
-- Run this script in order to:
-- 1. Allow NULL tenant_id in users table
-- 2. Remove tenant assignment from super admin

-- Step 1: Remove NOT NULL constraint from tenant_id
ALTER TABLE users 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 2: Remove tenant assignment from super admin
UPDATE users
SET tenant_id = NULL
WHERE email = 'ShreeY@amgsol.com' 
  AND role = 'super_admin';

-- ============================================
-- Verify the changes
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


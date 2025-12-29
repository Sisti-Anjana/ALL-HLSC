-- ============================================
-- Allow NULL tenant_id for Super Admin Users
-- ============================================
-- This script removes the NOT NULL constraint from tenant_id column
-- This allows super_admin users to have NULL tenant_id (not assigned to any client)

-- Step 1: Remove the NOT NULL constraint
ALTER TABLE users 
ALTER COLUMN tenant_id DROP NOT NULL;

-- ============================================
-- Verify the constraint was removed
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'tenant_id';

-- ============================================
-- Expected Result:
-- ============================================
-- is_nullable: YES (means NULL values are now allowed)
-- ============================================


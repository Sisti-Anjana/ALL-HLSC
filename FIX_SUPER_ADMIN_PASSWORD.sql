-- ============================================
-- Fix Super Admin Password
-- ============================================
-- If login fails with "Invalid email or password",
-- update the password hash for your super admin user
--
-- STEP 1: Generate a new password hash
-- Run: node server/scripts/hash-password.js YourPassword
-- Copy the hash and paste it below

-- STEP 2: Update the password hash
-- This hash is for password: Admin123!
UPDATE users
SET password_hash = '$2b$10$uwl4fpJwacARLLJySNGk3eQD6pbT0wJkIvy5QfnU6yu4YB4hh5m6C'
WHERE email = 'ShreeY@amgsol.com';

-- STEP 3: Verify the update
SELECT 
    email,
    full_name,
    role,
    is_active,
    CASE 
        WHEN password_hash LIKE '$2b$10$%' THEN '✅ Hash format correct'
        ELSE '❌ Hash format incorrect'
    END as hash_status
FROM users 
WHERE email = 'ShreeY@amgsol.com';

-- ============================================
-- After updating, try logging in again with:
-- Email: ShreeY@amgsol.com
-- Password: (the password you used to generate the hash)
-- ============================================


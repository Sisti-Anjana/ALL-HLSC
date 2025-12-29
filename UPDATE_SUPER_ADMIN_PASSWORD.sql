-- ============================================
-- UPDATE Super Admin Password
-- ============================================
-- Run this to update the password for your super admin user
-- This hash is for password: Shree@2025Y

UPDATE users
SET password_hash = '$2b$10$AXgN3QhN/FlkHhw7kIRtROReHJklDCcIaqSErcqmA.5.QS63uWaAq'
WHERE email = 'ShreeY@amgsol.com';

-- ============================================
-- Verify the update
-- ============================================
SELECT 
    email,
    full_name,
    role,
    is_active,
    'Password updated successfully' as status
FROM users 
WHERE email = 'ShreeY@amgsol.com';

-- ============================================
-- Login Credentials:
-- ============================================
-- Email: ShreeY@amgsol.com
-- Password: Shree@2025Y
-- ============================================


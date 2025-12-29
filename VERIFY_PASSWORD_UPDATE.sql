-- ============================================
-- Verify Password Hash Update
-- ============================================
-- Run this to check if the password hash was actually updated

SELECT 
    email,
    full_name,
    role,
    is_active,
    tenant_id,
    -- Check if password hash matches the expected hash
    CASE 
        WHEN password_hash = '$2b$10$AXgN3QhN/FlkHhw7kIRtROReHJklDCcIaqSErcqmA.5.QS63uWaAq' 
        THEN '✅ CORRECT HASH'
        ELSE '❌ WRONG HASH'
    END as hash_status,
    -- Show first 30 chars of hash
    LEFT(password_hash, 30) || '...' as hash_preview,
    -- Check if hash exists
    CASE 
        WHEN password_hash IS NULL THEN '❌ NO HASH'
        WHEN LENGTH(password_hash) < 50 THEN '❌ INVALID HASH LENGTH'
        ELSE '✅ HASH EXISTS'
    END as hash_check
FROM users 
WHERE email = 'ShreeY@amgsol.com';

-- ============================================
-- Expected Result:
-- ============================================
-- hash_status: ✅ CORRECT HASH
-- hash_check: ✅ HASH EXISTS
-- is_active: true
-- tenant_id: efe6334f-2a03-4ace-9ff0-e384d5824edd
-- ============================================


-- ============================================
-- QUICK: Create Super Admin User
-- ============================================
-- 
-- STEPS:
-- 1. Choose your email and password
-- 2. Generate password hash: node server/scripts/hash-password.js YourPassword
-- 3. Copy the hash from terminal
-- 4. Replace the email and password_hash below
-- 5. Run this query in Supabase SQL Editor

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    NULL,                                   -- ⚠️ Super admin should NOT be assigned to any tenant
    'ShreeY@amgsol.com',                 -- Your super admin email
    '$2b$10$XuYkcZl1z4E3RVWfB0aQs.2RcafG55GLIW2XbwtRW1YZsIn9dGI3C',  -- Password hash
    'Super Admin',                           -- Full name (you can change this too)
    'super_admin',                           -- ⚠️ MUST be exactly 'super_admin'
    true
)
RETURNING user_id, email, full_name, role;

-- ============================================
-- HOW TO CHANGE EMAIL AND PASSWORD:
-- ============================================
-- 
-- TO CHANGE EMAIL:
--   Just replace 'superadmin@system.com' with your desired email
--
-- TO CHANGE PASSWORD:
--   1. Run: node server/scripts/hash-password.js YourNewPassword
--   2. Copy the hash from terminal output
--   3. Replace the password_hash value above with your new hash
--
-- EXAMPLE:
--   If you want email: admin@mycompany.com
--   And password: MySecurePass123!
--   
--   1. Run: node server/scripts/hash-password.js MySecurePass123!
--   2. Copy the hash (starts with $2b$10$...)
--   3. Update the VALUES above:
--      email: 'admin@mycompany.com'
--      password_hash: 'PASTE_YOUR_NEW_HASH_HERE'
--
-- ============================================
-- DONE! Login Credentials:
-- ============================================
-- Email: (whatever you set above)
-- Password: (whatever password you used to generate the hash)
--
-- After logging in, you'll see the "Clients" tab in Admin Panel!


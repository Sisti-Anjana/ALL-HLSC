-- ============================================
-- STEP 2: Create Admin User for CleanLeaf
-- ============================================
-- Your tenant_id: efe6334f-2a03-4ace-9ff0-e384d5824edd
-- Just copy and run this query in Supabase SQL Editor

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'efe6334f-2a03-4ace-9ff0-e384d5824edd',
    'admin@cleanleaf.com',
    '$2b$10$C/43nIRlXE0QmBt11e3OJ.bi/A1gxaSHmfMgKepgqjVJM9zbFU/ue',
    'Shree',
    'tenant_admin',
    true
)
RETURNING user_id, email, full_name, role;

-- ============================================
-- DONE!
-- ============================================
-- After running this, you can log in with:
-- Email: admin@cleanleaf.com
-- Password: (the password you used when generating the hash)




-- ============================================
-- Create Tenant: CleanLeaf
-- ============================================
-- Run Step 1 FIRST, then copy the tenant_id and run Step 2

-- ============================================
-- STEP 1: Create the Tenant
-- ============================================
-- Run this query FIRST and copy the tenant_id from the result

INSERT INTO tenants (
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan,
    settings
) VALUES (
    'CleanLeaf',
    'cleanleaf',
    'admin@cleanleaf.com',
    'active',
    'pro',
    '{}'::jsonb
)
RETURNING tenant_id, name, subdomain;

-- ============================================
-- STEP 2: Create Admin User
-- ============================================
-- ⚠️ IMPORTANT: Replace 'YOUR_TENANT_ID' below with the actual UUID from Step 1
-- The tenant_id will look like: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- Copy the ENTIRE UUID and paste it below

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'efe6334f-2a03-4ace-9ff0-e384d5824edd',  -- ✅ Your tenant_id
    'admin@cleanleaf.com',
    '$2b$10$C/43nIRlXE0QmBt11e3OJ.bi/A1gxaSHmfMgKepgqjVJM9zbFU/ue',
    'Shree',
    'tenant_admin',  -- Must be: 'tenant_admin', 'user', or 'super_admin'
    true
)
RETURNING user_id, email, full_name, role;

-- ============================================
-- DONE!
-- ============================================
-- After running both steps, you can log in with:
-- Email: admin@cleanleaf.com
-- Password: (the password you used when generating the hash)


-- ============================================
-- QUICK COPY: Create CleanLeaf Tenant
-- ============================================
-- Copy and run these queries ONE AT A TIME in Supabase SQL Editor

-- ============================================
-- QUERY 1: Create Tenant (Run this FIRST)
-- ============================================
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
-- AFTER RUNNING QUERY 1:
-- 1. Look at the results below
-- 2. Copy the tenant_id (the UUID)
-- 3. Paste it in QUERY 2 below where it says 'PASTE_TENANT_ID_HERE'
-- ============================================

-- ============================================
-- QUERY 2: Create Admin User (Run this SECOND)
-- ============================================
-- ⚠️ REPLACE 'PASTE_TENANT_ID_HERE' with the UUID from Query 1

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'PASTE_TENANT_ID_HERE',  -- ⬅️ REPLACE THIS with tenant_id from Query 1
    'admin@cleanleaf.com',
    '$2b$10$C/43nIRlXE0QmBt11e3OJ.bi/A1gxaSHmfMgKepgqjVJM9zbFU/ue',
    'Shree',
    'tenant_admin',
    true
)
RETURNING user_id, email, full_name, role;

-- ============================================
-- DONE! You can now log in with:
-- Email: admin@cleanleaf.com
-- Password: (the password you used to generate the hash)
-- ============================================




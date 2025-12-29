-- ============================================
-- Script to Create Super Admin User
-- ============================================
-- This script creates a super admin user who can manage all clients/tenants
-- Run this in your Supabase SQL Editor
--
-- IMPORTANT: Super admin needs a tenant_id, so we'll either:
-- 1. Use an existing tenant (like CleanLeaf), OR
-- 2. Create a "System" tenant for super admin
--
-- Option 1 is simpler - we'll use CleanLeaf tenant for now
-- Option 2 is better for production - create a dedicated system tenant

-- ============================================
-- OPTION 1: Create Super Admin in Existing Tenant (Quick)
-- ============================================
-- ⚠️ REPLACE 'YOUR_TENANT_ID' with an existing tenant_id (e.g., CleanLeaf's tenant_id)
-- You can find tenant_id by running: SELECT tenant_id, name FROM tenants;

-- Step 1: Generate password hash
-- Run this command in terminal: node server/scripts/hash-password.js yourpassword123
-- Copy the hash and paste it below

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'YOUR_TENANT_ID',              -- ⚠️ REPLACE: Use CleanLeaf's tenant_id or any existing tenant
    'superadmin@system.com',       -- ⚠️ Super admin email (change if needed)
    '$2b$10$YOUR_PASSWORD_HASH',   -- ⚠️ PASTE: The bcrypt hash from password generator
    'Super Admin',                 -- Full name
    'super_admin',                 -- ⚠️ Role MUST be exactly 'super_admin'
    true                           -- Active
)
RETURNING user_id, email, full_name, role, tenant_id;

-- ============================================
-- OPTION 2: Create System Tenant + Super Admin (Recommended for Production)
-- ============================================
-- This creates a dedicated "System" tenant for super admin operations

-- Step 1: Create System Tenant
INSERT INTO tenants (
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan,
    settings
) VALUES (
    'System',
    'system',
    'admin@system.com',
    'active',
    'enterprise',
    '{}'::jsonb
)
RETURNING tenant_id, name, subdomain;

-- Step 2: Copy the tenant_id from above, then create super admin user
-- ⚠️ REPLACE 'SYSTEM_TENANT_ID' with the tenant_id from Step 1
-- ⚠️ Generate password hash: node server/scripts/hash-password.js yourpassword123

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'SYSTEM_TENANT_ID',            -- ⚠️ PASTE: tenant_id from Step 1
    'superadmin@system.com',       -- Super admin email
    '$2b$10$YOUR_PASSWORD_HASH',   -- ⚠️ PASTE: bcrypt hash from password generator
    'Super Admin',                 -- Full name
    'super_admin',                 -- ⚠️ Role MUST be exactly 'super_admin'
    true                           -- Active
)
RETURNING user_id, email, full_name, role, tenant_id;

-- ============================================
-- DONE!
-- ============================================
-- After running the script, you can log in with:
-- Email: superadmin@system.com (or whatever email you used)
-- Password: (the password you used when generating the hash)
--
-- Once logged in as super admin:
-- 1. Go to Admin Panel
-- 2. You'll see a "Clients" tab (only visible to super_admin)
-- 3. You can create new clients/tenants from there!

-- ============================================
-- VERIFICATION
-- ============================================
-- To verify super admin was created, run:

-- SELECT user_id, email, full_name, role, is_active, tenant_id
-- FROM users 
-- WHERE role = 'super_admin';

-- ============================================
-- QUICK EXAMPLE (Using CleanLeaf Tenant)
-- ============================================
-- If CleanLeaf tenant_id is: efe6334f-2a03-4ace-9ff0-e384d5824edd
-- And you want password: Admin123!
-- 
-- 1. Generate hash: node server/scripts/hash-password.js Admin123!
-- 2. Copy the hash
-- 3. Run:

-- INSERT INTO users (
--     tenant_id,
--     email,
--     password_hash,
--     full_name,
--     role,
--     is_active
-- ) VALUES (
--     'efe6334f-2a03-4ace-9ff0-e384d5824edd',  -- CleanLeaf tenant_id
--     'superadmin@system.com',
--     'PASTE_HASH_HERE',                       -- Hash from step 1
--     'Super Admin',
--     'super_admin',
--     true
-- )
-- RETURNING user_id, email, full_name, role;


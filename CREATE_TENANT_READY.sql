-- ============================================
-- READY-TO-USE Script: Create New Tenant
-- ============================================
-- Password hash is already included!
-- Just replace the tenant details below

-- ============================================
-- STEP 1: Create the Tenant
-- ============================================
-- Replace these values with your client's information:

INSERT INTO tenants (
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan,
    settings
) VALUES (
    'Your Client Name Here',          -- ⬅️ CHANGE THIS: Company name
    'clientname',                     -- ⬅️ CHANGE THIS: Subdomain (lowercase, no spaces)
    'admin@client.com',               -- ⬅️ CHANGE THIS: Contact email
    'active',                         -- Status: 'active', 'inactive', or 'suspended'
    'basic',                          -- Plan: 'basic', 'pro', or 'enterprise'
    '{}'::jsonb                       -- Custom settings (JSON object)
)
RETURNING tenant_id, name, subdomain;

-- ============================================
-- STEP 2: Copy the tenant_id from above
-- ============================================
-- After running Step 1, copy the tenant_id UUID
-- Then replace 'YOUR_TENANT_ID' in Step 3 below

-- ============================================
-- STEP 3: Create First Admin User
-- ============================================
-- Replace 'YOUR_TENANT_ID' with the tenant_id from Step 1
-- Password hash is already included: $2b$10$C/43nIRlXE0QmBt11e3OJ.bi/A1gxaSHmfMgKepgqjVJM9zbFU/ue

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'YOUR_TENANT_ID',                 -- ⬅️ REPLACE: Paste tenant_id from Step 1
    'admin@client.com',               -- ⬅️ CHANGE THIS: Admin email (match contact_email above)
    '$2b$10$C/43nIRlXE0QmBt11e3OJ.bi/A1gxaSHmfMgKepgqjVJM9zbFU/ue',   -- ✅ Password hash (already set)
    'Admin User',                     -- ⬅️ CHANGE THIS: Admin's full name
    'tenant_admin',                   -- Role: 'tenant_admin' or 'user'
    true                              -- Active status
)
RETURNING user_id, email, full_name, role;

-- ============================================
-- DONE! 
-- ============================================
-- The tenant and admin user are now created
-- Admin can log in with the email and password you used

-- ============================================
-- REMEMBER:
-- ============================================
-- 1. The password hash corresponds to the password you entered
--    when you ran: node server/scripts/hash-password.js <password>
-- 2. Use that same password when logging in
-- 3. If you forgot the password, generate a new hash and update this script




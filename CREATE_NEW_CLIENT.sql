-- ============================================
-- Script to Create a New Client (Tenant)
-- ============================================
-- This script creates a new tenant/client and their first admin user
-- Run this in your Supabase SQL Editor or PostgreSQL client
--
-- INSTRUCTIONS:
-- 1. Replace all the values marked with ⚠️ below
-- 2. Run STEP 1 first
-- 3. Copy the tenant_id from STEP 1 result
-- 4. Paste it into STEP 2 where it says 'YOUR_TENANT_ID'
-- 5. Generate a password hash (see instructions below)
-- 6. Run STEP 2

-- ============================================
-- STEP 1: Create the Tenant (Client)
-- ============================================
-- ⚠️ REPLACE THESE VALUES with your new client's information:

INSERT INTO tenants (
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan,
    settings
) VALUES (
    'Your New Client Name',        -- ⚠️ Company/Client name (e.g., 'Standard Solar', 'Green Energy Co')
    'yourclientname',              -- ⚠️ Subdomain (lowercase, no spaces, e.g., 'standardsolar', 'greenenergy')
    'admin@yourclient.com',        -- ⚠️ Contact email for this client
    'active',                      -- Status: 'active', 'inactive', or 'suspended'
    'basic',                       -- Plan: 'basic', 'pro', or 'enterprise'
    '{}'::jsonb                    -- Custom settings (leave as {} for now)
)
RETURNING tenant_id, name, subdomain;

-- ============================================
-- STEP 2: Copy the tenant_id from above
-- ============================================
-- After running STEP 1, you'll see a result like:
-- tenant_id                              | name      | subdomain
-- ---------------------------------------+-----------+----------
-- a1b2c3d4-e5f6-7890-abcd-ef1234567890  | Your New Client Name | yourclientname
--
-- ⚠️ COPY the tenant_id UUID (the long string like a1b2c3d4-e5f6-7890-abcd-ef1234567890)

-- ============================================
-- STEP 3: Generate Password Hash
-- ============================================
-- You need to generate a bcrypt hash for the admin password.
-- 
-- Option A: Use Node.js script (if available):
--   node server/scripts/hash-password.js yourpassword123
--
-- Option B: Use online tool:
--   Go to https://bcrypt-generator.com/
--   Enter your password and click "Generate"
--   Copy the hash (starts with $2b$10$)
--
-- Option C: Use Node.js directly:
--   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('yourpassword123', 10).then(h => console.log(h));"

-- ============================================
-- STEP 4: Create First Admin User
-- ============================================
-- ⚠️ REPLACE 'YOUR_TENANT_ID' with the tenant_id you copied from STEP 1
-- ⚠️ REPLACE the password_hash with the hash you generated in STEP 3
-- ⚠️ Update email, full_name, and other values as needed

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'YOUR_TENANT_ID',              -- ⚠️ PASTE the tenant_id UUID from STEP 1 here
    'admin@yourclient.com',        -- ⚠️ Admin email (can be same as contact_email or different)
    '$2b$10$YOUR_PASSWORD_HASH',   -- ⚠️ PASTE the bcrypt hash from STEP 3 here
    'Admin User',                  -- ⚠️ Full name of the admin user
    'tenant_admin',                -- ⚠️ Role MUST be: 'tenant_admin' (for admin access)
    true                            -- Active status (true = can log in)
)
RETURNING user_id, email, full_name, role;

-- ============================================
-- DONE! 
-- ============================================
-- The new client (tenant) and admin user are now created!
-- 
-- Next Steps:
-- 1. The admin can log in using the email and password you set
-- 2. Admin can create portfolios via Admin Panel → Portfolios
-- 3. Admin can create users via Admin Panel → Users
-- 4. Admin can add personnel via Admin Panel → Personnel
-- 5. Users can then log in and start logging issues

-- ============================================
-- VERIFICATION
-- ============================================
-- To verify everything was created correctly, run:

-- Check tenant was created:
-- SELECT tenant_id, name, subdomain, status, created_at 
-- FROM tenants 
-- WHERE name = 'Your New Client Name';

-- Check admin user was created:
-- SELECT user_id, email, full_name, role, tenant_id, is_active
-- FROM users 
-- WHERE tenant_id = 'YOUR_TENANT_ID';


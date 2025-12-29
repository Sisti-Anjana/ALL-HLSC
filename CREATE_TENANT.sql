-- ============================================
-- Script to Create a New Tenant (Client)
-- ============================================
-- This script creates a new tenant and their first admin user
-- Run this in your Supabase SQL Editor or PostgreSQL client

-- ============================================
-- STEP 1: Create the Tenant
-- ============================================
-- Replace the values below with your client's information

INSERT INTO tenants (
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan,
    settings
) VALUES (
    'CleanLeaf',           -- Company name
    'cleanleaf',                     -- Subdomain (lowercase, no spaces)
    'admin@cleanleaf.com',           -- Contact email
    'active',                         -- Status: 'active', 'inactive', or 'suspended'
    'pro',                            -- Plan: 'basic', 'pro', or 'enterprise'
    '{}'::jsonb                       -- Custom settings (JSON object)
)
RETURNING tenant_id, name, subdomain;

-- ============================================
-- STEP 2: Note the tenant_id from above
-- ============================================
-- Copy the tenant_id UUID that was returned
-- You'll need it for the next step

-- ============================================
-- STEP 3: Create First Admin User
-- ============================================
-- Replace 'YOUR_TENANT_ID' with the tenant_id from Step 1
-- Replace password_hash with a bcrypt hash of your password
-- 
-- To generate password hash, you can:
-- 1. Use Node.js: require('bcrypt').hashSync('yourpassword', 10)
-- 2. Use online bcrypt generator: https://bcrypt-generator.com/
-- 3. Or use the helper script: node server/scripts/hash-password.js yourpassword

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'YOUR_TENANT_ID',                 -- ⚠️ REPLACE THIS: Copy the tenant_id UUID from Step 1 result
    'admin@cleanleaf.com',          -- Admin email (same as contact_email or different)
    '$2b$10$C/43nIRlXE0QmBt11e3OJ.bi/A1gxaSHmfMgKepgqjVJM9zbFU/ue',   -- Your generated password hash
    'Shree',                     -- Full name
    'tenant_admin',                   -- ⚠️ Role MUST be: 'tenant_admin', 'user', or 'super_admin'
    true                              -- Active status
)
RETURNING user_id, email, full_name, role;

-- ============================================
-- DONE! 
-- ============================================
-- The tenant and admin user are now created
-- The admin can log in and start creating portfolios, users, etc.


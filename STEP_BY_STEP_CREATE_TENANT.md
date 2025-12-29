# Step-by-Step: Create a New Tenant (Client)

## 🎯 What You're Doing
Creating a new client called "CleanLeaf" with an admin user who can log in.

---

## 📋 STEP 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"**

---

## 📋 STEP 2: Create the Tenant

1. **Copy and paste this SQL query** into the SQL Editor:

```sql
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
```

2. Click **"Run"** (or press F5)

3. **IMPORTANT:** Look at the results below. You will see something like:

```
tenant_id                              | name      | subdomain
---------------------------------------+-----------+----------
a1b2c3d4-e5f6-7890-abcd-ef1234567890  | CleanLeaf | cleanleaf
```

4. **COPY the tenant_id** (the long UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
   - Click on it and copy it
   - Or select the entire UUID and copy it

---

## 📋 STEP 3: Create the Admin User

1. **Copy this SQL query**:

```sql
INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'PASTE_TENANT_ID_HERE',
    'admin@cleanleaf.com',
    '$2b$10$C/43nIRlXE0QmBt11e3OJ.bi/A1gxaSHmfMgKepgqjVJM9zbFU/ue',
    'Shree',
    'tenant_admin',
    true
)
RETURNING user_id, email, full_name, role;
```

2. **Replace `'PASTE_TENANT_ID_HERE'`** with the tenant_id you copied from Step 2

   Example: If your tenant_id is `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, change it to:

```sql
INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- ✅ Your actual tenant_id
    'admin@cleanleaf.com',
    '$2b$10$C/43nIRlXE0QmBt11e3OJ.bi/A1gxaSHmfMgKepgqjVJM9zbFU/ue',
    'Shree',
    'tenant_admin',
    true
)
RETURNING user_id, email, full_name, role;
```

3. Click **"Run"** (or press F5)

4. You should see a success message and the user details

---

## ✅ STEP 4: Verify It Worked

1. Check if tenant was created:
   ```sql
   SELECT * FROM tenants WHERE name = 'CleanLeaf';
   ```

2. Check if user was created:
   ```sql
   SELECT * FROM users WHERE email = 'admin@cleanleaf.com';
   ```

---

## 🚀 STEP 5: Test Login

1. Go to your application login page
2. Enter:
   - **Email:** `admin@cleanleaf.com`
   - **Password:** (the password you used when you ran `node server/scripts/hash-password.js <password>`)
3. Click **Login**
4. You should be logged in successfully!

---

## ⚠️ Common Mistakes to Avoid

1. ❌ **Don't use 'AGS01' or any text as tenant_id** - It must be a UUID from Step 2
2. ❌ **Don't skip Step 2** - You MUST run Step 1 first to get the tenant_id
3. ❌ **Don't change the role** - It must be exactly `'tenant_admin'`, `'user'`, or `'super_admin'`
4. ❌ **Don't forget to replace** `'PASTE_TENANT_ID_HERE'` with the actual UUID

---

## 📝 Quick Reference

**Tenant Details:**
- Name: CleanLeaf
- Subdomain: cleanleaf
- Email: admin@cleanleaf.com
- Admin Name: Shree
- Role: tenant_admin

**Password Hash:** Already included in the SQL (you need to remember the original password you used to generate it)

---

## 🆘 If Something Goes Wrong

**Error: "invalid input syntax for type uuid"**
- You didn't replace `'PASTE_TENANT_ID_HERE'` with the actual UUID
- Go back to Step 2 and copy the tenant_id correctly

**Error: "duplicate key value violates unique constraint"**
- The tenant or email already exists
- Change the name, subdomain, or email to something unique

**Can't log in**
- Make sure you're using the correct password (the one you used to generate the hash)
- Check that the user was created: `SELECT * FROM users WHERE email = 'admin@cleanleaf.com';`


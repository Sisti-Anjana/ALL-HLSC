# Quick Guide: Creating a New Tenant (Client) in Database

## 🎯 Current Status

**Tenant creation API is not yet implemented**, so we need to create tenants directly in the database for now.

---

## 🚀 Quick Steps

### Option 1: Using SQL Script (Recommended)

1. **Open Supabase SQL Editor** (or your PostgreSQL client)

2. **Run the SQL script** (`CREATE_TENANT.sql`):
   ```sql
   -- Step 1: Create tenant
   INSERT INTO tenants (name, subdomain, contact_email, status, subscription_plan)
   VALUES ('Your Client Name', 'clientname', 'admin@client.com', 'active', 'basic')
   RETURNING tenant_id;
   ```

3. **Copy the `tenant_id`** from the result

4. **Generate password hash**:
   ```bash
   node server/scripts/hash-password.js yourpassword123
   ```

5. **Create admin user** (replace `YOUR_TENANT_ID` and `YOUR_HASHED_PASSWORD`):
   ```sql
   INSERT INTO users (tenant_id, email, password_hash, full_name, role)
   VALUES (
     'YOUR_TENANT_ID',
     'admin@client.com',
     'YOUR_HASHED_PASSWORD',
     'Admin User',
     'tenant_admin'
   );
   ```

6. **Done!** The client can now log in and start using the system.

---

### Option 2: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **Table Editor** → **tenants**

2. Click **"Insert row"**

3. Fill in:
   - **name**: `Your Client Name`
   - **subdomain**: `clientname` (lowercase, no spaces)
   - **contact_email**: `admin@client.com`
   - **status**: `active`
   - **subscription_plan**: `basic`
   - **settings**: `{}`

4. Click **"Save"** and note the `tenant_id`

5. Go to **Table Editor** → **users**

6. Click **"Insert row"**

7. Fill in:
   - **tenant_id**: (paste the tenant_id from step 4)
   - **email**: `admin@client.com`
   - **password_hash**: (generate using the script above)
   - **full_name**: `Admin User`
   - **role**: `tenant_admin`
   - **is_active**: `true`

8. Click **"Save"**

---

## 📝 Example: Creating "Standard Solar" Client

```sql
-- Step 1: Create tenant
INSERT INTO tenants (name, subdomain, contact_email, status, subscription_plan)
VALUES ('Standard Solar', 'standardsolar', 'admin@standardsolar.com', 'active', 'basic')
RETURNING tenant_id;

-- Result: tenant_id = 'abc-123-def-456-uuid'

-- Step 2: Generate password hash
-- Run: node server/scripts/hash-password.js admin123
-- Result: $2b$10$rO8qKxYzAbCdEfGhIjKlM.NxYzAbCdEfGhIjKlM...

-- Step 3: Create admin user
INSERT INTO users (tenant_id, email, password_hash, full_name, role)
VALUES (
  'abc-123-def-456-uuid',
  'admin@standardsolar.com',
  '$2b$10$rO8qKxYzAbCdEfGhIjKlM.NxYzAbCdEfGhIjKlM...',
  'Admin User',
  'tenant_admin'
);
```

---

## ✅ Verification

After creating a tenant, verify it works:

1. **Check tenant was created**:
   ```sql
   SELECT tenant_id, name, subdomain, status FROM tenants WHERE name = 'Your Client Name';
   ```

2. **Check admin user was created**:
   ```sql
   SELECT user_id, email, full_name, role, tenant_id 
   FROM users 
   WHERE tenant_id = 'YOUR_TENANT_ID';
   ```

3. **Try logging in**:
   - Go to login page
   - Use the admin email and password
   - Should successfully log in and see the dashboard

---

## 🔧 Troubleshooting

### Password Hash Issues

If you get password errors:
1. Make sure you're using bcrypt hash (starts with `$2b$10$`)
2. Generate a new hash: `node server/scripts/hash-password.js yourpassword`
3. Make sure there are no extra spaces in the hash

### Tenant Not Found

If login says "tenant not found":
1. Check tenant exists: `SELECT * FROM tenants WHERE name = 'Your Client Name';`
2. Check user's tenant_id matches: `SELECT * FROM users WHERE email = 'admin@client.com';`
3. Verify tenant_id UUIDs match

### Duplicate Entry Errors

- **Tenant name already exists**: Choose a different name
- **Subdomain already exists**: Choose a different subdomain
- **Email already exists**: Use a different email or check if user already exists

---

## 📊 View All Tenants

To see all created tenants:

```sql
SELECT 
    tenant_id,
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan,
    created_at
FROM tenants
ORDER BY created_at DESC;
```

---

## 📊 View All Users for a Tenant

To see all users for a specific tenant:

```sql
SELECT 
    user_id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM users
WHERE tenant_id = 'YOUR_TENANT_ID'
ORDER BY created_at DESC;
```

---

## 🎯 Next Steps After Creating Tenant

Once the tenant and admin user are created:

1. **Admin logs in** with the credentials
2. **Admin creates portfolios** via Admin Panel → Portfolios
3. **Admin creates users** via Admin Panel → Users
4. **Admin adds personnel** via Admin Panel → Personnel
5. **Users log in** and start logging issues

---

## 🔮 Future: Super Admin Portal

Once the Super Admin portal is implemented, you'll be able to:
- Create tenants via web interface
- View all tenants in a dashboard
- Edit/delete tenants
- View cross-tenant statistics
- Manage subscriptions

For now, use the database method above.


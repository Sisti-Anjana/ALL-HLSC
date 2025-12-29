# Multi-Tenant System Workflow
## How to Create and Manage Multiple Clients (Tenants)

---

## 🎯 Overview

This system supports **multiple clients (tenants)** where each client has:
- ✅ Their own **portfolios**
- ✅ Their own **users**
- ✅ Their own **issues**
- ✅ Their own **personnel**
- ✅ Their own **admin logs**
- ✅ Complete **data isolation** from other clients

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT SYSTEM                         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   CLIENT A   │      │   CLIENT B   │      │   CLIENT C   │
│ (Tenant A)   │      │ (Tenant B)   │      │ (Tenant C)   │
├──────────────┤      ├──────────────┤      ├──────────────┤
│ • Portfolios │      │ • Portfolios │      │ • Portfolios │
│ • Users      │      │ • Users      │      │ • Users      │
│ • Issues     │      │ • Issues     │      │ • Issues     │
│ • Personnel  │      │ • Personnel  │      │ • Personnel  │
│ • Logs       │      │ • Logs       │      │ • Logs       │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   DATABASE        │
                    │   (PostgreSQL)    │
                    │                   │
                    │ All data filtered │
                    │ by tenant_id      │
                    └───────────────────┘
```

---

## 🔄 Complete Workflow: Creating a New Client

### Step 1: Create Tenant (Client) in Database

**Method 1: Direct Database Insert (For Initial Setup)**

```sql
-- Insert a new tenant (client)
INSERT INTO tenants (
    name,
    subdomain,
    contact_email,
    status,
    subscription_plan
) VALUES (
    'Green Power Solutions',
    'greenpower',
    'admin@greenpower.com',
    'active',
    'pro'
) RETURNING tenant_id;
```

**Method 2: Using Super Admin API (When Implemented)**

```javascript
POST /api/super-admin/tenants
{
  "name": "Green Power Solutions",
  "subdomain": "greenpower",
  "contact_email": "admin@greenpower.com",
  "subscription_plan": "pro"
}
```

### Step 2: Create First Admin User for the Tenant

```sql
-- After getting tenant_id from Step 1
-- Create the first admin user for this tenant
INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    role
) VALUES (
    'TENANT_ID_FROM_STEP_1',
    'admin@greenpower.com',
    '$2b$10$...', -- Hashed password
    'Admin User',
    'tenant_admin'
);
```

### Step 3: Tenant Admin Logs In

1. Admin goes to login page
2. Enters email: `admin@greenpower.com`
3. Enters password
4. System creates JWT token with `tenant_id` included
5. Admin is redirected to dashboard

### Step 4: Tenant Admin Creates Portfolios

**Via Admin Panel:**
1. Go to Admin Panel → Portfolios tab
2. Click "Create Portfolio"
3. Fill in:
   - Portfolio Name: "Solar Farm North"
   - Subtitle: "Main solar installation"
   - Site Range: "Sites 1-50"
4. Click "Create"
5. Portfolio is automatically linked to their `tenant_id`

**What Happens Behind the Scenes:**
```javascript
// Backend automatically adds tenant_id from JWT token
POST /api/portfolios
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Body: {
  "name": "Solar Farm North",
  "subtitle": "Main solar installation",
  "site_range": "Sites 1-50"
}

// Backend extracts tenant_id from JWT and adds it:
{
  "name": "Solar Farm North",
  "subtitle": "Main solar installation",
  "site_range": "Sites 1-50",
  "tenant_id": "TENANT_ID_FROM_JWT" // ← Automatically added
}
```

### Step 5: Tenant Admin Creates Users

**Via Admin Panel:**
1. Go to Admin Panel → Users tab
2. Click "Create User"
3. Fill in:
   - Email: `john@greenpower.com`
   - Full Name: `John Doe`
   - Password: `securepassword123`
   - Role: `user` or `tenant_admin`
4. Click "Create"
5. User is automatically linked to their `tenant_id`

**What Happens Behind the Scenes:**
```javascript
// Backend automatically adds tenant_id from JWT token
POST /api/admin/users
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Body: {
  "email": "john@greenpower.com",
  "fullName": "John Doe",
  "password": "securepassword123",
  "role": "user"
}

// Backend extracts tenant_id from JWT and adds it:
{
  "email": "john@greenpower.com",
  "full_name": "John Doe",
  "password_hash": "...",
  "role": "user",
  "tenant_id": "TENANT_ID_FROM_JWT" // ← Automatically added
}
```

### Step 6: Users Log Issues

**Via Dashboard:**
1. User logs in (with their tenant's `tenant_id` in JWT)
2. Goes to Dashboard
3. Clicks "Log New Issue" on a portfolio card
4. Fills in issue details
5. Issue is automatically linked to their `tenant_id` and `portfolio_id`

---

## 🔐 How Data Isolation Works

### Example: Two Different Clients

**Client A: "Green Power Solutions"**
- Tenant ID: `abc-123-def-456`
- Portfolios: "Solar Farm North", "Solar Farm South"
- Users: `admin@greenpower.com`, `john@greenpower.com`
- Issues: 50 issues

**Client B: "Solar Energy Corp"**
- Tenant ID: `xyz-789-uvw-012`
- Portfolios: "Energy Project 1", "Energy Project 2"
- Users: `admin@solareenergy.com`, `bob@solareenergy.com`
- Issues: 75 issues

### When Client A User Logs In:

```javascript
// JWT Token contains:
{
  "user_id": "user-123",
  "tenant_id": "abc-123-def-456", // ← Client A's tenant_id
  "email": "john@greenpower.com",
  "role": "user"
}

// All API requests automatically filter by tenant_id:
GET /api/portfolios
→ Backend queries: SELECT * FROM portfolios WHERE tenant_id = 'abc-123-def-456'
→ Returns: Only "Solar Farm North", "Solar Farm South"

GET /api/issues
→ Backend queries: SELECT * FROM issues WHERE tenant_id = 'abc-123-def-456'
→ Returns: Only Client A's 50 issues
```

### When Client B User Logs In:

```javascript
// JWT Token contains:
{
  "user_id": "user-456",
  "tenant_id": "xyz-789-uvw-012", // ← Client B's tenant_id
  "email": "bob@solareenergy.com",
  "role": "user"
}

// All API requests automatically filter by tenant_id:
GET /api/portfolios
→ Backend queries: SELECT * FROM portfolios WHERE tenant_id = 'xyz-789-uvw-012'
→ Returns: Only "Energy Project 1", "Energy Project 2"

GET /api/issues
→ Backend queries: SELECT * FROM issues WHERE tenant_id = 'xyz-789-uvw-012'
→ Returns: Only Client B's 75 issues
```

**Result:** Complete data isolation - Client A cannot see Client B's data and vice versa!

---

## 📋 Complete Data Structure Per Client

When you create a new client (tenant), here's what gets created:

```
CLIENT (Tenant)
│
├── USERS
│   ├── Admin User (tenant_admin)
│   ├── User 1 (user)
│   ├── User 2 (user)
│   └── ...
│
├── PORTFOLIOS
│   ├── Portfolio 1
│   ├── Portfolio 2
│   └── ...
│
├── ISSUES
│   ├── Issue 1 (linked to Portfolio 1)
│   ├── Issue 2 (linked to Portfolio 1)
│   ├── Issue 3 (linked to Portfolio 2)
│   └── ...
│
├── MONITORED_PERSONNEL
│   ├── Personnel 1
│   ├── Personnel 2
│   └── ...
│
├── ADMIN_LOGS
│   ├── Log Entry 1
│   ├── Log Entry 2
│   └── ...
│
└── HOUR_RESERVATIONS
    ├── Reservation 1
    ├── Reservation 2
    └── ...
```

**All of these are linked to the same `tenant_id`!**

---

## 🛠️ Current Implementation Status

### ✅ What's Already Working:

1. **Multi-Tenant Database Schema**
   - All tables have `tenant_id` foreign key
   - Row Level Security (RLS) policies enabled

2. **Tenant Isolation Middleware**
   - Automatically extracts `tenant_id` from JWT token
   - Filters all queries by `tenant_id`
   - Located in: `server/src/middleware/tenantIsolation.middleware.ts`

3. **Admin Panel (Within Tenant)**
   - Create/Edit/Delete Portfolios (for current tenant only)
   - Create/Edit/Delete Users (for current tenant only)
   - Manage Personnel (for current tenant only)
   - View Admin Logs (for current tenant only)
   - Manage Portfolio Locks (for current tenant only)

4. **Authentication**
   - JWT tokens include `tenant_id`
   - Users can only access their tenant's data

### ⚠️ What Needs to Be Implemented:

1. **Super Admin Portal**
   - Create new tenants (clients)
   - View all tenants
   - Edit/Delete tenants
   - View cross-tenant statistics

2. **Tenant Management API**
   - `POST /api/super-admin/tenants` - Create tenant
   - `GET /api/super-admin/tenants` - List all tenants
   - `PUT /api/super-admin/tenants/:id` - Update tenant
   - `DELETE /api/super-admin/tenants/:id` - Delete tenant

3. **Super Admin Frontend**
   - Super Admin Dashboard
   - Tenant List Component
   - Tenant Form Component (Create/Edit)
   - Tenant Details View

---

## 🚀 Quick Start: Creating Your First Client

### Option 1: Manual Database Insert (Quick Setup)

```sql
-- 1. Create the tenant
INSERT INTO tenants (name, subdomain, contact_email, status, subscription_plan)
VALUES ('My First Client', 'client1', 'admin@client1.com', 'active', 'basic')
RETURNING tenant_id;

-- 2. Note the tenant_id from above, then create admin user
-- Replace 'YOUR_TENANT_ID' with the actual UUID from step 1
INSERT INTO users (tenant_id, email, password_hash, full_name, role)
VALUES (
    'YOUR_TENANT_ID',
    'admin@client1.com',
    '$2b$10$rO8qK...', -- Generate this using bcrypt
    'Admin User',
    'tenant_admin'
);

-- 3. Now you can log in with admin@client1.com
```

### Option 2: Using API (When Super Admin is Implemented)

```bash
# 1. Login as super admin
POST /api/auth/login
{
  "email": "superadmin@system.com",
  "password": "superadminpassword"
}

# 2. Create new tenant
POST /api/super-admin/tenants
Headers: { Authorization: "Bearer <SUPER_ADMIN_TOKEN>" }
{
  "name": "My First Client",
  "subdomain": "client1",
  "contact_email": "admin@client1.com",
  "subscription_plan": "basic"
}

# 3. System automatically creates first admin user
# 4. Send credentials to client
```

---

## 📝 Step-by-Step: Managing a Client's Data

### As Tenant Admin (Logged in as Client Admin):

1. **Create Portfolios**
   - Admin Panel → Portfolios → Create Portfolio
   - Portfolio automatically linked to your tenant

2. **Create Users**
   - Admin Panel → Users → Create User
   - User automatically linked to your tenant

3. **Add Personnel**
   - Admin Panel → Personnel → Add Personnel
   - Personnel automatically linked to your tenant

4. **View Issues**
   - Dashboard → View all issues for your portfolios
   - Issues automatically filtered by your tenant

5. **Log Issues**
   - Dashboard → Click "Log New Issue"
   - Issue automatically linked to your tenant and portfolio

### As Regular User (Logged in as Client User):

1. **View Portfolios**
   - Dashboard → See all portfolios for your tenant

2. **Log Issues**
   - Dashboard → Click "Log New Issue"
   - Issue automatically linked to your tenant

3. **View Issues**
   - Issues Page → See all issues for your tenant

---

## 🔍 How to Verify Multi-Tenancy

### Test Scenario:

1. **Create Client A:**
   ```sql
   INSERT INTO tenants (name, subdomain, contact_email) 
   VALUES ('Client A', 'clienta', 'admin@clienta.com')
   RETURNING tenant_id;
   ```

2. **Create Client B:**
   ```sql
   INSERT INTO tenants (name, subdomain, contact_email) 
   VALUES ('Client B', 'clientb', 'admin@clientb.com')
   RETURNING tenant_id;
   ```

3. **Create Portfolio for Client A:**
   ```sql
   INSERT INTO portfolios (tenant_id, name)
   VALUES ('CLIENT_A_TENANT_ID', 'Portfolio A1');
   ```

4. **Create Portfolio for Client B:**
   ```sql
   INSERT INTO portfolios (tenant_id, name)
   VALUES ('CLIENT_B_TENANT_ID', 'Portfolio B1');
   ```

5. **Login as Client A Admin:**
   - Should see: Only "Portfolio A1"
   - Should NOT see: "Portfolio B1"

6. **Login as Client B Admin:**
   - Should see: Only "Portfolio B1"
   - Should NOT see: "Portfolio A1"

**✅ If this works, multi-tenancy is working correctly!**

---

## 📊 Database Queries to Check Multi-Tenancy

### View All Tenants:
```sql
SELECT tenant_id, name, subdomain, status, created_at 
FROM tenants 
ORDER BY created_at DESC;
```

### View All Portfolios for a Specific Tenant:
```sql
SELECT portfolio_id, name, tenant_id 
FROM portfolios 
WHERE tenant_id = 'YOUR_TENANT_ID';
```

### View All Users for a Specific Tenant:
```sql
SELECT user_id, email, full_name, role, tenant_id 
FROM users 
WHERE tenant_id = 'YOUR_TENANT_ID';
```

### View All Issues for a Specific Tenant:
```sql
SELECT issue_id, description, portfolio_id, tenant_id 
FROM issues 
WHERE tenant_id = 'YOUR_TENANT_ID';
```

### Count Data Per Tenant:
```sql
SELECT 
    t.name AS tenant_name,
    COUNT(DISTINCT u.user_id) AS user_count,
    COUNT(DISTINCT p.portfolio_id) AS portfolio_count,
    COUNT(DISTINCT i.issue_id) AS issue_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.tenant_id
LEFT JOIN portfolios p ON p.tenant_id = t.tenant_id
LEFT JOIN issues i ON i.tenant_id = t.tenant_id
GROUP BY t.tenant_id, t.name
ORDER BY t.name;
```

---

## 🎯 Summary

**Multi-Tenant System = Multiple Clients, Complete Isolation**

1. **Each Client = One Tenant** in the database
2. **Each Tenant has:**
   - Multiple Portfolios
   - Multiple Users
   - Multiple Issues
   - Personnel List
   - Admin Logs
   - All isolated from other tenants

3. **How It Works:**
   - Every table has `tenant_id` foreign key
   - JWT token includes `tenant_id`
   - Backend middleware filters by `tenant_id`
   - Database RLS enforces isolation

4. **To Create a New Client:**
   - Create tenant record in database
   - Create first admin user for that tenant
   - Admin can then create portfolios, users, etc.

5. **Current Status:**
   - ✅ Multi-tenant architecture working
   - ✅ Data isolation enforced
   - ⚠️ Super admin portal for tenant creation needs implementation

---

## 📚 Related Files

- **ER Diagram**: `ER_DIAGRAM.md` and `ER_DIAGRAM_BLOCKS.md`
- **Tenant Isolation Middleware**: `server/src/middleware/tenantIsolation.middleware.ts`
- **Admin Panel**: `client/src/components/admin/AdminPanel.tsx`
- **Database Schema**: See `BUILD_GUIDE.md` or `DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt`




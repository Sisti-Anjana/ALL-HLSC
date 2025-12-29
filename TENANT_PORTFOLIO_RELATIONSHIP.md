# Tenant-Portfolio Relationship Explained

## 🎯 Core Concept

**Each client (tenant) has their own separate portfolios. Different clients have completely different portfolios that are isolated from each other.**

---

## 📊 Database Relationship

### Database Structure:
```
TENANTS (Clients/Companies)
    ↓ (1 tenant has many portfolios)
PORTFOLIOS (Each belongs to one tenant via tenant_id)
    ↓ (1 portfolio has many issues)
ISSUES (Each belongs to one portfolio, which belongs to one tenant)
```

### Key Points:
- **`portfolios` table has a `tenant_id` column** - This links each portfolio to a specific tenant (client)
- **`UNIQUE(tenant_id, name)` constraint** - Within each tenant, portfolio names must be unique, but different tenants can have portfolios with the same name
- **Foreign Key**: `portfolios.tenant_id` → `tenants.tenant_id`

---

## 🔒 Data Isolation

### Example Scenario:

**Tenant A (Client A - "Solar Energy Corp"):**
- Portfolio 1: "Solar Farm North"
- Portfolio 2: "Solar Farm South"  
- Portfolio 3: "Wind Energy Site 1"

**Tenant B (Client B - "Green Power Ltd"):**
- Portfolio 1: "Green Energy Project"
- Portfolio 2: "Hydroelectric Plant"
- Portfolio 3: "Solar Farm North" ← **Same name as Tenant A's portfolio, but completely separate!**

**Result:**
- When Client A logs in, they ONLY see: "Solar Farm North", "Solar Farm South", "Wind Energy Site 1"
- When Client B logs in, they ONLY see: "Green Energy Project", "Hydroelectric Plant", "Solar Farm North" (their own)
- Client A cannot see Client B's portfolios
- Client B cannot see Client A's portfolios
- Even though both have a portfolio named "Solar Farm North", they are completely different records in the database

---

## 🔐 How Isolation Works

### 1. JWT Token Contains tenant_id
When a user logs in, the JWT token includes their `tenant_id`:
```json
{
  "user_id": "user-123",
  "tenant_id": "tenant-A",  ← This identifies which client
  "role": "user"
}
```

### 2. All Queries Filter by tenant_id
When fetching portfolios, the backend automatically adds:
```sql
SELECT * FROM portfolios 
WHERE tenant_id = 'tenant-A'  ← Automatically added from JWT token
```

### 3. Database Row Level Security (RLS)
Even if someone tries to bypass the backend, PostgreSQL RLS policies enforce:
- Users can only SELECT rows where `tenant_id` matches their token's `tenant_id`
- Users can only INSERT rows with their own `tenant_id`
- Users can only UPDATE/DELETE rows belonging to their `tenant_id`

---

## 📝 API Behavior

### When Client A requests portfolios:
```
GET /api/portfolios
Headers: Authorization: Bearer <token-with-tenant-A>
```

**Backend Process:**
1. Extract `tenant_id = "tenant-A"` from JWT token
2. Query: `SELECT * FROM portfolios WHERE tenant_id = 'tenant-A'`
3. Returns: Only portfolios belonging to Tenant A

### When Client B requests portfolios:
```
GET /api/portfolios
Headers: Authorization: Bearer <token-with-tenant-B>
```

**Backend Process:**
1. Extract `tenant_id = "tenant-B"` from JWT token
2. Query: `SELECT * FROM portfolios WHERE tenant_id = 'tenant-B'`
3. Returns: Only portfolios belonging to Tenant B

**Client A and Client B get completely different results, even if portfolio names are the same!**

---

## ✅ Implementation Checklist

When implementing portfolio features, ensure:

- [ ] **Create Portfolio**: Automatically set `tenant_id` from JWT token (never from user input)
- [ ] **List Portfolios**: Always filter by `tenant_id` from JWT token
- [ ] **Get Portfolio**: Verify portfolio belongs to user's `tenant_id` before returning
- [ ] **Update Portfolio**: Verify portfolio belongs to user's `tenant_id` before updating
- [ ] **Delete Portfolio**: Verify portfolio belongs to user's `tenant_id` before deleting
- [ ] **Frontend**: Never send `tenant_id` in API requests (backend gets it from JWT)
- [ ] **Backend**: Always get `tenant_id` from JWT token, never from request body/query params

---

## 🎯 Summary

- ✅ **Different clients (tenants) have different portfolios**
- ✅ **Each portfolio belongs to exactly one tenant via `tenant_id`**
- ✅ **Portfolio isolation is enforced at multiple layers:**
  1. Backend middleware filters by `tenant_id`
  2. Service layer validates `tenant_id` ownership
  3. Database RLS policies enforce at DB level
- ✅ **Even portfolio names can be duplicated across tenants - they're still completely separate**
- ✅ **Users can only see and manage portfolios belonging to their tenant**

---

## 📖 Related Documentation

- See `DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt` for database schema
- See `BUILD_GUIDE.md` for implementation details
- See tenant isolation middleware implementation in Phase 5



















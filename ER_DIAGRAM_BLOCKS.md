# Entity-Relationship Diagram (ERD) - Block Format
## Multi-Tenant Portfolio Issue Tracking System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TENANTS                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ tenant_id (PK)          │ UUID                                         │  │
│  │ name                    │ VARCHAR(255) UNIQUE                         │  │
│  │ subdomain               │ VARCHAR(100) UNIQUE                         │  │
│  │ logo_url                │ TEXT                                        │  │
│  │ contact_email           │ VARCHAR(255)                                │  │
│  │ status                  │ VARCHAR(20) [active/inactive/suspended]    │  │
│  │ subscription_plan      │ VARCHAR(50) [basic/pro/enterprise]         │  │
│  │ settings                │ JSONB                                       │  │
│  │ created_at              │ TIMESTAMP                                   │  │
│  │ updated_at              │ TIMESTAMP                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │     USERS        │  │   PORTFOLIOS     │  │     ISSUES        │
        │                  │  │                  │  │                  │
        │ user_id (PK)     │  │ portfolio_id (PK)│  │ issue_id (PK)     │
        │ tenant_id (FK)   │  │ tenant_id (FK)   │  │ tenant_id (FK)     │
        │ username         │  │ name             │  │ portfolio_id (FK) │
        │ password_hash    │  │ subtitle         │  │ created_by (FK)   │
        │ full_name        │  │ site_range       │  │ site_name         │
        │ email            │  │ all_sites_checked│  │ issue_hour (0-23) │
        │ role             │  │ all_sites_checked│  │ description       │
        │ [super_admin/    │  │ _hour            │  │ issue_type        │
        │  tenant_admin/   │  │ all_sites_checked│  │ severity          │
        │  user]           │  │ _date            │  │ [low/medium/      │
        │ is_active        │  │ all_sites_checked│  │  high/critical]   │
        │ last_login       │  │ _by              │  │ status            │
        │ created_at       │  │ sites_checked_   │  │ [open/in_progress/│
        │ updated_at       │  │ details          │  │  resolved/closed] │
        │                  │  │ is_locked        │  │ monitored_by      │
        │ UNIQUE:          │  │ locked_by        │  │ missed_by []      │
        │ (tenant_id,      │  │ locked_at        │  │ attachments JSONB │
        │  username)       │  │ created_at       │  │ notes             │
        │ (tenant_id,      │  │ updated_at       │  │ resolved_at       │
        │  email)          │  │                  │  │ resolved_by       │
        │                  │  │ UNIQUE:          │  │ created_at        │
        └──────────────────┘  │ (tenant_id,      │  │ updated_at        │
                              │  name)           │  │                  │
                              └──────────────────┘  └──────────────────┘
                                    │                       │
                                    │                       │
                    ┌───────────────┼───────────────┐       │
                    │               │               │       │
                    ▼               ▼               ▼       │
        ┌──────────────────┐  ┌──────────────────┐  ┌─────┴──────────────┐
        │HOUR_RESERVATIONS │  │  ADMIN_LOGS      │  │ MONITORED_PERSONNEL│
        │                  │  │                  │  │                    │
        │ id (PK)          │  │ log_id (PK)      │  │ id (PK)            │
        │ tenant_id (FK)   │  │ tenant_id (FK)   │  │ tenant_id (FK)     │
        │ portfolio_id (FK) │  │ related_portfolio│  │ name               │
        │ issue_hour (0-23)│  │ _id (FK)         │  │ role               │
        │ monitored_by     │  │ related_user_id  │  │ is_active          │
        │ session_id       │  │ (FK)             │  │ created_at         │
        │ reserved_at       │  │ admin_name       │  │                    │
        │ expires_at       │  │ action_type      │  │ UNIQUE:            │
        │                  │  │ action_description│  │ (tenant_id, name)  │
        │ UNIQUE:          │  │ metadata JSONB   │  │                    │
        │ (tenant_id,      │  │ created_at       │  └────────────────────┘
        │  portfolio_id,   │  │                  │
        │  issue_hour)     │  └──────────────────┘
        └──────────────────┘
                                    │
                                    │
                                    ▼
                        ┌──────────────────────┐
                        │   SUBSCRIPTIONS      │
                        │                      │
                        │ subscription_id (PK) │
                        │ tenant_id (FK)       │
                        │ plan_name            │
                        │ status               │
                        │ [active/cancelled/   │
                        │  expired/trial]      │
                        │ start_date           │
                        │ end_date             │
                        │ billing_cycle        │
                        │ [monthly/yearly]     │
                        │ amount               │
                        │ currency             │
                        │ next_billing_date    │
                        │ created_at           │
                        │ updated_at           │
                        └──────────────────────┘
```

---

## Relationship Flow Diagram

```
┌──────────┐
│ TENANTS  │ (Core Entity - Multi-Tenant Root)
└────┬─────┘
     │
     ├─────────────────────────────────────────────────────────────┐
     │                                                             │
     ▼                                                             ▼
┌──────────┐                                              ┌──────────────┐
│  USERS   │                                              │  PORTFOLIOS  │
│          │                                              │              │
│ • Login  │                                              │ • Projects   │
│ • Roles  │                                              │ • Sites      │
│ • Access │                                              │ • Status     │
└────┬─────┘                                              └──────┬───────┘
     │                                                             │
     │                                                             │
     │                    ┌──────────────┐                        │
     └───────────────────▶│    ISSUES    │◀──────────────────────┘
                          │              │
                          │ • Tickets    │
                          │ • Hours (0-23)│
                          │ • Severity   │
                          │ • Status     │
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
          ┌────────────────┐ ┌──────────┐ ┌──────────────────┐
          │HOUR_RESERVATIONS│ │ADMIN_LOGS│ │MONITORED_PERSONNEL│
          │                  │ │          │ │                  │
          │ • Locking        │ │ • Audit  │ │ • Personnel List │
          │ • Hour slots     │ │ • Actions│ │ • Assignments   │
          │ • Sessions       │ │ • History│ │                  │
          └──────────────────┘ └──────────┘ └──────────────────┘
```

---

## Entity Blocks with Key Attributes

### ┌─────────────────────────────────────────────────────────┐
### │ TENANTS (Core Multi-Tenant Entity)                      │
### ├─────────────────────────────────────────────────────────┤
### │ PK: tenant_id (UUID)                                     │
### │ UK: name, subdomain                                     │
### │                                                          │
### │ Attributes:                                              │
### │   • name: Company name                                   │
### │   • subdomain: URL subdomain                             │
### │   • contact_email: Primary contact                       │
### │   • status: active/inactive/suspended                    │
### │   • subscription_plan: basic/pro/enterprise            │
### │   • settings: JSON configuration                         │
### │                                                          │
### │ Relationships:                                           │
### │   → 1:N USERS                                            │
### │   → 1:N PORTFOLIOS                                       │
### │   → 1:N ISSUES                                           │
### │   → 1:N HOUR_RESERVATIONS                                │
### │   → 1:N ADMIN_LOGS                                       │
### │   → 1:N MONITORED_PERSONNEL                              │
### │   → 1:1 SUBSCRIPTIONS                                    │
### └─────────────────────────────────────────────────────────┘

### ┌─────────────────────────────────────────────────────────┐
### │ USERS (Authentication & Authorization)                  │
### ├─────────────────────────────────────────────────────────┤
### │ PK: user_id (UUID)                                       │
### │ FK: tenant_id → TENANTS                                  │
### │ UK: (tenant_id, username), (tenant_id, email)           │
### │                                                          │
### │ Attributes:                                              │
### │   • username: Login username                             │
### │   • email: User email                                    │
### │   • password_hash: Bcrypt hash                           │
### │   • full_name: Display name                              │
### │   • role: super_admin/tenant_admin/user                  │
### │   • is_active: Account status                            │
### │   • last_login: Last login timestamp                     │
### │                                                          │
### │ Relationships:                                           │
### │   ← N:1 TENANTS                                          │
### │   → 1:N ISSUES (created_by)                              │
### └─────────────────────────────────────────────────────────┘

### ┌─────────────────────────────────────────────────────────┐
### │ PORTFOLIOS (Project/Portfolio Records)                   │
### ├─────────────────────────────────────────────────────────┤
### │ PK: portfolio_id (UUID)                                 │
### │ FK: tenant_id → TENANTS                                  │
### │ UK: (tenant_id, name)                                    │
### │                                                          │
### │ Attributes:                                              │
### │   • name: Portfolio name                                 │
### │   • subtitle: Additional description                     │
### │   • site_range: Site range identifier                    │
### │   • all_sites_checked: Yes/No/Pending                    │
### │   • all_sites_checked_hour: Hour (0-23)                  │
### │   • all_sites_checked_date: Date                         │
### │   • all_sites_checked_by: Person name                    │
### │   • sites_checked_details: Notes                         │
### │   • is_locked: Lock status                               │
### │   • locked_by: Who locked it                             │
### │   • locked_at: Lock timestamp                            │
### │                                                          │
### │ Relationships:                                           │
### │   ← N:1 TENANTS                                          │
### │   → 1:N ISSUES                                           │
### │   → 1:N HOUR_RESERVATIONS                                │
### └─────────────────────────────────────────────────────────┘

### ┌─────────────────────────────────────────────────────────┐
### │ ISSUES (Issue/Ticket Records)                           │
### ├─────────────────────────────────────────────────────────┤
### │ PK: issue_id (UUID)                                     │
### │ FK: tenant_id → TENANTS                                  │
### │ FK: portfolio_id → PORTFOLIOS                            │
### │ FK: created_by → USERS                                    │
### │                                                          │
### │ Attributes:                                              │
### │   • site_name: Site identifier                           │
### │   • issue_hour: Hour (0-23) when issue occurred          │
### │   • description: Issue details                            │
### │   • issue_type: Type of issue                            │
### │   • severity: low/medium/high/critical                   │
### │   • status: open/in_progress/resolved/closed             │
### │   • monitored_by: Person who found it                    │
### │   • missed_by: Array of personnel who missed it          │
### │   • attachments: JSON array of file references          │
### │   • notes: Additional notes                              │
### │   • resolved_at: Resolution timestamp                     │
### │   • resolved_by: Who resolved it                         │
### │                                                          │
### │ Relationships:                                           │
### │   ← N:1 TENANTS                                          │
### │   ← N:1 PORTFOLIOS                                       │
### │   ← N:1 USERS (creator)                                  │
### └─────────────────────────────────────────────────────────┘

### ┌─────────────────────────────────────────────────────────┐
### │ HOUR_RESERVATIONS (Portfolio Locking System)            │
### ├─────────────────────────────────────────────────────────┤
### │ PK: id (UUID)                                            │
### │ FK: tenant_id → TENANTS                                  │
### │ FK: portfolio_id → PORTFOLIOS                            │
### │ UK: (tenant_id, portfolio_id, issue_hour)                │
### │                                                          │
### │ Attributes:                                              │
### │   • issue_hour: Hour being reserved (0-23)               │
### │   • monitored_by: Person reserving                       │
### │   • session_id: Session identifier                        │
### │   • reserved_at: Reservation timestamp                    │
### │   • expires_at: Expiration timestamp                     │
### │                                                          │
### │ Purpose:                                                 │
### │   Prevents multiple users from logging issues            │
### │   for the same portfolio/hour simultaneously             │
### │                                                          │
### │ Relationships:                                           │
### │   ← N:1 TENANTS                                          │
### │   ← N:1 PORTFOLIOS                                       │
### └─────────────────────────────────────────────────────────┘

### ┌─────────────────────────────────────────────────────────┐
### │ ADMIN_LOGS (Audit Trail)                                 │
### ├─────────────────────────────────────────────────────────┤
### │ PK: log_id (UUID)                                        │
### │ FK: tenant_id → TENANTS                                  │
### │ FK: related_portfolio_id → PORTFOLIOS (nullable)         │
### │ FK: related_user_id → USERS (nullable)                   │
### │                                                          │
### │ Attributes:                                              │
### │   • admin_name: Admin who performed action               │
### │   • action_type: Type of action                          │
### │   • action_description: Detailed description              │
### │   • metadata: JSON with additional data                   │
### │   • created_at: Action timestamp                          │
### │                                                          │
### │ Purpose:                                                 │
### │   Complete audit trail of all admin activities           │
### │   for compliance and troubleshooting                     │
### │                                                          │
### │ Relationships:                                           │
### │   ← N:1 TENANTS                                          │
### │   ← N:1 PORTFOLIOS (optional)                            │
### │   ← N:1 USERS (optional)                                 │
### └─────────────────────────────────────────────────────────┘

### ┌─────────────────────────────────────────────────────────┐
### │ MONITORED_PERSONNEL (Personnel Directory)                │
### ├─────────────────────────────────────────────────────────┤
### │ PK: id (UUID)                                            │
### │ FK: tenant_id → TENANTS                                  │
### │ UK: (tenant_id, name)                                    │
### │                                                          │
### │ Attributes:                                              │
### │   • name: Personnel name                                 │
### │   • role: Role/position                                  │
### │   • is_active: Active status                             │
### │   • created_at: Creation timestamp                        │
### │                                                          │
### │ Purpose:                                                 │
### │   Dropdown list for assigning monitors to issues          │
### │   Tenant-specific personnel directory                    │
### │                                                          │
### │ Relationships:                                           │
### │   ← N:1 TENANTS                                          │
### └─────────────────────────────────────────────────────────┘

### ┌─────────────────────────────────────────────────────────┐
### │ SUBSCRIPTIONS (Billing Management)                      │
### ├─────────────────────────────────────────────────────────┤
### │ PK: subscription_id (UUID)                               │
### │ FK: tenant_id → TENANTS                                  │
### │                                                          │
### │ Attributes:                                              │
### │   • plan_name: Subscription plan name                     │
### │   • status: active/cancelled/expired/trial               │
### │   • start_date: Subscription start                        │
### │   • end_date: Subscription end                            │
### │   • billing_cycle: monthly/yearly                       │
### │   • amount: Subscription amount                           │
### │   • currency: Currency code (USD)                         │
### │   • next_billing_date: Next billing date                 │
### │   • created_at: Creation timestamp                        │
### │   • updated_at: Update timestamp                         │
### │                                                          │
### │ Purpose:                                                 │
### │   Manage tenant subscriptions and billing                │
### │                                                          │
### │ Relationships:                                           │
### │   ← N:1 TENANTS                                          │
### └─────────────────────────────────────────────────────────┘

---

## Multi-Tenant Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TENANT ISOLATION                            │
│                                                                     │
│  ┌──────────┐                                                      │
│  │  Tenant A│  ────┐                                               │
│  └──────────┘      │                                               │
│                    │                                               │
│  ┌──────────┐      │    ┌──────────────────────────────────────┐   │
│  │  Tenant B│  ────┼───▶│  All Tables Filter by tenant_id    │   │
│  └──────────┘      │    │                                      │   │
│                    │    │  • USERS                             │   │
│  ┌──────────┐      │    │  • PORTFOLIOS                        │   │
│  │  Tenant C│  ────┘    │  • ISSUES                            │   │
│  └──────────┘           │  • HOUR_RESERVATIONS                  │   │
│                         │  • ADMIN_LOGS                         │   │
│                         │  • MONITORED_PERSONNEL                │   │
│                         │  • SUBSCRIPTIONS                       │   │
│                         └──────────────────────────────────────┘   │
│                                                                     │
│  ✅ Complete Data Isolation                                        │
│  ✅ Row Level Security (RLS) Enforced                              │
│  ✅ Cascade Deletes on Tenant Removal                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cardinality Summary

| Parent Entity | Child Entity | Relationship | Description |
|--------------|-------------|--------------|-------------|
| TENANTS | USERS | 1:N | One tenant has many users |
| TENANTS | PORTFOLIOS | 1:N | One tenant has many portfolios |
| TENANTS | ISSUES | 1:N | One tenant has many issues |
| TENANTS | HOUR_RESERVATIONS | 1:N | One tenant has many reservations |
| TENANTS | ADMIN_LOGS | 1:N | One tenant has many log entries |
| TENANTS | MONITORED_PERSONNEL | 1:N | One tenant has many personnel |
| TENANTS | SUBSCRIPTIONS | 1:1 | One tenant has one subscription |
| PORTFOLIOS | ISSUES | 1:N | One portfolio has many issues |
| PORTFOLIOS | HOUR_RESERVATIONS | 1:N | One portfolio has many reservations |
| USERS | ISSUES | 1:N | One user creates many issues |

---

## Key Design Patterns

### 1. Multi-Tenant Architecture
- **Every table** (except TENANTS) includes `tenant_id`
- **Row Level Security (RLS)** enforces isolation
- **Unique constraints** include `tenant_id` for tenant-scoped uniqueness

### 2. Cascade Deletes
- Deleting a TENANT removes all related data
- Ensures data integrity and prevents orphaned records

### 3. Audit Trail
- ADMIN_LOGS tracks all admin actions
- References to portfolios/users are nullable for flexibility

### 4. Locking Mechanism
- HOUR_RESERVATIONS prevents concurrent modifications
- Unique constraint on (tenant_id, portfolio_id, issue_hour)

### 5. Flexible Data Storage
- JSONB fields for settings, metadata, attachments
- Array fields for missed_by personnel list


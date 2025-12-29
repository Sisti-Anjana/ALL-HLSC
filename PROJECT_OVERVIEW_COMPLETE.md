# Multi-Tenant Portfolio Issue Tracking System
## Complete Project Overview & Documentation



---
---

## 🎯 Executive Summary

### What is This Project?

A **Multi-Tenant Portfolio Issue Tracking System** - a Software-as-a-Service (SaaS) application that enables multiple companies (tenants) to track, manage, and monitor issues across their portfolio of sites (such as solar energy installations, wind farms, or other infrastructure projects).

### Core Purpose

- **Issue Tracking**: Log and manage issues found during hourly monitoring (24-hour cycle)
- **Portfolio Management**: Organize and manage multiple portfolios per client
- **Multi-Tenant**: Multiple companies use the same application with complete data isolation
- **Real-time Analytics**: Dashboard with statistics, charts, and heat maps
- **Admin Management**: Comprehensive admin panel for managing portfolios, users, and settings

### Key Benefits

✅ **Complete Data Isolation** - Each client's data is completely separate  
✅ **Scalable Architecture** - Handle multiple tenants efficiently  
✅ **Real-time Updates** - Dashboard refreshes automatically  
✅ **Comprehensive Analytics** - Charts, heat maps, and performance metrics  
✅ **Role-Based Access** - Different permission levels for users, admins, and super admins  
✅ **Modern Technology** - Built with latest React, Node.js, and PostgreSQL  
✅ **Cost-Effective** - Free tier deployment options available

---

## 📊 Project Overview

### What the Application Does

This is a **SaaS (Software as a Service)** application where:

1. **Multiple Companies (Tenants) can sign up**
   - Each company gets their own isolated workspace
   - Complete data separation between clients
   - Customizable settings per tenant

2. **Each Company Manages Multiple Portfolios**
   - A portfolio represents a collection of sites (e.g., "Solar Farm North", "Wind Energy Site 1")
   - Different clients have completely different portfolios
   - Each portfolio can have multiple sites

3. **Hourly Issue Tracking (0-23 hours)**
   - Monitor sites throughout a 24-hour period
   - Log issues found during specific hours
   - Track which sites have been checked
   - Track which issues have been resolved

4. **Comprehensive Management Features**
   - Create, edit, and manage portfolios
   - Log issues with descriptions, severity, and metadata
   - Assign issues to monitoring personnel
   - Track "All Sites Checked" status
   - Portfolio locking system to prevent conflicts

5. **Analytics & Reporting**
   - Real-time dashboard statistics
   - Hourly coverage charts
   - Portfolio status heat maps
   - Performance analytics
   - Export to Excel/CSV

6. **Admin Capabilities**
   - Manage portfolios
   - Manage users (create, edit, activate/deactivate)
   - Manage monitored personnel list
   - View admin activity logs
   - Portfolio locking management
   - Coverage matrix analysis

### Example Use Case

**Scenario:** Solar Energy Company "Green Power Ltd" has 3 portfolios:
- Portfolio A: "Solar Farm North" (50 sites)
- Portfolio B: "Solar Farm South" (75 sites)
- Portfolio C: "Wind Energy Site" (25 sites)

**Daily Workflow:**
1. Monitoring personnel check sites throughout the day (hourly checks)
2. If an issue is found (e.g., inverter fault at Site 15, Hour 14), they log it
3. Issue includes: portfolio, site, hour, description, severity, who found it
4. Dashboard updates in real-time showing statistics
5. Admin can view all issues, assign resolutions, track coverage
6. Analytics show patterns (peak issue hours, most problematic sites, etc.)

---

## ✨ Key Features

### 1. Authentication System
- **Email-based login** (users and admins have separate login flows)
- Secure password hashing with bcrypt
- JWT token-based authentication
- Session management with auto-logout
- Password reset functionality
- Remember me option

### 2. Multi-Tenant Architecture
- **Complete data isolation** - Each tenant's data is completely separate
- Tenant identification via subdomain (optional) or tenant_id
- Row Level Security (RLS) at database level
- Middleware-level tenant filtering
- Cross-tenant access prevention

### 3. Portfolio Management
- Create, edit, and delete portfolios
- Portfolio properties:
  - Name (required)
  - Subtitle (optional)
  - Site range (optional, e.g., "Sites 1-50")
  - "All Sites Checked" status (Yes/No/Pending)
  - Check details (hour, date, checked by, notes)
- Portfolio locking system (prevents concurrent edits)
- Portfolio status heat maps

### 4. Issue Tracking
- **Log Issues** with:
  - Portfolio selection
  - Site name/number
  - Issue hour (0-23)
  - Description (required)
  - Issue type
  - Severity (Low/Medium/High/Critical)
  - Status (Open/In Progress/Resolved/Closed)
  - Monitored by (who found it)
  - Missed by (who should have caught it)
  - Attachments (optional)
  - Notes
- **View & Manage Issues**:
  - Advanced table view with sorting, filtering, search
  - Issue detail modal
  - Edit issues
  - Delete issues
  - Mark as resolved
  - Export to Excel/CSV

### 5. Dashboard & Analytics
- **Real-time Statistics**:
  - Total issues count
  - Portfolios with issues
  - Sites with issues
  - Average issue hour
  - Active issues
  - Resolved issues
  - Open issues
- **Visualizations**:
  - Hourly coverage charts (bar charts)
  - Issues over time (line charts)
  - Portfolio status heat maps
  - Portfolio monitoring matrix (Portfolio × Hour grid)
- **Auto-refresh** every 30 seconds

### 6. Admin Panel
Six-tab interface for tenant administrators:
- **Portfolios Tab**: Add, edit, delete portfolios
- **Login Users Tab**: Manage user accounts (create, edit, activate/deactivate)
- **Monitored Personnel Tab**: Manage list of people who monitor sites
- **Active Locks Tab**: View and unlock portfolio locks
- **Admin Logs Tab**: View activity history, add custom log entries
- **Coverage Matrix Tab**: View portfolio monitoring matrix

### 7. Super Admin Portal
For system administrators managing all tenants:
- View all tenants
- Create/edit/delete tenants
- Cross-tenant analytics
- System health monitoring
- Billing management (optional)
- Global system statistics

### 8. User Management
- Create users with email, password, full name, role
- Role-based access control:
  - **user**: Regular user, can log issues, view dashboard
  - **tenant_admin**: Admin for their tenant, full access to admin panel
  - **super_admin**: System admin, access to all tenants
- User activation/deactivation
- User activity tracking

### 9. Portfolio Locking System
- Prevents multiple users from editing same portfolio simultaneously
- Hour-based reservations
- Automatic expiration (e.g., 30 minutes)
- Admin override capability
- Lock status indicators

### 10. Export & Reporting
- Export issues to Excel format
- Export issues to CSV format
- Export with current filters applied
- Analytics reports
- Performance reports

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI library for building user interface |
| **TypeScript** | 5.x | Type safety and better developer experience |
| **React Router** | 6.x | Client-side routing and navigation |
| **Tailwind CSS** | 3.x | Utility-first CSS framework for styling |
| **Axios** | 1.x | HTTP client for API calls |
| **React Query** | 4.x | Data fetching, caching, and synchronization |
| **Zustand** | 4.x | Lightweight state management |
| **React Hook Form** | 7.x | Form state management and validation |
| **Chart.js** | 4.x | Charts and graphs for analytics |
| **date-fns** | 2.x | Date manipulation utilities |
| **React Hot Toast** | 2.x | Toast notifications |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18.x | JavaScript runtime environment |
| **Express** | 4.x | Web framework for API |
| **TypeScript** | 5.x | Type safety for backend code |
| **Supabase Client** | 2.x | PostgreSQL database client |
| **bcrypt** | 5.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT authentication |
| **express-validator** | 7.x | Input validation middleware |
| **express-rate-limit** | 6.x | Rate limiting for API protection |
| **winston** | 3.x | Logging library |
| **cors** | 2.x | Cross-Origin Resource Sharing |

### Database
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Relational database |
| **Supabase** | Database hosting platform (includes PostgreSQL, Auth, Storage) |
| **Row Level Security (RLS)** | Database-level data isolation |

### DevOps & Deployment
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Vercel** | Frontend hosting | ✅ Yes |
| **vercel** | Backend hosting | ✅  |20
| **Supabase** | Database hosting | ✅ 500MB database |
| **GitHub** | Version control | ✅ Unlimited |
| **GitHub Actions** | CI/CD | ✅ 2000 min/month |

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USERS (Browsers)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS
                       ▼
        ┌──────────────────────────────┐
        │   CDN (Vercel)               │
        │   - SSL Termination          │
        │   - Static Asset Caching     │
        └──────┬───────────────┬───────┘
               │               │
        ┌──────▼──────┐  ┌─────▼──────┐
        │  FRONTEND   │  │  BACKEND   │
        │  React.js   │◄─┤ Node.js/   │
        │  (Vercel)   │  │ Express    │
        │             │  │ (Railway)  │
        └─────────────┘  └─────┬──────┘
                               │
                               │ SQL Queries
                               │ (with tenant_id)
                               ▼
                    ┌──────────────────────┐
                    │   SUPABASE           │
                    │   (PostgreSQL)       │
                    │                      │
                    │  - Tenants Table     │
                    │  - Users Table       │
                    │  - Portfolios Table  │
                    │  - Issues Table      │
                    │  - RLS Policies      │
                    └──────────────────────┘
```

### Request Flow Example: Logging an Issue

```
1. User clicks "Log Issue" in frontend
   ↓
2. Frontend: Opens IssueForm component
   ↓
3. User fills form and clicks Submit
   ↓
4. Frontend: POST /api/issues
   Headers: { Authorization: "Bearer <JWT_TOKEN>" }
   Body: { portfolio_id, site_name, issue_hour, description, ... }
   ↓
5. Backend: Auth Middleware
   - Extracts JWT token
   - Verifies token
   - Extracts tenant_id from token
   - Attaches to request: req.user.tenant_id
   ↓
6. Backend: Tenant Isolation Middleware
   - Ensures tenant_id exists
   - Will auto-filter all queries
   ↓
7. Backend: Validation Middleware
   - Validates request body
   - Checks required fields
   ↓
8. Backend: Issue Controller
   - Calls issue.service.ts
   ↓
9. Backend: Issue Service
   - Builds SQL query with tenant_id automatically added
   - INSERT INTO issues (tenant_id, portfolio_id, ...)
   - tenant_id comes from JWT token (not user input)
   ↓
10. Database: Row Level Security
    - RLS policy checks tenant_id
    - Only allows insert if tenant_id matches
    ↓
11. Database: Inserts issue record
    ↓
12. Backend: Returns success response
    ↓
13. Frontend: Shows success notification
    - Refreshes issue list
    - Updates dashboard stats
```

### Security Layers

1. **JWT Token** - Contains tenant_id, user_id, role (signed and verified)
2. **Backend Middleware** - Extracts tenant_id from token, never from user input
3. **Service Layer** - All queries automatically filter by tenant_id
4. **Database RLS** - Row Level Security policies enforce at database level
5. **HTTPS/SSL** - Encrypted communication
6. **Rate Limiting** - Prevent API abuse
7. **Input Validation** - Prevent SQL injection, XSS attacks

**Result:** 100% Data Isolation Guaranteed

---

## 📁 Complete Folder Structure

### Frontend Structure (client/)

```
client/
├── public/                          # Static files
│   ├── index.html
│   ├── favicon.ico
│   ├── manifest.json
│   └── robots.txt
│
└── src/
    ├── assets/                      # Images, fonts
    │   ├── images/
    │   │   ├── logo.svg
    │   │   ├── default-avatar.png
    │   │   └── empty-state.svg
    │   └── fonts/
    │
    ├── components/                  # React Components
    │   ├── auth/                    # Authentication
    │   │   ├── UserLogin.tsx
    │   │   ├── AdminLogin.tsx
    │   │   ├── ForgotPassword.tsx
    │   │   └── PrivateRoute.tsx
    │   │
    │   ├── common/                  # Reusable UI
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Textarea.tsx
    │   │   ├── Select.tsx
    │   │   ├── Checkbox.tsx
    │   │   ├── Radio.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Table.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Tooltip.tsx
    │   │   ├── Spinner.tsx
    │   │   ├── Toast.tsx
    │   │   ├── Tabs.tsx
    │   │   ├── Pagination.tsx
    │   │   ├── SearchBar.tsx
    │   │   ├── DatePicker.tsx
    │   │   ├── EmptyState.tsx
    │   │   └── ErrorBoundary.tsx
    │   │
    │   ├── layout/                  # Layout components
    │   │   ├── Navbar.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── Footer.tsx
    │   │   ├── MainLayout.tsx
    │   │   └── AuthLayout.tsx
    │   │
    │   ├── dashboard/               # Dashboard
    │   │   ├── Dashboard.tsx
    │   │   ├── StatsCard.tsx
    │   │   ├── QuickActions.tsx
    │   │   └── RecentActivity.tsx
    │   │
    │   ├── portfolio/               # Portfolio Management
    │   │   ├── PortfolioList.tsx
    │   │   ├── PortfolioCard.tsx
    │   │   ├── PortfolioForm.tsx
    │   │   ├── PortfolioDetails.tsx
    │   │   ├── PortfolioStatusHeatMap.tsx
    │   │   ├── PortfolioHeatMap.tsx
    │   │   ├── PortfolioMonitoringMatrix.tsx
    │   │   └── PortfolioHourSessionDrawer.tsx
    │   │
    │   ├── issues/                  # Issue Tracking
    │   │   ├── IssueList.tsx
    │   │   ├── IssueForm.tsx
    │   │   ├── IssueCard.tsx
    │   │   ├── IssueDetailsView.tsx
    │   │   ├── EditIssueModal.tsx
    │   │   ├── IssuesTable.tsx
    │   │   ├── IssuesByUser.tsx
    │   │   └── TicketLoggingTable.tsx
    │   │
    │   ├── analytics/               # Analytics
    │   │   ├── HourlyCoverageChart.tsx
    │   │   ├── IssuesChart.tsx
    │   │   ├── CoverageChart.tsx
    │   │   ├── PerformanceAnalytics.tsx
    │   │   └── TrendChart.tsx
    │   │
    │   ├── admin/                   # Admin Panel
    │   │   ├── AdminPanel.tsx
    │   │   ├── AdminLogWidget.tsx
    │   │   ├── UserManagement.tsx
    │   │   ├── PortfolioManagement.tsx
    │   │   └── SystemSettings.tsx
    │   │
    │   └── super-admin/             # Super Admin
    │       ├── SuperAdminDashboard.tsx
    │       ├── TenantList.tsx
    │       ├── TenantForm.tsx
    │       ├── TenantDetails.tsx
    │       ├── GlobalAnalytics.tsx
    │       ├── BillingManagement.tsx
    │       └── SystemMonitoring.tsx
    │
    ├── hooks/                       # Custom Hooks
    │   ├── useAuth.ts
    │   ├── useTenant.ts
    │   ├── usePermissions.ts
    │   ├── useApi.ts
    │   ├── useDebounce.ts
    │   ├── useLocalStorage.ts
    │   ├── useSessionStorage.ts
    │   ├── useWindowSize.ts
    │   ├── useIntersectionObserver.ts
    │   └── useClickOutside.ts
    │
    ├── context/                     # React Context
    │   ├── AuthContext.tsx
    │   ├── TenantContext.tsx
    │   ├── ThemeContext.tsx
    │   └── NotificationContext.tsx
    │
    ├── services/                    # API Services
    │   ├── api.ts
    │   ├── supabaseClient.ts
    │   ├── authService.ts
    │   ├── portfolioService.ts
    │   ├── issueService.ts
    │   ├── userService.ts
    │   ├── tenantService.ts
    │   └── analyticsService.ts
    │
    ├── utils/                       # Utilities
    │   ├── constants.ts
    │   ├── helpers.ts
    │   ├── validators.ts
    │   ├── formatters.ts
    │   ├── dateUtils.ts
    │   ├── colorUtils.ts
    │   ├── exportUtils.ts
    │   └── permissions.ts
    │
    ├── types/                       # TypeScript Types
    │   ├── index.ts
    │   ├── auth.types.ts
    │   ├── tenant.types.ts
    │   ├── user.types.ts
    │   ├── portfolio.types.ts
    │   ├── issue.types.ts
    │   ├── analytics.types.ts
    │   └── api.types.ts
    │
    ├── styles/                      # Styles
    │   ├── index.css
    │   ├── globals.css
    │   ├── variables.css
    │   └── animations.css
    │
    ├── App.tsx                      # Main App
    └── index.tsx                    # Entry Point
```

### Backend Structure (server/)

```
server/
├── src/
    ├── config/                      # Configuration
    │   ├── database.config.ts
    │   ├── auth.config.ts
    │   ├── cors.config.ts
    │   ├── supabase.config.ts
    │   └── constants.ts
    │
    ├── routes/                      # API Routes
    │   ├── index.ts
    │   ├── auth.routes.ts
    │   ├── tenant.routes.ts
    │   ├── user.routes.ts
    │   ├── portfolio.routes.ts
    │   ├── issue.routes.ts
    │   ├── analytics.routes.ts
    │   ├── admin.routes.ts
    │   └── superadmin.routes.ts
    │
    ├── controllers/                 # Request Handlers
    │   ├── auth.controller.ts
    │   ├── tenant.controller.ts
    │   ├── user.controller.ts
    │   ├── portfolio.controller.ts
    │   ├── issue.controller.ts
    │   ├── analytics.controller.ts
    │   ├── admin.controller.ts
    │   └── superadmin.controller.ts
    │
    ├── services/                    # Business Logic
    │   ├── auth.service.ts
    │   ├── tenant.service.ts
    │   ├── user.service.ts
    │   ├── portfolio.service.ts
    │   ├── issue.service.ts
    │   ├── analytics.service.ts
    │   ├── email.service.ts
    │   └── export.service.ts
    │
    ├── middleware/                  # Express Middleware
    │   ├── auth.middleware.ts
    │   ├── tenantIsolation.middleware.ts
    │   ├── permission.middleware.ts
    │   ├── validation.middleware.ts
    │   ├── rateLimiter.middleware.ts
    │   ├── errorHandler.middleware.ts
    │   ├── logger.middleware.ts
    │   └── cors.middleware.ts
    │
    ├── models/                      # Database Models
    │   ├── index.ts
    │   ├── tenant.model.ts
    │   ├── user.model.ts
    │   ├── portfolio.model.ts
    │   ├── issue.model.ts
    │   ├── reservation.model.ts
    │   ├── adminLog.model.ts
    │   └── subscription.model.ts
    │
    ├── utils/                       # Utilities
    │   ├── jwt.util.ts
    │   ├── password.util.ts
    │   ├── validation.util.ts
    │   ├── logger.util.ts
    │   ├── email.util.ts
    │   ├── date.util.ts
    │   └── supabase.util.ts
    │
    ├── validators/                  # Validation Schemas
    │   ├── auth.validator.ts
    │   ├── tenant.validator.ts
    │   ├── user.validator.ts
    │   ├── portfolio.validator.ts
    │   └── issue.validator.ts
    │
    ├── types/                       # TypeScript Types
    │   ├── index.d.ts
    │   ├── express.d.ts
    │   └── environment.d.ts
    │
    ├── app.ts                       # Express App Setup
    └── server.ts                    # Server Entry Point
```

### Database Structure (database/)

```
database/
├── migrations/                      # SQL Migrations
│   ├── 001_create_tenants.sql
│   ├── 002_create_users.sql
│   ├── 003_create_portfolios.sql
│   ├── 004_create_issues.sql
│   ├── 005_create_hour_reservations.sql
│   ├── 006_create_admin_logs.sql
│   ├── 007_create_monitored_personnel.sql
│   ├── 008_setup_rls_policies.sql
│   ├── 009_create_indexes.sql
│   └── 010_seed_data.sql
│
├── seeds/                           # Seed Data
│   ├── dev_tenants.sql
│   ├── dev_users.sql
│   └── dev_portfolios.sql
│
├── schema.sql                       # Complete Schema
├── schema.md                        # Schema Documentation
└── ER_DIAGRAM.md                    # ER Diagram
```

---

## 🗄️ Database Design

### Core Tables

1. **tenants** - Company/client records
   - tenant_id (Primary Key)
   - name, subdomain, contact_email
   - status, subscription_plan
   - settings (JSON)

2. **users** - Authentication accounts
   - user_id (Primary Key)
   - tenant_id (Foreign Key → tenants)
   - username, email, password_hash
   - full_name, role
   - is_active, last_login

3. **portfolios** - Portfolio/project records
   - portfolio_id (Primary Key)
   - tenant_id (Foreign Key → tenants)
   - name, subtitle, site_range
   - all_sites_checked (Yes/No/Pending)
   - all_sites_checked_hour, date, by
   - is_locked, locked_by, locked_at

4. **issues** - Issue/ticket records
   - issue_id (Primary Key)
   - tenant_id (Foreign Key → tenants)
   - portfolio_id (Foreign Key → portfolios)
   - site_name, issue_hour (0-23)
   - description, issue_type, severity
   - status (open/in_progress/resolved/closed)
   - monitored_by, missed_by (array)
   - attachments (JSON), notes
   - resolved_at, resolved_by

5. **hour_reservations** - Portfolio locking
   - id (Primary Key)
   - tenant_id, portfolio_id
   - issue_hour, monitored_by
   - session_id, reserved_at, expires_at

6. **admin_logs** - Audit trail
   - log_id (Primary Key)
   - tenant_id
   - admin_name, action_type, action_description
   - related_portfolio_id, related_user_id
   - metadata (JSON)

7. **monitored_personnel** - Personnel list
   - id (Primary Key)
   - tenant_id
   - name, role, is_active

### Relationships

- **Tenants → Users**: One tenant has many users (1:N)
- **Tenants → Portfolios**: One tenant has many portfolios (1:N)
- **Portfolios → Issues**: One portfolio has many issues (1:N)
- **Users → Issues**: One user creates many issues (1:N)
- **Tenants → Admin Logs**: One tenant has many admin logs (1:N)

### Key Constraint: Multi-Tenant Isolation

**Every table (except tenants) has a `tenant_id` column.**

All queries automatically filter by `tenant_id`:
- When a user logs in, their `tenant_id` is in the JWT token
- All API requests include this token
- Backend extracts `tenant_id` and filters all queries
- Database RLS policies enforce at database level
- **Result**: Complete data isolation - tenants cannot access each other's data

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user info

### Portfolios
- `GET /api/portfolios` - List portfolios (filtered by tenant)
- `POST /api/portfolios` - Create new portfolio
- `GET /api/portfolios/:id` - Get portfolio details
- `PUT /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio
- `PUT /api/portfolios/:id/status` - Update "all sites checked" status
- `POST /api/portfolios/:id/lock` - Lock portfolio (reserve hour)
- `DELETE /api/portfolios/:id/unlock` - Unlock portfolio

### Issues
- `GET /api/issues` - List issues (filtered by tenant, with filters)
- `POST /api/issues` - Create new issue
- `GET /api/issues/:id` - Get issue details
- `PUT /api/issues/:id` - Update issue
- `DELETE /api/issues/:id` - Delete issue
- `PUT /api/issues/:id/resolve` - Mark issue as resolved
- `GET /api/issues/export` - Export issues to Excel/CSV

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/coverage` - Hourly coverage data
- `GET /api/analytics/performance` - Performance metrics
- `GET /api/analytics/users` - Issues by user report
- `GET /api/analytics/matrix` - Portfolio monitoring matrix
- `GET /api/analytics/trends` - Trend analysis

### Admin
- `GET /api/admin/logs` - Admin activity logs
- `POST /api/admin/logs` - Add custom log entry
- `GET /api/admin/locks` - Active portfolio locks
- `DELETE /api/admin/locks/:id` - Unlock portfolio (admin override)
- `GET /api/admin/personnel` - Monitored personnel list
- `POST /api/admin/personnel` - Add monitored person
- `DELETE /api/admin/personnel/:id` - Delete monitored person

### Users (Admin)
- `GET /api/users` - List users (filtered by tenant)
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/activate` - Activate user
- `PUT /api/users/:id/deactivate` - Deactivate user

### Super Admin
- `GET /api/super-admin/dashboard` - Global analytics
- `GET /api/super-admin/tenants` - List all tenants
- `POST /api/super-admin/tenants` - Create tenant
- `GET /api/super-admin/users` - All users (cross-tenant)
- `GET /api/super-admin/system` - System health metrics

**Note**: All endpoints (except auth) require JWT token in Authorization header.

---

## 👥 User Roles & Permissions

### 1. User (Regular User)
**Permissions:**
- ✅ View dashboard
- ✅ View portfolios (their tenant only)
- ✅ Log issues
- ✅ View issues (their tenant only)
- ✅ Edit own issues
- ✅ View analytics (their tenant only)
- ❌ Cannot access admin panel
- ❌ Cannot manage portfolios
- ❌ Cannot manage users

### 2. Tenant Admin
**Permissions:**
- ✅ All user permissions, plus:
- ✅ Access admin panel
- ✅ Create/edit/delete portfolios (their tenant only)
- ✅ Create/edit/delete users (their tenant only)
- ✅ Manage monitored personnel
- ✅ View admin logs
- ✅ Manage portfolio locks
- ✅ View coverage matrix
- ❌ Cannot access other tenants' data
- ❌ Cannot access super admin portal

### 3. Super Admin
**Permissions:**
- ✅ All tenant admin permissions, plus:
- ✅ Access super admin portal
- ✅ View all tenants
- ✅ Create/edit/delete tenants
- ✅ View cross-tenant analytics
- ✅ System health monitoring
- ✅ Global system statistics
- ✅ Can access any tenant's data

---

## 🏢 Multi-Tenant Architecture

### Key Concept: Data Isolation

**Each client (tenant) has their own portfolios, users, and issues. Complete separation.**

### How It Works

1. **Tenant Identification**
   - Each tenant has a unique `tenant_id` (UUID)
   - Stored in database `tenants` table
   - Can optionally use subdomain (e.g., client1.app.com, client2.app.com)

2. **User Authentication**
   - When user logs in, system identifies their `tenant_id`
   - JWT token includes `tenant_id`
   - Token: `{ user_id, tenant_id, role, email }`

3. **Data Filtering**
   - All API requests include JWT token
   - Backend extracts `tenant_id` from token
   - All database queries automatically filter by `tenant_id`
   - Users can only access their tenant's data

4. **Security Layers**
   - **Layer 1**: JWT token contains tenant_id (cannot be faked)
   - **Layer 2**: Backend middleware enforces tenant_id filtering
   - **Layer 3**: Service layer validates tenant ownership
   - **Layer 4**: Database RLS policies enforce at DB level
   - **Result**: Impossible to access other tenants' data

### Example: Tenant Isolation

**Tenant A (Green Power Ltd):**
- Portfolios: "Solar Farm North", "Solar Farm South"
- Users: john@greenpower.com, jane@greenpower.com
- Issues: 50 issues across their portfolios

**Tenant B (Solar Energy Corp):**
- Portfolios: "Energy Project 1", "Energy Project 2"
- Users: bob@solareenergy.com, alice@solareenergy.com
- Issues: 75 issues across their portfolios

**Isolation:**
- When john@greenpower.com logs in, he ONLY sees Tenant A's portfolios and issues
- When bob@solareenergy.com logs in, he ONLY sees Tenant B's portfolios and issues
- They cannot see each other's data, even if portfolio names are the same
- Complete data isolation guaranteed

---

## 📅 Project Timeline

### Total Duration: 10 Weeks (50 Business Days)

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | 1 Week | Project Setup & Planning |
| **Phase 2** | 2 Weeks | Database & Backend Foundation |
| **Phase 3** | 1 Week | Authentication System |
| **Phase 4** | 1 Week | Tenant Management |
| **Phase 5** | 1 Week | Core Features - Portfolios |
| **Phase 6** | 2 Weeks | Core Features - Issue Tracking |
| **Phase 7** | 1 Week | Analytics & Reporting |
| **Phase 8** | 1 Week | Admin Panel & Super Admin |
| **Phase 9** | 1 Week | Testing & Quality Assurance |
| **Phase 10** | 1 Week | Deployment & Go-Live |

**Note**: Timeline assumes 1 full-stack developer working full-time. With 2-3 developers, can be reduced to 6-7 weeks.

---

## 🚀 Development Phases

### Phase 1: Project Setup & Planning (Week 1)
- Environment setup (Node.js, Git, IDE)
- Create project structure
- Initialize frontend (React + TypeScript)
- Initialize backend (Node.js + Express + TypeScript)
- Setup Supabase account
- Create database schema
- Install dependencies
- Configure development tools

### Phase 2: Database & Backend Foundation (Weeks 2-3)
- Complete database schema implementation
- Row Level Security (RLS) policies
- Database indexes for performance
- Seed data for development
- Backend middleware (auth, tenant isolation, validation, error handling)
- Utility functions (JWT, password hashing, logging)
- Database connection setup

### Phase 3: Authentication System (Week 4)
- User registration API
- User login API
- JWT token generation and verification
- Password reset flow
- Frontend login components (UserLogin, AdminLogin)
- Auth context and state management
- Protected routes
- Session management

### Phase 4: Tenant Management (Week 5)
- Tenant CRUD APIs
- Subdomain routing (optional)
- Tenant context
- Super admin portal (basic)
- Tenant onboarding flow

### Phase 5: Core Features - Portfolios (Week 6)
- Portfolio CRUD APIs
- Portfolio list and card components
- Portfolio form (create/edit)
- Portfolio details view
- Portfolio locking system
- "All Sites Checked" status feature

### Phase 6: Core Features - Issue Tracking (Weeks 7-8)
- Issue CRUD APIs
- Issue form (log new issue)
- Issues table with sorting, filtering, search
- Issue detail modal
- Edit issue functionality
- Issue export (Excel/CSV)
- Duplicate prevention
- Real-time updates

### Phase 7: Analytics & Reporting (Week 9)
- Dashboard statistics API
- Dashboard UI with stats cards
- Hourly coverage charts
- Portfolio status heat maps
- Portfolio monitoring matrix
- Performance analytics
- Issues by user report
- Trend analysis charts

### Phase 8: Admin Panel & Super Admin (Week 10)
- Admin panel with 6 tabs:
  - Portfolios management
  - User management
  - Monitored personnel
  - Active locks
  - Admin logs
  - Coverage matrix
- Super admin dashboard
- Global analytics
- System monitoring

### Phase 9: Testing & Quality Assurance (Week 11)
- Unit tests
- Integration tests
- End-to-end (E2E) tests
- Manual testing
- Security audit
- Performance testing
- Bug fixes

### Phase 10: Deployment & Go-Live (Week 12)
- Production environment setup
- Deploy backend to Railway
- Deploy frontend to Vercel
- Database migration to production
- SSL/HTTPS configuration
- Custom domain setup (optional)
- Final testing
- Go-live!

---

## 🌐 Deployment Strategy

### Frontend Deployment: Vercel
- **Platform**: Vercel (free tier available)
- **Process**: Connect GitHub repository, auto-deploy on push
- **Features**: 
  - Automatic SSL/HTTPS
  - Global CDN
  - Fast builds
  - Preview deployments

### Backend Deployment: Railway
- **Platform**: Railway (free tier: $5 credit/month)
- **Process**: Connect GitHub repository, deploy from backend folder
- **Features**:
  - Automatic deployments
  - Environment variables management
  - Logging
  - Health checks

### Database: Supabase
- **Platform**: Supabase (free tier: 500MB database)
- **Features**:
  - Managed PostgreSQL
  - Automatic backups
  - Real-time subscriptions
  - API auto-generation
  - Row Level Security

### Custom Domain (Optional)
- Purchase domain (e.g., yourapp.com)
- Configure DNS:
  - A record: @ → Vercel IP
  - CNAME: www → cname.vercel-dns.com
  - CNAME: * → cname.vercel-dns.com (for subdomains)
- Automatic SSL certificate

### Environment Variables

**Backend (.env):**
```
PORT=5000
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
JWT_SECRET=xxx
FRONTEND_URL=https://yourapp.com
```

**Frontend (.env):**
```
REACT_APP_API_URL=https://api.yourapp.com/api
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=xxx
```

---

## 💰 Cost Analysis

### Development Costs

| Team Option | Duration | Cost Estimate |
|-------------|----------|---------------|
| **Solo Developer** | 10 weeks | $12,500 |
| **Lean Team (3 devs)** | 6-7 weeks | $22,500 |
| **Accelerated (5 devs)** | 4-5 weeks | $31,250 |

*Assumes $5,000/month per developer*

### Infrastructure Costs (First Year)

| Item | Tier | Monthly Cost | Annual Cost |
|------|------|--------------|-------------|
| **Vercel (Frontend)** | FREE | $0 | $0 |
| **Railway (Backend)** | FREE | $0 | $0 |
| **Supabase (Database)** | FREE | $0 | $0 |
| **Domain** | Optional | - | $10-15 |
| **SSL Certificate** | Included | $0 | $0 |
| **TOTAL** | | **$0/month** | **$0-15/year** |

### When to Upgrade (20+ clients)

| Item | Cost |
|------|------|
| Supabase Pro | $25/month |
| Railway Pro | $10/month |
| **Total** | **$35/month ($420/year)** |

**Conclusion**: Free tier is sufficient for MVP and up to 20 clients. Upgrade needed only when scaling beyond that.

---

## ✅ Deliverables Checklist

### Application Features
- ✅ Email-based authentication (users & admins)
- ✅ Multi-tenant with complete data isolation
- ✅ Portfolio management (CRUD operations)
- ✅ Issue tracking (full CRUD with advanced filtering)
- ✅ Portfolio locking system
- ✅ "All Sites Checked" status tracking
- ✅ Admin panel (6 tabs)
- ✅ Super admin portal
- ✅ Dashboard with real-time stats
- ✅ Hourly coverage charts
- ✅ Performance analytics
- ✅ Heat maps (status & coverage)
- ✅ Portfolio monitoring matrix
- ✅ Issues by user report
- ✅ Export to Excel/CSV
- ✅ Search & filters
- ✅ Mobile responsive design
- ✅ Real-time updates (auto-refresh)

### Documentation
- ✅ Project structure documentation
- ✅ Database schema documentation
- ✅ API endpoints documentation
- ✅ Deployment guide
- ✅ Setup instructions
- ✅ User guide
- ✅ Admin guide

### Testing
- ✅ Unit tests (80%+ coverage)
- ✅ Integration tests
- ✅ E2E tests
- ✅ Security audit
- ✅ Performance testing

### Deployment
- ✅ Production environment
- ✅ SSL/HTTPS enabled
- ✅ Custom domain configured (optional)
- ✅ Monitoring enabled
- ✅ Backups configured

---

## 📞 Support & Maintenance

### Post-Launch Support
- Bug fixes and patches
- Security updates
- Feature enhancements
- Performance optimization
- User support

### Recommended Maintenance Schedule
- **Weekly**: Review error logs, monitor performance
- **Monthly**: Security updates, dependency updates
- **Quarterly**: Feature review, user feedback analysis
- **Annually**: Major version updates, architecture review

---

## 📖 Additional Resources

### Documentation Files
- **DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt** - Complete technical architecture
- **PROJECT-TIMELINE-AND-PHASES.txt** - Detailed day-by-day timeline
- **UI-DESIGN-AND-MOCKUPS.txt** - Complete UI design specifications
- **BUILD_GUIDE.md** - Step-by-step implementation guide
- **QUICK_START.md** - Quick overview of the project
- **TENANT_PORTFOLIO_RELATIONSHIP.md** - Multi-tenant architecture details

### External Resources
- React Documentation: https://react.dev
- Node.js Documentation: https://nodejs.org/docs
- Supabase Documentation: https://supabase.com/docs
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- Vercel Documentation: https://vercel.com/docs
- Railway Documentation: https://docs.railway.app

---

## 🎯 Success Metrics

### Technical Metrics
- ✅ Application loads in < 3 seconds
- ✅ API response time < 500ms (p95)
- ✅ 99.9% uptime
- ✅ Zero security vulnerabilities
- ✅ Mobile responsive (all screen sizes)

### Business Metrics
- ✅ Support 10+ tenants on free tier
- ✅ Handle 1000+ issues per tenant
- ✅ 100+ concurrent users
- ✅ Zero data breaches
- ✅ User satisfaction > 90%

---

## 📝 Conclusion

This **Multi-Tenant Portfolio Issue Tracking System** is a comprehensive SaaS solution designed for scalability, security, and ease of use. With complete data isolation, modern technology stack, and free-tier deployment options, it provides an excellent foundation for managing portfolio issues across multiple clients.

The architecture is designed to scale from MVP to enterprise-level while maintaining cost-effectiveness and security best practices.

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Complete Project Overview  
**Next Steps:** Begin Phase 1 - Project Setup

---

*For detailed implementation instructions, see BUILD_GUIDE.md*  
*For quick reference, see QUICK_START.md*  
*For technical architecture details, see DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt*

















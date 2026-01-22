# Folder Structure Reference

## 📁 Complete Project Structure

The complete folder structure and all components are already defined in **`DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt`**.

This document serves as a quick reference to the structure.

---

## 📂 Frontend Structure (client/)

```
client/
├── public/                    # Static files
│   ├── index.html
│   ├── favicon.ico
│   ├── manifest.json
│   └── robots.txt
│
└── src/
    ├── assets/                # Images, fonts
    │   ├── images/
    │   └── fonts/
    │
    ├── components/            # All React components
    │   ├── auth/              # Authentication
    │   │   ├── UserLogin.tsx
    │   │   ├── AdminLogin.tsx
    │   │   ├── ForgotPassword.tsx
    │   │   └── PrivateRoute.tsx
    │   │
    │   ├── common/            # Reusable UI components
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Table.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Spinner.tsx
    │   │   ├── Toast.tsx
    │   │   ├── Pagination.tsx
    │   │   ├── SearchBar.tsx
    │   │   └── ... (see full list in DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt)
    │   │
    │   ├── layout/            # Layout components
    │   │   ├── Navbar.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── Footer.tsx
    │   │   ├── MainLayout.tsx
    │   │   └── AuthLayout.tsx
    │   │
    │   ├── dashboard/         # Dashboard components
    │   │   ├── Dashboard.tsx
    │   │   ├── StatsCard.tsx
    │   │   ├── QuickActions.tsx
    │   │   └── RecentActivity.tsx
    │   │
    │   ├── portfolio/         # Portfolio management
    │   │   ├── PortfolioList.tsx
    │   │   ├── PortfolioCard.tsx
    │   │   ├── PortfolioForm.tsx
    │   │   ├── PortfolioDetails.tsx
    │   │   ├── PortfolioStatusHeatMap.tsx
    │   │   ├── PortfolioHeatMap.tsx
    │   │   ├── PortfolioMonitoringMatrix.tsx
    │   │   └── PortfolioHourSessionDrawer.tsx
    │   │
    │   ├── issues/            # Issue tracking
    │   │   ├── IssueList.tsx
    │   │   ├── IssueForm.tsx
    │   │   ├── IssueCard.tsx
    │   │   ├── IssueDetailsView.tsx
    │   │   ├── EditIssueModal.tsx
    │   │   ├── IssuesTable.tsx
    │   │   ├── IssuesByUser.tsx
    │   │   └── TicketLoggingTable.tsx
    │   │
    │   ├── analytics/         # Analytics & charts
    │   │   ├── HourlyCoverageChart.tsx
    │   │   ├── IssuesChart.tsx
    │   │   ├── CoverageChart.tsx
    │   │   ├── PerformanceAnalytics.tsx
    │   │   └── TrendChart.tsx
    │   │
    │   ├── admin/             # Admin panel
    │   │   ├── AdminPanel.tsx
    │   │   ├── AdminLogWidget.tsx
    │   │   ├── UserManagement.tsx
    │   │   ├── PortfolioManagement.tsx
    │   │   └── SystemSettings.tsx
    │   │
    │   └── super-admin/       # Super admin
    │       ├── SuperAdminDashboard.tsx
    │       ├── TenantList.tsx
    │       ├── TenantForm.tsx
    │       ├── TenantDetails.tsx
    │       ├── GlobalAnalytics.tsx
    │       ├── BillingManagement.tsx
    │       └── SystemMonitoring.tsx
    │
    ├── hooks/                 # Custom React hooks
    │   ├── useAuth.ts
    │   ├── useTenant.ts
    │   ├── usePermissions.ts
    │   ├── useApi.ts
    │   ├── useDebounce.ts
    │   ├── useLocalStorage.ts
    │   └── ... (see full list)
    │
    ├── context/               # React Context
    │   ├── AuthContext.tsx
    │   ├── TenantContext.tsx
    │   ├── ThemeContext.tsx
    │   └── NotificationContext.tsx
    │
    ├── services/              # API services
    │   ├── api.ts
    │   ├── supabaseClient.ts
    │   ├── authService.ts
    │   ├── portfolioService.ts
    │   ├── issueService.ts
    │   ├── userService.ts
    │   ├── tenantService.ts
    │   └── analyticsService.ts
    │
    ├── utils/                 # Utility functions
    │   ├── constants.ts
    │   ├── helpers.ts
    │   ├── validators.ts
    │   ├── formatters.ts
    │   ├── dateUtils.ts
    │   ├── colorUtils.ts
    │   ├── exportUtils.ts
    │   └── permissions.ts
    │
    ├── types/                 # TypeScript types
    │   ├── index.ts
    │   ├── auth.types.ts
    │   ├── tenant.types.ts
    │   ├── user.types.ts
    │   ├── portfolio.types.ts
    │   ├── issue.types.ts
    │   ├── analytics.types.ts
    │   └── api.types.ts
    │
    ├── styles/                # CSS styles
    │   ├── index.css
    │   ├── globals.css
    │   ├── variables.css
    │   └── animations.css
    │
    ├── App.tsx                # Main app component
    └── index.tsx              # Entry point
```

---

## 📂 Backend Structure (server/)

```
server/
├── src/
    ├── config/                # Configuration
    │   ├── database.config.ts
    │   ├── auth.config.ts
    │   ├── cors.config.ts
    │   ├── supabase.config.ts
    │   └── constants.ts
    │
    ├── routes/                # API routes
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
    ├── controllers/           # Request handlers
    │   ├── auth.controller.ts
    │   ├── tenant.controller.ts
    │   ├── user.controller.ts
    │   ├── portfolio.controller.ts
    │   ├── issue.controller.ts
    │   ├── analytics.controller.ts
    │   ├── admin.controller.ts
    │   └── superadmin.controller.ts
    │
    ├── services/              # Business logic
    │   ├── auth.service.ts
    │   ├── tenant.service.ts
    │   ├── user.service.ts
    │   ├── portfolio.service.ts
    │   ├── issue.service.ts
    │   ├── analytics.service.ts
    │   ├── email.service.ts
    │   └── export.service.ts
    │
    ├── middleware/            # Express middleware
    │   ├── auth.middleware.ts
    │   ├── tenantIsolation.middleware.ts
    │   ├── permission.middleware.ts
    │   ├── validation.middleware.ts
    │   ├── rateLimiter.middleware.ts
    │   ├── errorHandler.middleware.ts
    │   ├── logger.middleware.ts
    │   └── cors.middleware.ts
    │
    ├── models/                # Database models/types
    │   ├── index.ts
    │   ├── tenant.model.ts
    │   ├── user.model.ts
    │   ├── portfolio.model.ts
    │   ├── issue.model.ts
    │   ├── reservation.model.ts
    │   ├── adminLog.model.ts
    │   └── subscription.model.ts
    │
    ├── utils/                 # Utility functions
    │   ├── jwt.util.ts
    │   ├── password.util.ts
    │   ├── validation.util.ts
    │   ├── logger.util.ts
    │   ├── email.util.ts
    │   ├── date.util.ts
    │   └── supabase.util.ts
    │
    ├── validators/            # Validation schemas
    │   ├── auth.validator.ts
    │   ├── tenant.validator.ts
    │   ├── user.validator.ts
    │   ├── portfolio.validator.ts
    │   └── issue.validator.ts
    │
    ├── types/                 # TypeScript types
    │   ├── index.d.ts
    │   ├── express.d.ts
    │   └── environment.d.ts
    │
    ├── app.ts                 # Express app setup
    └── server.ts              # Server entry point
```

---

## 📂 Database Structure (database/)

```
database/
├── migrations/                # SQL migrations
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
├── seeds/                     # Seed data
│   ├── dev_tenants.sql
│   ├── dev_users.sql
│   └── dev_portfolios.sql
│
├── schema.sql                 # Complete schema
├── schema.md                  # Schema documentation
└── ER_DIAGRAM.md              # ER diagram
```

---

## 📝 Notes

1. **All components are listed** in `DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt`
2. **Create folders as you build** - you don't need to create everything at once
3. **Follow the structure** when creating new files
4. **Reference the detailed file** for complete component lists

---

## ✅ Implementation Order

When building, follow this order:

1. **Phase 1**: Create basic folder structure (only what's needed)
2. **Phase 2**: Frontend setup with basic folders
3. **Phase 3**: Database setup
4. **Phase 4**: Backend setup with basic folders
5. **Phase 5-7**: Build features, creating folders/components as needed

You don't need to create all folders at once - create them as you build each feature!

---

For the **complete detailed structure** with all components, see:
**`DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt`**





















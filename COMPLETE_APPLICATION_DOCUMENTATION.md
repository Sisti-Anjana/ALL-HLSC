# Multi-Tenant Portfolio Issue Tracking System
## Complete Application Documentation

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Purpose:** Comprehensive documentation for future reference, maintenance, and onboarding

---

## 📋 Table of Contents

1. [Application Overview](#application-overview)
2. [Technologies & Tools Used](#technologies--tools-used)
3. [Credentials & Configuration](#credentials--configuration)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Environment Variables](#environment-variables)
7. [Setup Instructions](#setup-instructions)
8. [Deployment Information](#deployment-information)
9. [API Endpoints](#api-endpoints)
10. [Key Features](#key-features)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance Notes](#maintenance-notes)

---

## 🎯 Application Overview

### What is This Application?

A **Multi-Tenant Portfolio Issue Tracking System** - a Software-as-a-Service (SaaS) web application that enables multiple companies (tenants) to track, manage, and monitor issues across their portfolio of sites.

### Core Purpose

- **Issue Tracking**: Log and manage issues found during hourly monitoring (24-hour cycle: 0-23 hours)
- **Portfolio Management**: Organize and manage multiple portfolios per client
- **Multi-Tenant Architecture**: Multiple companies use the same application with complete data isolation
- **Real-time Analytics**: Dashboard with statistics, charts, and heat maps
- **Admin Management**: Comprehensive admin panel for managing portfolios, users, and settings

### Use Case Example

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

## 🛠️ Technologies & Tools Used

### Frontend (Client)

**Framework & Libraries:**
- **React 18.2.0** - UI framework
- **TypeScript 4.9.5** - Type-safe JavaScript
- **React Router DOM 6.20.0** - Client-side routing
- **TanStack React Query 5.8.4** - Data fetching and caching
- **Zustand 4.4.7** - State management
- **React Hook Form 7.48.2** - Form handling
- **Chart.js 4.4.0** & **react-chartjs-2 5.2.0** - Data visualization
- **Axios 1.6.2** - HTTP client
- **React Hot Toast 2.4.1** - Notifications
- **date-fns 2.30.0** - Date manipulation

**Styling:**
- **Tailwind CSS 3.3.6** - Utility-first CSS framework
- **PostCSS 8.4.32** - CSS processing
- **Autoprefixer 10.4.16** - CSS vendor prefixing

**Build Tools:**
- **React Scripts 5.0.1** - Create React App build system
- **TypeScript Compiler** - Type checking and compilation

**Development:**
- **Node.js** (v18.0.0 or higher)
- **npm** - Package manager

### Backend (Server)

**Runtime & Framework:**
- **Node.js** (v18.0.0 or higher) - JavaScript runtime
- **Express 4.18.2** - Web framework
- **TypeScript 5.3.3** - Type-safe JavaScript
- **tsx 4.21.0** - TypeScript execution

**Database:**
- **Supabase** (PostgreSQL) - Database and authentication
- **@supabase/supabase-js 2.38.4** - Supabase client library

**Authentication & Security:**
- **jsonwebtoken 9.0.2** - JWT token generation/verification
- **bcrypt 5.1.1** - Password hashing
- **helmet 7.1.0** - Security headers
- **express-rate-limit 7.1.5** - Rate limiting
- **cors 2.8.5** - Cross-origin resource sharing

**Utilities:**
- **dotenv 16.3.1** - Environment variable management
- **express-validator 7.0.1** - Input validation
- **winston 3.11.0** - Logging

**Development:**
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting

### Database

- **PostgreSQL** (via Supabase)
- **Supabase Row Level Security (RLS)** - Data isolation
- **Supabase Auth** - User authentication

### Deployment

- **Vercel** - Frontend and backend hosting
- **GitHub** - Version control and CI/CD trigger
- **Vercel CLI** - Deployment management

### Development Tools

- **Git** - Version control
- **VS Code / Cursor** - Code editor
- **Postman / Insomnia** - API testing (optional)
- **Supabase Dashboard** - Database management

---

## 🔐 Credentials & Configuration

### ⚠️ SECURITY WARNING

**NEVER commit credentials to Git!** All sensitive information should be stored in `.env` files which are excluded from version control.

### Supabase Credentials

**Location:** `server/.env` and Supabase Dashboard

**Required Credentials:**
1. **SUPABASE_URL**
   - Format: `https://[project-id].supabase.co`
   - Example: `https://fylctxvbxyigkrufzxgu.supabase.co`
   - Where to find: Supabase Dashboard → Settings → API → Project URL

2. **SUPABASE_SERVICE_KEY** (Service Role Key)
   - Format: JWT token starting with `eyJ`
   - ⚠️ **KEEP THIS SECRET!** This key has admin privileges
   - Where to find: Supabase Dashboard → Settings → API → service_role key
   - **DO NOT** use the `anon` key - use the `service_role` key

3. **SUPABASE_ANON_KEY** (For frontend - optional)
   - Format: JWT token starting with `eyJ`
   - Where to find: Supabase Dashboard → Settings → API → anon public key
   - Used for client-side Supabase operations (if needed)

**How to Access Supabase Dashboard:**
1. Go to: https://app.supabase.com
2. Sign in with your Supabase account
3. Select your project
4. Navigate to Settings → API

### JWT Configuration

**Location:** `server/.env`

**Required Variables:**
- **JWT_SECRET**: Secret key for signing JWT tokens
  - Should be a long, random string
  - Generate using: `openssl rand -base64 64` or online generator
  - Example: `XguGQUaiQOVaShXTjueIxCk43yqtjWJH8HO5mjhkmO+DLiaNNjaB/nt2afadtPAgPi5EBnspmjwLAJfuKOjrrQ==`

- **JWT_EXPIRES_IN**: Token expiration time
  - Format: `7d` (7 days), `24h` (24 hours), `1h` (1 hour)
  - Default: `7d`

### Database Credentials

**Database Access:**
- **Host**: Provided by Supabase (in connection string)
- **Database**: Provided by Supabase
- **User**: Provided by Supabase
- **Password**: Provided by Supabase

**Connection String:**
- Available in Supabase Dashboard → Settings → Database → Connection String
- Use "URI" format for direct PostgreSQL access

**⚠️ Important:** The application uses Supabase client library, so direct database credentials are not needed in the application code.

### GitHub Repository

**Repository URL:** `https://github.com/Sisti-Anjana/ALL-HLSC.git`

**Access:**
- Requires GitHub account with repository access
- SSH keys or personal access tokens for authentication

### Vercel Deployment

**Vercel Dashboard:** https://vercel.com/dashboard

**Deployment URLs:**
- Production: Check Vercel dashboard for deployed URLs
- Example format: `https://[project-name].vercel.app`

**Environment Variables in Vercel:**
- Set in Vercel Dashboard → Project → Settings → Environment Variables
- Required variables (same as `.env` files):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `FRONTEND_URL`
  - `PORT`
  - `NODE_ENV`

### Default Admin Credentials

**⚠️ IMPORTANT:** Change default passwords immediately after first login!

**Super Admin:**
- Email: Set during initial setup (check database)
- Password: Set during initial setup (check database or reset script)

**Tenant Admin:**
- Created per tenant during tenant creation
- Credentials stored in database (encrypted)

**Password Reset:**
- Use SQL scripts in root directory:
  - `UPDATE_SUPER_ADMIN_PASSWORD.sql`
  - `FIX_SUPER_ADMIN_PASSWORD.sql`
- Or use Supabase Dashboard → Authentication → Users

---

## 📁 Project Structure

```
ALLLL HLSC/
│
├── client/                          # Frontend React Application
│   ├── public/                      # Static assets
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── images/
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── admin/              # Admin panel components
│   │   │   ├── analytics/           # Analytics & charts
│   │   │   ├── auth/                # Authentication components
│   │   │   ├── common/              # Reusable components
│   │   │   ├── dashboard/           # Dashboard components
│   │   │   ├── issues/              # Issue management
│   │   │   ├── layout/              # Layout components
│   │   │   └── portfolio/           # Portfolio components
│   │   ├── context/                 # React Context providers
│   │   │   ├── AuthContext.tsx
│   │   │   ├── TenantContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── services/                # API service layer
│   │   │   ├── api.ts               # Axios configuration
│   │   │   ├── authService.ts
│   │   │   ├── portfolioService.ts
│   │   │   ├── issueService.ts
│   │   │   ├── adminService.ts
│   │   │   └── analyticsService.ts
│   │   ├── types/                   # TypeScript type definitions
│   │   ├── utils/                   # Utility functions
│   │   │   ├── timezone.ts          # EST timezone utilities
│   │   │   ├── dateUtils.ts
│   │   │   └── exportUtils.ts
│   │   ├── App.tsx                   # Main app component
│   │   └── index.tsx                # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── .env                          # Frontend environment variables
│
├── server/                          # Backend Express API
│   ├── src/
│   │   ├── config/                  # Configuration files
│   │   │   ├── constants.ts        # Environment variables
│   │   │   ├── database.config.ts   # Supabase client
│   │   │   └── env.ts               # Environment validation
│   │   ├── controllers/             # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── portfolio.controller.ts
│   │   │   ├── issue.controller.ts
│   │   │   ├── admin.controller.ts
│   │   │   └── analytics.controller.ts
│   │   ├── middleware/              # Express middleware
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── tenantIsolation.middleware.ts
│   │   │   ├── errorHandler.middleware.ts
│   │   │   └── validator.middleware.ts
│   │   ├── routes/                  # API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── portfolio.routes.ts
│   │   │   ├── issue.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── analytics.routes.ts
│   │   ├── services/                # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── portfolio.service.ts
│   │   │   ├── issue.service.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── lock-cleanup.service.ts
│   │   ├── utils/                   # Utility functions
│   │   │   ├── jwt.util.ts          # JWT token utilities
│   │   │   └── logger.util.ts
│   │   ├── validators/              # Input validation schemas
│   │   ├── app.ts                   # Express app setup
│   │   └── server.ts                # Server entry point
│   ├── api/
│   │   └── index.ts                 # Vercel serverless function
│   ├── scripts/                     # Utility scripts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                          # Backend environment variables
│
├── database/                        # Database migrations & seeds
│   ├── migrations/
│   └── seeds/
│
├── *.sql                            # SQL scripts for setup/maintenance
├── *.md                             # Documentation files
├── vercel.json                      # Vercel deployment configuration
└── .gitignore                       # Git ignore rules
```

---

## 🗄️ Database Schema

### Core Tables

#### 1. TENANTS
**Purpose:** Multi-tenant client records
- `tenant_id` (UUID, Primary Key)
- `name` (VARCHAR) - Company/tenant name
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 2. USERS
**Purpose:** Authentication accounts
- `user_id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key → TENANTS)
- `email` (VARCHAR, Unique per tenant)
- `password_hash` (VARCHAR) - bcrypt hashed
- `full_name` (VARCHAR)
- `role` (ENUM: `super_admin`, `tenant_admin`, `user`)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### 3. PORTFOLIOS
**Purpose:** Portfolio/project records
- `portfolio_id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key → TENANTS)
- `name` (VARCHAR) - Unique per tenant
- `subtitle` (VARCHAR, nullable)
- `site_range` (VARCHAR, nullable)
- `all_sites_checked` (VARCHAR: 'Yes', 'No', 'Pending')
- `all_sites_checked_date` (DATE, nullable)
- `all_sites_checked_hour` (INTEGER, nullable)
- `all_sites_checked_by` (UUID, nullable, Foreign Key → USERS)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 4. ISSUES
**Purpose:** Issue/ticket records
- `issue_id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key → TENANTS)
- `portfolio_id` (UUID, Foreign Key → PORTFOLIOS)
- `site_name` (VARCHAR)
- `issue_hour` (INTEGER, 0-23)
- `description` (TEXT)
- `issue_type` (VARCHAR, nullable)
- `status` (VARCHAR: 'Open', 'In Progress', 'Resolved', 'Closed')
- `monitored_by` (TEXT[]) - Array of email addresses
- `missed_by` (TEXT[]) - Array of email addresses
- `created_by` (UUID, Foreign Key → USERS)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 5. HOUR_RESERVATIONS
**Purpose:** Portfolio locking system
- `id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key → TENANTS)
- `portfolio_id` (UUID, Foreign Key → PORTFOLIOS)
- `issue_hour` (INTEGER, 0-23)
- `user_email` (VARCHAR)
- `expires_at` (TIMESTAMP) - Auto-expires after 1 hour
- `created_at` (TIMESTAMP)
- **Unique Constraint:** `(tenant_id, portfolio_id, issue_hour)`

#### 6. ADMIN_LOGS
**Purpose:** Audit trail
- `log_id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key → TENANTS)
- `admin_name` (VARCHAR)
- `action_type` (VARCHAR) - e.g., 'PORTFOLIO_CHECKED', 'PORTFOLIO_LOCKED'
- `related_portfolio_id` (UUID, nullable)
- `related_user_id` (UUID, nullable)
- `metadata` (JSONB) - Additional action details
- `created_at` (TIMESTAMP)

#### 7. MONITORED_PERSONNEL
**Purpose:** List of monitoring personnel
- `id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key → TENANTS)
- `name` (VARCHAR) - Unique per tenant
- `email` (VARCHAR, nullable)
- `created_at` (TIMESTAMP)

### Relationships

```
TENANTS (1) ──< (Many) USERS
TENANTS (1) ──< (Many) PORTFOLIOS
TENANTS (1) ──< (Many) ISSUES
TENANTS (1) ──< (Many) HOUR_RESERVATIONS
TENANTS (1) ──< (Many) ADMIN_LOGS
TENANTS (1) ──< (Many) MONITORED_PERSONNEL

PORTFOLIOS (1) ──< (Many) ISSUES
PORTFOLIOS (1) ──< (Many) HOUR_RESERVATIONS

USERS (1) ──< (Many) ISSUES (created_by)
```

---

## 🔧 Environment Variables

### Backend (`server/.env`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
```

### Frontend (`client/.env`)

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Supabase Configuration (if needed for client-side operations)
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vercel Environment Variables

Set the same variables in Vercel Dashboard:
- Project → Settings → Environment Variables
- Add variables for Production, Preview, and Development environments

---

## 🚀 Setup Instructions

### Prerequisites

1. **Node.js** (v18.0.0 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Git**
   - Download from: https://git-scm.com/
   - Verify: `git --version`

4. **Supabase Account**
   - Sign up at: https://supabase.com
   - Create a new project

5. **Vercel Account** (for deployment)
   - Sign up at: https://vercel.com

### Local Development Setup

#### Step 1: Clone Repository

```bash
git clone https://github.com/Sisti-Anjana/ALL-HLSC.git
cd "ALLLL HLSC"
```

#### Step 2: Backend Setup

```bash
cd server
npm install
```

Create `server/.env` file:
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

Start backend server:
```bash
npm run dev
```

Server runs on: http://localhost:5000

#### Step 3: Frontend Setup

Open a new terminal:
```bash
cd client
npm install
```

Create `client/.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start frontend development server:
```bash
npm start
```

Frontend runs on: http://localhost:3000

#### Step 4: Database Setup

1. **Create Database Tables:**
   - Use SQL scripts in root directory
   - Or use Supabase Dashboard → SQL Editor

2. **Set up Row Level Security (RLS):**
   - Enable RLS on all tables
   - Create RLS policies for tenant isolation

3. **Create Super Admin:**
   - Use SQL script: `CREATE_SUPER_ADMIN.sql`
   - Or use Supabase Dashboard → Authentication

### Production Deployment

#### Vercel Deployment

1. **Connect GitHub Repository:**
   - Go to Vercel Dashboard
   - Click "New Project"
   - Import GitHub repository

2. **Configure Build Settings:**
   - Frontend: Root directory: `client`, Build command: `npm run build`, Output directory: `build`
   - Backend: Root directory: `server`, Build command: `npm run build`, Output directory: `dist`

3. **Set Environment Variables:**
   - Add all required environment variables in Vercel Dashboard
   - Set for Production, Preview, and Development

4. **Deploy:**
   - Vercel automatically deploys on git push to main branch
   - Or manually trigger deployment from dashboard

---

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/reset-password` - Reset password

### Portfolios

- `GET /api/portfolios` - Get all portfolios (filtered by tenant)
- `GET /api/portfolios/:id` - Get portfolio by ID
- `POST /api/portfolios` - Create portfolio
- `PUT /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio

### Issues

- `GET /api/issues` - Get all issues (with filters)
- `GET /api/issues/:id` - Get issue by ID
- `POST /api/issues` - Create issue
- `PUT /api/issues/:id` - Update issue
- `DELETE /api/issues/:id` - Delete issue

### Admin

- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/portfolios` - Get all portfolios (admin view)
- `GET /api/admin/locks` - Get portfolio locks
- `GET /api/admin/logs` - Get admin activity logs
- `GET /api/admin/personnel` - Get monitored personnel
- `POST /api/admin/personnel` - Add personnel
- `DELETE /api/admin/personnel/:id` - Remove personnel

### Analytics

- `GET /api/analytics/dashboard` - Get dashboard statistics
- `GET /api/analytics/hourly-coverage` - Get hourly coverage data
- `GET /api/analytics/issues-over-time` - Get issues over time
- `GET /api/analytics/portfolio-heatmap` - Get portfolio heatmap data
- `GET /api/analytics/coverage-matrix` - Get coverage matrix data
- `GET /api/analytics/portfolio-activity` - Get portfolio activity

---

## ✨ Key Features

### 1. Multi-Tenant Architecture
- Complete data isolation between tenants
- Tenant-based access control
- Row Level Security (RLS) at database level

### 2. Portfolio Management
- Create, edit, delete portfolios
- Track "All Sites Checked" status
- Portfolio locking system (1-hour expiration)
- Site range tracking

### 3. Issue Tracking
- Hourly issue logging (0-23 hours)
- Issue status tracking
- Severity levels
- Assignment to monitoring personnel
- Missed alert tracking

### 4. Dashboard & Analytics
- Real-time statistics
- Hourly coverage charts
- Portfolio heatmaps
- Performance analytics
- Coverage matrix
- Export to Excel/CSV

### 5. Admin Panel
- User management
- Portfolio management
- Personnel management
- Activity logs
- Lock management

### 6. Authentication & Security
- JWT-based authentication
- Password hashing (bcrypt)
- Role-based access control
- Session management

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Invalid API key" Error
**Solution:**
- Check `server/.env` file exists
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Ensure using `service_role` key, not `anon` key
- Restart server after updating `.env`

#### 2. Port Already in Use
**Solution:**
- Change `PORT` in `server/.env`
- Or kill process using port: `npx kill-port 5000`

#### 3. Build Errors on Vercel
**Solution:**
- Check environment variables are set in Vercel
- Verify `tsconfig.json` exists in server directory
- Check build logs in Vercel dashboard
- Ensure Node.js version is >= 18.0.0

#### 4. CORS Errors
**Solution:**
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check CORS configuration in `server/src/app.ts`

#### 5. Database Connection Issues
**Solution:**
- Verify Supabase project is active
- Check Supabase credentials are correct
- Ensure RLS policies are set up correctly
- Check Supabase dashboard for service status

#### 6. TypeScript Errors
**Solution:**
- Run `npm install` to ensure dependencies are installed
- Check `tsconfig.json` configuration
- Verify TypeScript version compatibility

---

## 📝 Maintenance Notes

### Regular Maintenance Tasks

1. **Database Backups**
   - Supabase automatically backs up databases
   - Manual backups available in Supabase Dashboard
   - Export data regularly for additional safety

2. **Dependency Updates**
   - Regularly update npm packages: `npm outdated`
   - Test updates in development before production
   - Check for security vulnerabilities: `npm audit`

3. **Log Monitoring**
   - Check server logs regularly
   - Monitor error logs in Vercel dashboard
   - Review admin activity logs

4. **Performance Monitoring**
   - Monitor API response times
   - Check database query performance
   - Review Vercel analytics

5. **Security Updates**
   - Keep dependencies updated
   - Rotate JWT secrets periodically
   - Review and update RLS policies

### Important Files to Backup

- `server/.env` - Environment variables
- `client/.env` - Frontend environment variables
- Database backups from Supabase
- SQL migration scripts
- Documentation files

### Version Control

- **Main Branch:** Production-ready code
- **Feature Branches:** New features/updates
- **Never commit:** `.env` files, `node_modules/`, build artifacts

### Deployment Checklist

- [ ] Update environment variables in Vercel
- [ ] Run tests locally
- [ ] Check build succeeds locally
- [ ] Review code changes
- [ ] Update documentation if needed
- [ ] Deploy to preview environment first
- [ ] Test preview deployment
- [ ] Deploy to production
- [ ] Monitor deployment logs
- [ ] Verify production deployment works

---

## 📞 Support & Resources

### Documentation Files

- `PROJECT_OVERVIEW_COMPLETE.md` - Detailed project overview
- `BUILD_GUIDE.md` - Build and setup guide
- `Dashboard_and_Log_Issues_Complete_Documentation.md` - Feature documentation
- `ER_DIAGRAM.md` - Database schema documentation
- `MULTI_TENANT_WORKFLOW.md` - Multi-tenant architecture details

### External Resources

- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev
- **Express Docs:** https://expressjs.com
- **Vercel Docs:** https://vercel.com/docs
- **TypeScript Docs:** https://www.typescriptlang.org/docs

### SQL Scripts

Located in root directory:
- `CREATE_SUPER_ADMIN.sql` - Create super admin user
- `CREATE_TENANT.sql` - Create new tenant
- `UPDATE_SUPER_ADMIN_PASSWORD.sql` - Reset admin password
- Various verification and fix scripts

---

## 🔒 Security Best Practices

1. **Never commit credentials to Git**
2. **Use strong JWT secrets** (64+ characters)
3. **Rotate secrets periodically**
4. **Enable RLS on all database tables**
5. **Use HTTPS in production**
6. **Implement rate limiting**
7. **Validate all user inputs**
8. **Keep dependencies updated**
9. **Monitor for security vulnerabilities**
10. **Regular security audits**

---

## 📅 Change Log

### Version 1.0 (January 2025)
- Initial release
- Multi-tenant architecture
- Portfolio and issue tracking
- Dashboard and analytics
- Admin panel
- Vercel deployment

---

## 📄 License & Copyright

**Project:** Multi-Tenant Portfolio Issue Tracking System  
**Version:** 1.0  
**Last Updated:** January 2025

---

**END OF DOCUMENTATION**

*This document should be updated whenever significant changes are made to the application, infrastructure, or deployment process.*


# Complete Build Guide: Multi-Tenant Portfolio Issue Tracker
## From Zero to Production - Step by Step

This guide will walk you through building the entire application from scratch to production deployment.

---

## 🎯 Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js 18.x or higher installed ([Download](https://nodejs.org))
- [ ] Git installed ([Download](https://git-scm.com))
- [ ] Code editor (VS Code recommended)
- [ ] A Supabase account ([Sign up free](https://supabase.com))
- [ ] A GitHub account (for deployment)
- [ ] Basic knowledge of JavaScript/TypeScript, React, and Node.js

---

## 📋 Phase 1: Initial Setup & Project Structure

### Step 1.1: Create Project Folder

```bash
# Create main project directory
mkdir multi-tenant-portfolio-tracker
cd multi-tenant-portfolio-tracker

# Initialize Git repository
git init
```

### Step 1.2: Create Root Files

```bash
# Create .gitignore
```

Create `.gitignore`:
```
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment variables
.env
.env.local
.env.production

# Build outputs
build/
dist/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

Create `README.md`:
```markdown
# Multi-Tenant Portfolio Issue Tracker

A SaaS application for tracking portfolio issues across multiple tenants.

## Tech Stack
- Frontend: React + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL (Supabase)

## Getting Started
See BUILD_GUIDE.md for complete setup instructions.
```

---

## 📁 Phase 2: Frontend Setup (React + TypeScript)

### Step 2.1: Create React App

```bash
# Navigate to project root
cd multi-tenant-portfolio-tracker

# Create React app with TypeScript template
npx create-react-app client --template typescript

# Wait for installation to complete...
cd client
```

### Step 2.2: Install Frontend Dependencies

```bash
cd client

# Routing
npm install react-router-dom
npm install --save-dev @types/react-router-dom

# HTTP Client
npm install axios

# State Management & Data Fetching
npm install @tanstack/react-query zustand

# Forms
npm install react-hook-form

# Date Utilities
npm install date-fns

# Charts
npm install chart.js react-chartjs-2

# Notifications
npm install react-hot-toast

# UI Framework
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 2.3: Configure Tailwind CSS

Edit `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
        },
        danger: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
        },
      },
    },
  },
  plugins: [],
}
```

Edit `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Step 2.4: Create Frontend Folder Structure

**Note**: The complete folder structure with all components is already defined in `DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt`. Reference that file for the full structure.

For now, create the basic folder structure:

```bash
cd client/src

# Create basic folder structure (create subfolders as you build features)
mkdir -p components/{auth,common,layout,dashboard,portfolio,issues,analytics,admin,super-admin}
mkdir -p hooks
mkdir -p context
mkdir -p services
mkdir -p utils
mkdir -p types
mkdir -p styles
mkdir -p assets/images

# See FOLDER_STRUCTURE_REFERENCE.md or DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt 
# for complete list of all components to create
```

---

## 🗄️ Phase 3: Database Setup (Supabase)

### Step 3.1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Name: `portfolio-tracker`
   - Database Password: (save this securely!)
   - Region: Choose closest to you
5. Wait for project to be created (2-3 minutes)

### Step 3.2: Get API Keys

1. In Supabase dashboard, go to Settings → API
2. Copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep secret!)

Save these for later use in environment variables.

### Step 3.3: Create Database Schema

1. Go to SQL Editor in Supabase
2. Create new query
3. Run this SQL (paste from `DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt`):

```sql
-- ============================================
-- MULTI-TENANT DATABASE SCHEMA
-- ============================================

-- 1. TENANTS TABLE
CREATE TABLE tenants (
    tenant_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL UNIQUE,
    subdomain       VARCHAR(100) NOT NULL UNIQUE,
    logo_url        TEXT,
    contact_email   VARCHAR(255) NOT NULL,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USERS TABLE
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    username        VARCHAR(100) NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(255),
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(20) DEFAULT 'user' CHECK (role IN ('super_admin', 'tenant_admin', 'user')),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, username),
    UNIQUE(tenant_id, email)
);

-- 3. PORTFOLIOS TABLE
CREATE TABLE portfolios (
    portfolio_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name                     VARCHAR(255) NOT NULL,
    subtitle                 VARCHAR(100),
    site_range               VARCHAR(100),
    all_sites_checked        VARCHAR(10) CHECK (all_sites_checked IN ('Yes', 'No', 'Pending')),
    all_sites_checked_hour   INTEGER CHECK (all_sites_checked_hour >= 0 AND all_sites_checked_hour <= 23),
    all_sites_checked_date   DATE,
    all_sites_checked_by     VARCHAR(255),
    sites_checked_details    TEXT,
    is_locked                BOOLEAN DEFAULT FALSE,
    locked_by                VARCHAR(255),
    locked_at                TIMESTAMP WITH TIME ZONE,
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- 4. ISSUES TABLE
CREATE TABLE issues (
    issue_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    portfolio_id    UUID NOT NULL REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
    site_name       VARCHAR(255),
    issue_hour      INTEGER NOT NULL CHECK (issue_hour >= 0 AND issue_hour <= 23),
    description     TEXT NOT NULL,
    issue_type      VARCHAR(100),
    severity        VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status          VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    monitored_by    VARCHAR(255),
    missed_by       TEXT[],
    attachments     JSONB DEFAULT '[]',
    notes           TEXT,
    resolved_at     TIMESTAMP WITH TIME ZONE,
    resolved_by     VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      UUID REFERENCES users(user_id)
);

-- 5. HOUR_RESERVATIONS TABLE
CREATE TABLE hour_reservations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    portfolio_id    UUID NOT NULL REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
    issue_hour      INTEGER NOT NULL CHECK (issue_hour >= 0 AND issue_hour <= 23),
    monitored_by    VARCHAR(255) NOT NULL,
    session_id      VARCHAR(255) NOT NULL,
    reserved_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(tenant_id, portfolio_id, issue_hour)
);

-- 6. ADMIN_LOGS TABLE
CREATE TABLE admin_logs (
    log_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    admin_name              VARCHAR(255) NOT NULL,
    action_type             VARCHAR(100) NOT NULL,
    action_description      TEXT NOT NULL,
    related_portfolio_id    UUID REFERENCES portfolios(portfolio_id) ON DELETE SET NULL,
    related_user_id         UUID REFERENCES users(user_id) ON DELETE SET NULL,
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. MONITORED_PERSONNEL TABLE
CREATE TABLE monitored_personnel (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'monitor',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Create Indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_portfolios_tenant_id ON portfolios(tenant_id);
CREATE INDEX idx_issues_tenant_id ON issues(tenant_id);
CREATE INDEX idx_issues_portfolio_id ON issues(portfolio_id);
CREATE INDEX idx_reservations_tenant_id ON hour_reservations(tenant_id);
```

### Step 3.4: Insert Seed Data (Optional for Testing)

```sql
-- Create a test tenant
INSERT INTO tenants (name, subdomain, contact_email) 
VALUES ('Test Company', 'test', 'admin@test.com')
RETURNING tenant_id;

-- Note the tenant_id from above, then:
-- (Replace 'YOUR_TENANT_ID' with actual UUID)

INSERT INTO users (tenant_id, username, email, password_hash, full_name, role)
VALUES (
  'YOUR_TENANT_ID',
  'admin',
  'admin@test.com',
  '$2b$10$rO8qK...', -- You'll generate this later
  'Admin User',
  'tenant_admin'
);
```

---

## ⚙️ Phase 4: Backend Setup (Node.js + Express)

### Step 4.1: Initialize Backend Project

```bash
# From project root
cd multi-tenant-portfolio-tracker

# Create server directory
mkdir server
cd server

# Initialize npm
npm init -y

# Install TypeScript
npm install -D typescript @types/node @types/express ts-node nodemon

# Initialize TypeScript
npx tsc --init
```

### Step 4.2: Configure TypeScript

Edit `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4.3: Install Backend Dependencies

```bash
cd server

# Core
npm install express cors dotenv

# Database
npm install @supabase/supabase-js

# Authentication
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken

# Validation
npm install express-validator

# Security
npm install express-rate-limit helmet

# Logging
npm install winston

# Utilities
npm install uuid
npm install -D @types/uuid @types/cors
```

### Step 4.4: Create Backend Folder Structure

**Note**: The complete folder structure is already defined in `DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt`. Reference that file for the full structure.

Create the basic backend folder structure:

```bash
cd server

mkdir -p src/{config,routes,controllers,services,middleware,models,utils,validators,types}
mkdir -p src/tests

# See FOLDER_STRUCTURE_REFERENCE.md or DETAILED-PROJECT-STRUCTURE-AND-ARCHITECTURE.txt 
# for complete list of all files to create
```

### Step 4.5: Create Basic Server Files

Create `server/src/app.ts`:
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes will be added here
// app.use('/api/auth', authRoutes);
// app.use('/api/portfolios', portfolioRoutes);
// etc.

export default app;
```

Create `server/src/server.ts`:
```typescript
import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

Create `server/nodemon.json`:
```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node src/server.ts"
}
```

Update `server/package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

### Step 4.6: Create Environment Files

Create `server/.env.example`:
```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=8h

# CORS
FRONTEND_URL=http://localhost:3000
```

Create `server/.env` (copy from .env.example and fill in values):
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
JWT_SECRET=change_this_to_random_string
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:3000
```

Create `client/.env.example`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

Create `client/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 🔧 Phase 5: Core Backend Infrastructure

### Step 5.1: Create Supabase Client

Create `server/src/config/supabase.config.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

### Step 5.2: Create Database Utilities

Create `server/src/utils/supabase.util.ts`:
```typescript
import { supabase } from '../config/supabase.config';

export const db = {
  // Helper functions will go here
  query: async (table: string, select: string = '*') => {
    const { data, error } = await supabase.from(table).select(select);
    if (error) throw error;
    return data;
  },
  
  insert: async (table: string, values: any) => {
    const { data, error } = await supabase.from(table).insert(values).select();
    if (error) throw error;
    return data;
  },
  
  update: async (table: string, id: string, values: any) => {
    const { data, error } = await supabase
      .from(table)
      .update(values)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  },
  
  delete: async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },
};
```

### Step 5.3: Create JWT Utilities

Create `server/src/utils/jwt.util.ts`:
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export interface JWTPayload {
  user_id: string;
  tenant_id: string;
  role: string;
  email: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};
```

### Step 5.4: Create Password Utilities

Create `server/src/utils/password.util.ts`:
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

### Step 5.5: Create Error Handler Middleware

Create `server/src/middleware/errorHandler.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  console.error('Error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
```

### Step 5.6: Create Auth Middleware

Create `server/src/middleware/auth.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt.util';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
```

### Step 5.7: Create Tenant Isolation Middleware

Create `server/src/middleware/tenantIsolation.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';

export const tenantIsolationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // This middleware ensures all queries are filtered by tenant_id
  // The tenant_id is extracted from JWT token in authMiddleware
  // and attached to req.user.tenant_id
  
  if (!req.user || !req.user.tenant_id) {
    return res.status(403).json({
      success: false,
      message: 'Tenant context required',
    });
  }
  
  // Add tenant_id to request for use in controllers
  req.body.tenant_id = req.user.tenant_id;
  next();
};
```

---

## 🔐 Phase 6: Authentication System

### Step 6.1: Create Auth Service

Create `server/src/services/auth.service.ts`:
```typescript
import { supabase } from '../config/supabase.config';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { AppError } from '../middleware/errorHandler.middleware';

export const authService = {
  async register(email: string, password: string, fullName: string, tenantId: string) {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        username: email.split('@')[0], // Use email prefix as username
        tenant_id: tenantId,
        role: 'user',
      })
      .select()
      .single();

    if (error) throw error;

    return user;
  },

  async login(email: string, password: string, tenantId: string) {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.is_active) {
      throw new AppError('Account is deactivated', 403);
    }

    // Update last_login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', user.user_id);

    // Generate JWT token
    const token = generateToken({
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      role: user.role,
      email: user.email,
    });

    return { user, token };
  },
};
```

### Step 6.2: Create Auth Controller

Create `server/src/controllers/auth.controller.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler.middleware';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, tenantId } = req.body;

      if (!email || !password || !fullName) {
        throw new AppError('Missing required fields', 400);
      }

      const user = await authService.register(email, password, fullName, tenantId);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user_id: user.user_id, email: user.email },
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, tenantId } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password required', 400);
      }

      const { user, token } = await authService.login(email, password, tenantId);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
```

### Step 6.3: Create Auth Routes

Create `server/src/routes/auth.routes.ts`:
```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

export default router;
```

### Step 6.4: Update App.ts to Include Routes

Update `server/src/app.ts`:
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler.middleware';

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
```

### Step 6.5: Test Backend

```bash
cd server
npm run dev
```

You should see: `🚀 Server running on port 5000`

Test with Postman or curl:
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test register (you'll need tenant_id first)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","fullName":"Test User","tenantId":"your-tenant-id"}'
```

---

## 🎨 Phase 7: Frontend Core Setup

### Step 7.1: Create API Client

Create `client/src/services/api.ts`:
```typescript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Step 7.2: Create Auth Service

Create `client/src/services/authService.ts`:
```typescript
import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  tenantId: string;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
```

### Step 7.3: Create Auth Context

Create `client/src/context/AuthContext.tsx`:
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, tenantId: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    if (token) {
      authService.getCurrentUser()
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string, tenantId: string) => {
    const response = await authService.login({ email, password, tenantId });
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Step 7.4: Create Login Component

Create `client/src/components/auth/UserLogin.tsx`:
```typescript
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const UserLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState(''); // For now, hardcode or get from URL
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, tenantId);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Welcome Back!</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Tenant ID</label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter tenant ID"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserLogin;
```

### Step 7.5: Update App.tsx

Update `client/src/App.tsx`:
```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import UserLogin from './components/auth/UserLogin';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            Logout
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p>Welcome, {user?.full_name}!</p>
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role}</p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<UserLogin />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

### Step 7.6: Test Frontend

```bash
cd client
npm start
```

Visit http://localhost:3000 and test login!

---

## 🚀 Next Steps

After completing the above, you can continue building:

1. **Portfolio Management** - CRUD operations for portfolios
2. **Issue Tracking** - Log, view, edit issues
3. **Admin Panel** - Management interface
4. **Analytics** - Charts and reports
5. **Testing** - Unit and integration tests
6. **Deployment** - Deploy to Vercel + Railway

---

## 📚 Quick Reference Commands

```bash
# Start backend
cd server && npm run dev

# Start frontend (in new terminal)
cd client && npm start

# Build for production
cd server && npm run build
cd client && npm run build
```

---

## ✅ Checklist

- [ ] Phase 1: Project structure created
- [ ] Phase 2: Frontend setup complete
- [ ] Phase 3: Database schema created in Supabase
- [ ] Phase 4: Backend setup complete
- [ ] Phase 5: Core backend infrastructure ready
- [ ] Phase 6: Authentication working
- [ ] Phase 7: Frontend login page working
- [ ] Can register new users
- [ ] Can login and see dashboard
- [ ] JWT tokens being stored and sent correctly

---

**Next**: Continue with Portfolio Management implementation!


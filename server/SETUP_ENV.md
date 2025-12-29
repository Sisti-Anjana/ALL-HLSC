# Environment Setup Guide

## Issue: "Invalid API key" Error

This error occurs when Supabase credentials are missing or incorrect in your `.env` file.

## Steps to Fix:

### 1. Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (this is your `SUPABASE_URL`)
   - **service_role** key (this is your `SUPABASE_SERVICE_KEY`) - ⚠️ Keep this secret!

### 2. Update Your `.env` File

Open `server/.env` and make sure it contains:

```env
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your actual service role key)

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
```

### 3. Important Notes:

- **SUPABASE_URL**: Should start with `https://` and end with `.supabase.co`
- **SUPABASE_SERVICE_KEY**: This is the `service_role` key, NOT the `anon` key
- **JWT_SECRET**: Use a strong random string (you can generate one online)
- Never commit your `.env` file to git!

### 4. Restart Your Server

After updating `.env`, restart your server:
```bash
cd server
npm run dev
```

### 5. Verify Setup

Check the server console - you should see:
```
🚀 Server running on port 5000
📝 Environment: development
```

If you see error messages about missing credentials, double-check your `.env` file.


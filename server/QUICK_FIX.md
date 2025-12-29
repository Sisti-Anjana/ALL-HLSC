# Quick Fix Guide

## Step 1: Restart Your Server
**IMPORTANT**: After updating `.env`, you MUST restart the server!

1. Stop the server (Ctrl+C)
2. Start it again:
   ```bash
   cd server
   npm run dev
   ```

3. Check the console - you should see:
   ```
   ✅ Supabase URL loaded: https://fylctxvbxyigkrufzxgu...
   ✅ Supabase Service Key loaded: eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ✅ Supabase client initializing...
   ✅ Supabase client created successfully
   🚀 Server running on port 5000
   ```

## Step 2: Check Server Logs When You Try to Login

When you try to login, check the server console. You should see:
```
🔐 Login request received
   Email: your@email.com
   Password: ***
```

If you see an error, it will show what's wrong.

## Step 3: Create a Test User

If you get "User not found" or "Invalid email or password", you need to create a user first.

### Option A: Use Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **Users**
4. Click **Add User** → **Create New User**
5. Enter email and password
6. The user will be created

### Option B: Use SQL Editor in Supabase
1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL (replace with your values):
```sql
INSERT INTO users (email, password_hash, full_name, role, tenant_id)
VALUES (
  'test@example.com',
  '$2b$10$YourHashedPasswordHere', -- Use bcrypt to hash your password
  'Test User',
  'user',
  NULL -- or your tenant_id if you have one
);
```

## Step 4: Common Issues

### "Invalid API key"
- ✅ Check server console shows Supabase credentials loaded
- ✅ Restart server after updating .env
- ✅ Verify .env file is in `server/` directory

### "User not found" or "Invalid email or password"
- ✅ User doesn't exist in database - create one (see Step 3)
- ✅ Password might be wrong - check the password hash

### "Valid email is required"
- ✅ Make sure you're entering a valid email format
- ✅ Check the email field in the login form

## Still Having Issues?

1. Check server console logs - they now show detailed error messages
2. Try the debug endpoint: http://localhost:5000/api/debug/config
3. Verify your Supabase project is active and accessible


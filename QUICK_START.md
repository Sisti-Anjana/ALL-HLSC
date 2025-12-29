# Quick Start Guide

## 🚀 Start Both Servers

### Option 1: Use the Batch File (Windows)
Double-click `START_SERVERS.bat`

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

## 🔐 Login

- **URL:** http://localhost:3000/login
- **Email:** user@demo.com
- **Password:** password123

## ✅ Verify Everything Works

1. Backend running on port 5000
2. Frontend running on port 3000
3. Can access http://localhost:3000/login
4. Can login with credentials above

## 🐛 If Login Fails

1. Check backend console for errors
2. Verify user exists: `cd server && npm run verify-user`
3. Check Supabase service key in `server/.env`

## 📝 Next Steps After Login Works

- Create portfolios
- Add issues
- View analytics
- Admin features

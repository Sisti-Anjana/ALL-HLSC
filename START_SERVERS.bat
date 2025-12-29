@echo off
echo Starting Backend Server...
start "Backend Server" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak >nul
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd client && npm start"
echo.
echo Servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Login Credentials:
echo   Email: user@demo.com
echo   Password: password123
pause


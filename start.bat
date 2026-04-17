@echo off
REM Script de démarrage pour Windows

echo.
echo 🚀 Demarrage du Systeme de Notification SMS
echo ============================================
echo.

REM Verifier si Node.js est installe
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installe. Veuillez l'installer d'abord.
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js detecte: %NODE_VERSION%

REM Demarrer le backend
echo.
echo 📦 Demarrage du backend...
cd backend

if not exist "node_modules" (
    echo Installation des dependances du backend...
    call npm install
)

if not exist ".env" (
    copy .env.example .env
)

start "Backend Server" cmd /k npm start
echo ✓ Backend demarrage (port 5000)

timeout /t 2 /nobreak

REM Demarrer le frontend
echo.
echo 🎨 Demarrage du frontend...
cd ..\frontend

if not exist "node_modules" (
    echo Installation des dependances du frontend...
    call npm install
)

if not exist ".env.local" (
    echo REACT_APP_API_URL=http://localhost:5000/api > .env.local
)

start "Frontend App" cmd /k npm start
echo ✓ Frontend demarrage (port 3000)

echo.
echo ============================================
echo 🟢 Application demarree!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔌 API Backend: http://localhost:5000
echo.
echo Les fenetres se fermeront a la fermeture des serveurs
echo ============================================

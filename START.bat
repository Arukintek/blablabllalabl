@echo off
setlocal
cd /d "%~dp0backend"
set "DATABASE_URL=file:./dev.db"

where.exe node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install the current LTS version from https://nodejs.org/ and run START.bat again.
  pause
  exit /b 1
)

where.exe npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm included.
  pause
  exit /b 1
)

if not exist .env (
  >.env echo DATABASE_URL="file:./dev.db"
  >>.env echo PORT=5000
)

if not exist node_modules (
  echo Installing project dependencies. This may take a few minutes on first launch...
  call npm install
  if errorlevel 1 goto failed
)

set "NEED_SEED=0"
if not exist "prisma\dev.db" set "NEED_SEED=1"

call npx prisma db push
if errorlevel 1 goto failed

if "%NEED_SEED%"=="1" (
  call node prisma\seed.js
  if errorlevel 1 goto failed
)

echo Starting Kyndelik at http://localhost:5000/login.html
start "Kyndelik server" cmd /k "cd /d ""%CD%"" && npm start"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5000/login.html"
exit /b 0

:failed
echo Startup failed. Check the message above and make sure Node.js and internet access are available.
pause
exit /b 1
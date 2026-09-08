@echo off
cd /d "%~dp0"
echo ============================================
echo   Home Storage App
echo ============================================
echo  The browser will open automatically once the
echo  server is ready. This may take a moment.
echo --------------------------------------------

where node >nul 2>nul
if errorlevel 1 (
  echo [Notice] Node.js is required to run this app.
  echo          Install it from https://nodejs.org then double-click this file again.
  echo.
  pause
  exit /b 1
)

where git >nul 2>nul
if not errorlevel 1 (
  git rev-parse --is-inside-work-tree >nul 2>nul
  if not errorlevel 1 (
    echo Checking for updates...
    git pull --ff-only
    if errorlevel 1 (
      echo [Notice] Auto-update failed. Continuing with the current version.
    )
  )
)

echo Checking dependencies, this can take a minute the first time...
call npm install
if errorlevel 1 (
  echo.
  echo [Error] Install failed. Please check your internet connection and try again.
  pause
  exit /b 1
)

echo Starting the server in a new window...
start "Home Storage App Server" cmd /k "npm run dev"

set /a tries=0
:waitloop
curl -s -o nul http://localhost:5173/ 2>nul
if not errorlevel 1 goto serverready
set /a tries+=1
if %tries% GEQ 30 goto serverready
timeout /t 1 >nul
goto waitloop

:serverready
start "" http://localhost:5173/
echo.
echo The app is running in the other window titled "Home Storage App Server".
echo Close that window to stop the app. This window can be closed now.
pause

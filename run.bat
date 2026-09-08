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
  wscript.exe "%~dp0msgbox.vbs" "Node.js가 필요합니다. https://nodejs.org 에서 설치한 뒤 run.vbs를 다시 실행해주세요."
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

echo Checking if the server is already running...
curl -s -o nul --max-time 1 http://localhost:5173/ 2>nul
if not errorlevel 1 goto serverready

echo Checking dependencies, this can take a minute the first time...
call npm install
if errorlevel 1 (
  wscript.exe "%~dp0msgbox.vbs" "설치에 실패했어요. 인터넷 연결을 확인한 뒤 다시 실행해주세요."
  exit /b 1
)

echo Starting the server in the background (no visible window)...
wscript.exe "%~dp0start-server-hidden.vbs"

set /a tries=0
:waitloop
curl -s -o nul http://localhost:5173/ 2>nul
if not errorlevel 1 goto serverready
set /a tries+=1
if %tries% GEQ 30 (
  wscript.exe "%~dp0msgbox.vbs" "서버 시작이 오래 걸리고 있어요. .data\server.log 파일을 확인해주세요."
  goto serverready
)
timeout /t 1 >nul
goto waitloop

:serverready
start "" http://localhost:5173/
exit /b 0

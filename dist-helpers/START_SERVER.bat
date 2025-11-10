@echo off
cd /d "%~dp0"

REM Try different ports if 8000 is in use
set PORT=8000
:CHECK_PORT
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo Port %PORT% is in use, trying next port...
    set /a PORT+=1
    goto CHECK_PORT
)

echo Starting local server on port %PORT%...
echo.
echo =====================================
echo   Open your browser to:
echo   http://localhost:%PORT%
echo =====================================
echo.
echo Press Ctrl+C to stop the server
echo.

python -m http.server %PORT%
pause

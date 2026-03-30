@echo off
REM Simple launcher for Communication Template Generator
REM Opens the built app directly in the default browser without starting a local server.

cd /d "%~dp0"

set HTML=index.html

set APP_PATH=%CD%\%HTML%

echo Opening Communication Template Generator...
echo   File: %APP_PATH%

echo.
start "" "%APP_PATH%"

@echo off
:: Asterobia Auto-Backup Script
:: Runs every 2 hours via Windows Task Scheduler

cd /d "C:\___AI_JATOKOM____\Asterobia"

:: Get current timestamp
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set DATE=%%c-%%b-%%a
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME=%%a:%%b

:: Add only code files (no assets)
git add src/ css/ index.html .agent/

:: Check if there are changes
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo No changes to backup at %DATE% %TIME%
    exit /b 0
)

:: Commit with timestamp
git commit -m "Auto-backup %DATE% %TIME%"

:: Push to GitHub
git push origin main

echo Backup completed at %DATE% %TIME%

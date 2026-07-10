@echo off
setlocal
cd /d "%~dp0"
echo Northweld Games Discord webhook setup
echo.
set /p WEBHOOK=Paste the private Discord application webhook: 
if "%WEBHOOK%"=="" (
  echo No webhook was entered.
  pause
  exit /b 1
)
> .env echo DISCORD_WEBHOOK_URL=%WEBHOOK%
>> .env echo PORT=3000
>> .env echo TRUST_PROXY=true
echo.
echo Private .env configuration created successfully.
echo Run npm install, then npm start.
pause

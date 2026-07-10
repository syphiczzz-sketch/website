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
echo.
echo Private .env configuration created successfully.
echo No npm packages need to be installed.
echo Run npm start.
pause

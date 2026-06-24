@echo off
setlocal
title Do-Wallet Extension Installer

set "SCRIPT_URL=https://do-wallet.com/do-wallet-extension-installer.ps1"
set "SCRIPT_PATH=%TEMP%\do-wallet-extension-installer.ps1"

echo.
echo Do-Wallet Extension Installer
echo --------------------------------
echo Downloading installer script...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%SCRIPT_URL%' -OutFile '%SCRIPT_PATH%'"
if errorlevel 1 (
  echo.
  echo Could not download the installer script.
  echo Please check your internet connection and try again.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo The installer did not finish successfully.
  pause
  exit /b %EXIT_CODE%
)

pause

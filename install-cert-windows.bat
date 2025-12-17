@echo off
echo ====================================
echo Installing localhost certificate
echo ====================================
echo.

REM Import certificate to Trusted Root Certification Authorities
certutil -addstore -f "ROOT" "%~dp0certs\localhost.pem"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Certificate installed successfully!
    echo.
    echo 🔄 Restart your browser for changes to take effect.
    echo.
) else (
    echo.
    echo ❌ Failed to install certificate.
    echo    Please run this script as Administrator.
    echo.
)

pause


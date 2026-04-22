@echo off

REM AgriDesk Backend Setup Script for Windows
REM Run this script to set up the backend environment

echo.
echo ================================
echo AgriDesk Backend Setup
echo ================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16.0.0 or higher
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i

echo ✓ Node.js version: %NODE_VERSION%
echo ✓ npm version: %NPM_VERSION%
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✓ Dependencies installed successfully
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please update .env with your configuration
    echo.
)

REM Create uploads directory
if not exist "uploads" (
    echo 📁 Creating uploads directory...
    mkdir uploads
)

REM Create logs directory
if not exist "logs" (
    echo 📁 Creating logs directory...
    mkdir logs
)

echo.
echo ================================
echo ✓ Setup completed successfully!
echo ================================
echo.
echo Next steps:
echo 1. Update .env file with your configuration
echo 2. Run 'npm run dev' to start development server
echo 3. Server will be available at http://localhost:5000
echo.
pause

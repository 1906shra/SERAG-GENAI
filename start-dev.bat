@echo off
echo Starting SERAG GENAI Development Environment...
echo.

echo Checking if MongoDB is running...
netstat -an | findstr "27017" > nul
if %errorlevel% neq 0 (
    echo MongoDB is not running on port 27017.
    echo Please start MongoDB first:
    echo   mongod
    echo.
    pause
    exit /b 1
)

echo MongoDB is running!
echo.

echo Starting backend server...
cd backend
start "Backend Server" cmd /k "npm run dev"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting frontend server...
cd ../frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Development servers are starting...
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo.
echo Press any key to exit this window...
pause > nul

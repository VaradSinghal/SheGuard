@echo off
echo Starting SheGuard Voice Recognition System...
echo.

echo [1/3] Installing Python dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error installing Python dependencies!
    pause
    exit /b 1
)

echo.
echo [2/3] Starting Python backend...
start "SheGuard Backend" cmd /k "python start_voice_api.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Starting frontend...
start "SheGuard Frontend" cmd /k "npm run dev"

echo.
echo ✅ System started!
echo.
echo Backend API: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause >nul

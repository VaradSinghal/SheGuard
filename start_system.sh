#!/bin/bash

echo "Starting SheGuard Voice Recognition System..."
echo

echo "[1/3] Installing Python dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Error installing Python dependencies!"
    exit 1
fi

echo
echo "[2/3] Starting Python backend..."
python start_voice_api.py &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 5

echo
echo "[3/3] Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo
echo "✅ System started!"
echo
echo "Backend API: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo
echo "Press Ctrl+C to stop all services..."

# Function to cleanup on exit
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait

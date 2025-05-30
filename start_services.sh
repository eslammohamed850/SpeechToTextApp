#!/bin/bash

# Start the backend server
echo "Starting FastAPI backend server..."
cd /home/ubuntu/speech_service/backend
python3 run.py &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Start the frontend development server
echo "Starting React frontend development server..."
cd /home/ubuntu/speech_service/frontend/speech_frontend
pnpm run dev &
FRONTEND_PID=$!

echo "Both servers are running!"
echo "Backend API is available at: http://localhost:8000"
echo "Frontend is available at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to press Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait

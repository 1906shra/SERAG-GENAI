#!/bin/bash

echo "Starting SERAG GENAI Development Environment..."
echo

# Check if MongoDB is running
echo "Checking if MongoDB is running..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "MongoDB is not running. Please start MongoDB first:"
    echo "  mongod"
    echo
    echo "Or if using MongoDB Atlas, update your .env file with the connection string."
    echo
    exit 1
fi

echo "MongoDB is running!"
echo

# Start backend server
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo
echo "Development servers are starting..."
echo
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo
echo "Press Ctrl+C to stop all servers"
echo

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set up trap to kill processes on script exit
trap cleanup INT TERM

# Wait for processes
wait

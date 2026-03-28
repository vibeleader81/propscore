#!/bin/bash
# PropScore - Start both backend and frontend

echo "🏠 Starting PropScore..."

# Backend
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  Created backend/.env from template."
  echo "    Add your GOOGLE_MAPS_API_KEY to backend/.env before the app will work."
  echo ""
fi

pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✅ Backend running at http://localhost:8000"
echo "   API docs: http://localhost:8000/api/docs"

# Frontend
cd ../frontend
npm install -q
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend running at http://localhost:5173"

echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" INT
wait

# Quick Start - Minimal Setup

## 🚀 3 Steps to Run SERAG GENAI

### 1. Backend Environment
Create `backend/.env` with:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/serag-genai
JWT_SECRET=any-secret-key-for-development
OPENAI_API_KEY=your-openai-key-here
```

### 2. Frontend Environment  
Create `frontend/.env` with:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

### 3. Run Commands
```bash
# Terminal 1 - Start MongoDB
mongod

# Terminal 2 - Start Backend
cd backend
npm install
npm run dev

# Terminal 3 - Start Frontend  
cd frontend
npm install
npm run dev
```

## 🌐 Access
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## ✅ That's it!
The app will run with basic functionality. For full features, add more API keys to .env files.

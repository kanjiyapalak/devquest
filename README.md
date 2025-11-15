# DevQuest

A full‑stack learning platform with MCQ and coding quests, XP/levels, badges, and an admin panel.

---

## Install

Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB URI)

Folder names
- The project may be organized as `backend/` and `frontend/`.
- If your copy still has `server/` and `client/`, just substitute those names in all commands below.

Steps
1) Backend install
```
cd backend   # or: cd server
npm install
```

2) Frontend install
```
cd frontend  # or: cd client
npm install
```

---

## Environment Files

Create a `.env` file in both backend and frontend using `.env.example` as a reference (create the example if it doesn’t exist).

Backend `.env` (example)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/devquest
JWT_SECRET=change_me
# Optional: only if you use AI features
HF_TOKEN=your_hf_or_router_token
```

Frontend `.env` (example)
```
VITE_API_URL=http://localhost:5000/api
```

---

## Database Setup

Option A — Restore from dump (recommended if `db-backup/` is present)
```
# from repo root
mongorestore --db devquest ./db-backup/devquest
```

Option B — Seed scripts
```
cd backend   # or: cd server
# Node entry moved to src/, scripts are under src/scripts
node src/scripts/initDatabase.js
node src/scripts/seedBadgesForTopics.js
node src/scripts/seedUserTestData.js
```

---

## Run

Backend
```
cd backend   # or: cd server
npm run dev
```

Frontend
```
cd frontend  # or: cd client
npm run dev
```

The frontend runs on port 5173/3000 and the backend on port 5000 by default. Update `.env` values if you change ports.

---

## Tech Stack
- Frontend: React + React Router + Axios
- Backend: Node.js, Express, MongoDB/Mongoose

---

## License
MIT

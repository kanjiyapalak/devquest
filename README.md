# DevQuest

DevQuest (aka "Devquest") is a full‑stack learning platform that blends MCQs and DSA coding quests with XP, levels, and badges.

## Features
- MCQ quests with level‑based XP
- DSA coding editor with test cases, dark/light theme, and code explanations
- XP and level progression per topic and globally
- Badges on topic completion, Profile with KPIs
- Activity tracking with streaks and heatmap
- Admin can manage topics and levels

## Tech Stack
- Client: React (Vite/CRA), React Router, Axios, Monaco editor
- Server: Node.js, Express, MongoDB/Mongoose
- AI: Hugging Face Inference Router for generation/evaluation

## Getting Started
1. Prerequisites
   - Node.js 18+
   - MongoDB running locally or a connection string
2. Setup
   - Copy `.env.example` to `.env` and set values
   - Install deps in both folders
3. Run
   - In `server`: `npm install` then `npm start`
   - In `client`: `npm install` then `npm start`

Client dev server runs on 5173/3000, server on 5000 by default.

## Environment
Example `.env` (server):
```
MONGO_URI=mongodb://localhost:27017/devquest
JWT_SECRET=change_me
HF_TOKEN=your_hf_or_router_token
PORT=5000
```

## Scripts
- server: `npm start` (or `nodemon`), `npm run init:db` to seed
- client: `npm start`, `npm run build`

## License
MIT

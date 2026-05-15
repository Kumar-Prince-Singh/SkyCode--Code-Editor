# Skycode Automator

A secure platform for executing code in multiple programming languages using Docker isolation.

## Phase 1: MVP Setup

### Features
- Modern UI built with React and Tailwind CSS.
- Code editor with language selection.
- Submission history with status tracking.
- Node.js & Express backend with MongoDB integration.
- Professional architecture (Controllers, Routes, Middleware, Config).

### Tech Stack
- **Frontend**: React, Tailwind CSS, Axios, Lucide React.
- **Backend**: Node.js, Express, Mongoose, Dotenv, Cors.
- **Database**: MongoDB.

### Getting Started

#### Backend
1. `cd backend`
2. `npm install`
3. Create `.env` from `.env.example` (Done for you).
4. `npm run dev` (uses nodemon) or `npm start`.

#### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Project Structure
```
polyglot-sandbox/
├── frontend/           # React frontend
├── backend/            # Express backend
├── docker-images/      # Dockerfiles for execution (Phase 2)
└── docs/               # Documentation
```

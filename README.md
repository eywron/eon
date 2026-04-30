# Personal AI Assistant

A single-user, memory-driven AI assistant with persistent personalization.

## Architecture

- Frontend: Next.js (Vercel)
- Backend: FastAPI (Render)
- Database: Supabase Postgres + pgvector
- Auth: Google OAuth via Supabase

## Setup

1. Run the SQL in supabase/schema.sql inside your Supabase project.
2. Copy frontend/.env.example to frontend/.env.local and fill in values.
3. Copy backend/.env.example to backend/.env and fill in values.

## Run locally

Frontend:

- cd frontend
- npm install
- npm run dev

Backend:

- cd backend
- python -m venv .venv
- .venv\Scripts\Activate.ps1 (Windows)
- source .venv/bin/activate (macOS or Linux)
- pip install -r requirements.txt
- uvicorn app.main:app --reload --port 8000

## Deployment notes

Frontend (Vercel):

- Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_BACKEND_URL

Backend (Render):

- Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, GEMINI_MODEL
- Set GEMINI_EMBED_MODEL, FRONTEND_ORIGIN, HISTORY_LIMIT, SEMANTIC_MATCH_COUNT
- Start command: uvicorn app.main:app --host 0.0.0.0 --port 8000

## Memory flow

Every user message triggers:

1. Structured memory fetch (Postgres)
2. Semantic memory retrieval (pgvector)
3. Recent history fetch
4. Prompt assembly and response generation
5. Memory extraction and optional storage

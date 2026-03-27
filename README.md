# CodeShare

Collaborative coding environment for pair programming and interview practice. Users can join a shared session, edit code live and run solutions against test cases. Basically a shared version of LeetCode. Currently working on adding problem import to users can paste a LeetCode link and have that problem added to the databse.

## Features

- Real-time collaborative editor (shared state via CRDTs)
- Sandboxed code execution with test cases
- Optional hint system
- Interview mode with restricted controls
- Preloaded problem set

## Tech Stack

- Frontend: React, Vite, Tailwind, Monaco Editor
- Backend: Node.js, Fastify
- Realtime: Yjs, Socket.io
- Database: PostgreSQL
- Execution: Judge0

## Setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL)
- Judge0 API key

### Install & Run

```bash
git clone <repo-url>
cd codeShare
cp .env.example .env
pnpm install
pnpm dev:fresh
```

Client: `http://localhost:5173`  
Server: `http://localhost:3001`

## Environment Variables

Copy `.env.example` -> `.env` and set:

- `DATABASE_URL` (required)
- `JUDGE0_API_KEY` (required)
- `GROQ_API_KEY` (optional)

## Project Structure

```text
apps/
  client/        Frontend app
  server/        Backend server

packages/
  shared/        Shared types and schemas
  db/            Database layer (migrations, seeds)
```

## Common Commands

```bash
pnpm dev         # Start development
pnpm build       # Build project
pnpm test        # Run tests
pnpm lint        # Lint code
pnpm typecheck   # Type checking
```

## Database

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:reset
```

## Notes

- Server is authoritative for execution and state
- No user accounts; sessions are room-based
- Validation is enforced at API and event boundaries

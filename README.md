# CodeShare

A platform where two users join a room, pick a coding problem and solve it together with shared editing and code execution. No accounts needed.

## What it does

- Two users edit the same code file simultaneously with live cursors, powered by Yjs CRDTs and Monaco Editor
- Solutions run against test cases in a Judge0 sandbox. Users can also add their own test cases
- A hint system pulls from stored hints first, then falls back to an LLM (Groq) when those run out. Both users must approve before a hint is revealed
- An interview mode lets one user control problem selection and solution reveals while the other solves

## Tech Stack

| Layer | Technology |
|-------|------------|
| Client | React, Vite, Tailwind CSS, Monaco Editor |
| Real-time | Yjs, y-monaco, Socket.io |
| Server | Fastify, Pino |
| Database | PostgreSQL |
| Execution | Judge0 CE |
| Hints | Groq API |
| Tooling | pnpm, Turborepo, Biome, Vitest, Playwright |

## Architecture

pnpm monorepo with Turborepo. Four workspaces plus end-to-end and load test suites.

```
codeShare/
  apps/
    client/                        React SPA
      src/
        components/                UI components (editor, panels, toolbar)
        hooks/                     useRoom, useSocket, useHints, useProblems, ...
        lib/                       API client, URL helpers
        pages/                     Route pages (Home, Join, Solver, Problems)
        providers/                 Socket.io and Yjs context providers
        reducers/                  Room state reducer
        types/
        __tests__/
    server/                        Fastify HTTP + WebSocket server
      src/
        clients/                   Judge0Client, GroqClient
        handlers/                  Socket.io event handlers (room, execution, hints, ...)
        lib/                       Room codes, rate limiting, reconnect tokens
        middleware/                 Per-event auth middleware
        models/                    Room, RoomManager
        plugins/                   Fastify plugins (CORS, rate limit, security headers)
        routes/                    REST endpoints (health, problems, rooms)
        services/                  ExecutionService, HintService, ProblemService, ScraperService
        ws/                        WebSocket upgrade routing, Socket.io setup, Yjs relay
        __tests__/
  packages/
    shared/                        Types, enums, Zod schemas, Socket.io event contracts
      src/
    db/                            PostgreSQL pool, repositories, migrations
      src/
        migrations/                SQL schema files (problems, test_cases, boilerplate, hints)
        repositories/              Data access layer (problem, testCase, boilerplate, hint)
        seeds/                     NeetCode 150 seed data (18 categories)
        types.ts                   Row-to-app type mapping (snake_case to camelCase)
  e2e/                             Playwright end-to-end tests
  load-tests/                      Load testing scenarios
```

### Design

The server runs two WebSocket channels on a single HTTP server, split by path during the upgrade handshake.

`/ws/yjs` carries binary CRDT sync traffic. Every keystroke merges without conflict through Yjs. The server keeps its own `Y.Doc` per room so it always has the current code without clients needing to send it.

`/ws/socket` carries structured JSON events through Socket.io. This channel handles room lifecycle, problem selection, execution requests and hint coordination.

When a user runs code, the server reads the code from its local Yjs document (not from the client), wraps it in a Python test harness that isolates stdout via `os.dup`, and sends it to Judge0. The harness outputs structured JSON between delimiters. The server parses those results without evaluating user output as code.

All socket event payloads are validated with Zod schemas defined in the shared package. Database rows map from `snake_case` to `camelCase` at the repository boundary. Environment variables are validated at startup and missing values crash the server immediately.

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker
- [Judge0 CE API key](https://rapidapi.com/judge0-official/api/judge0-ce)

### Setup

```bash
git clone <repo-url> && cd codeShare
pnpm setup        # Copies .env.example, starts DB, runs migrations and seeds, builds packages
# Edit .env with your JUDGE0_API_KEY
pnpm dev          # Starts client on localhost:5173 and server on localhost:3001
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start client and server in dev mode |
| `pnpm build` | Build all workspaces |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm lint` | Lint all workspaces (Biome) |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm db:up` | Start PostgreSQL via Docker (waits for readiness) |
| `pnpm db:down` | Stop PostgreSQL |
| `pnpm db:migrate` | Run SQL migrations |
| `pnpm db:seed` | Seed NeetCode 150 problem set |
| `pnpm db:reset` | Drop and recreate DB with fresh schema and seed data |
| `pnpm setup` | First-time bootstrap (env, DB, migrations, seeds, build) |
| `pnpm verify` | Lint, typecheck and test in sequence |
| `pnpm dev:fresh` | Start DB if stopped, then start dev servers |

## Environment Variables

Copy `.env.example` to `.env` and add your keys. The server validates all variables at startup.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JUDGE0_API_KEY` | Yes | RapidAPI key for Judge0 CE |
| `GROQ_API_KEY` | No | Groq API key for LLM hint fallback. The app works without it |

## License

MIT

# Sync Engine

A real-time collaborative document editor — the backend and sync
engine behind something like Google Docs, built from scratch to
understand exactly how multi-user editing, conflict resolution, and
offline sync actually work under the hood.

**Live demo:** https://sync-engine-xxxx.vercel.app 

---

## What it does

Multiple people can open the same document and see each other's edits
appear instantly, keep typing while offline and have it merge
correctly on reconnect, and browse or restore any past version of a
document — all backed by a CRDT built from scratch, not a library.

## Key features

- **Real-time collaborative editing** over WebSockets, with live
  presence, typing indicators, and collaborator cursor positions
- **Custom CRDT**, written from scratch (no CRDT library), resolving
  concurrent edits deterministically regardless of network timing —
  proven with automated convergence tests
- **Offline editing with auto-reconnect** — edits made offline queue
  locally and merge correctly once reconnected
- **Full version history**, event-sourced from an append-only
  operation log, with preview and live restore
- **Authentication** with hashed passwords and JWTs, enforced on every
  REST route and the WebSocket handshake independently
- **Automated tests** covering the CRDT algorithm, REST API, and a
  real two-client WebSocket integration test
- **Deployed and live** — backend on Render, frontend on Vercel

## Tech stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Frontend   | React, Vite, Tailwind CSS, CodeMirror             |
| Backend    | Node.js, Express, `ws` (WebSocket)                |
| Database   | MongoDB, Mongoose                                 |
| Testing    | Jest, Supertest                                   |
| Deployment | Render (backend), Vercel (frontend), MongoDB Atlas |

## Architecture, in brief

Browser (React + CodeMirror)
| REST (documents, auth, history)
| WebSocket (live edits, presence, cursors)
v
Express + ws server
|
|-- Custom CRDT (conflict resolution)
|-- Per-document save queue (prevents write races)
|-- Append-only operation log (event-sourced history)
v
MongoDB Atlas

Full engineering detail — including how the CRDT works, the WebSocket
message protocol, and every real bug hit and fixed along the way — is
in [`docs/`](./docs), especially
[`architecture.md`](./docs/architecture.md),
[`crdt.md`](./docs/crdt.md), and
[`decisions.md`](./docs/decisions.md).

## Running it locally

**Backend:**
cd backend
cp .env.example .env # fill in your own MongoDB URI and JWT secret
npm install
npm run dev

**Frontend**, in a second terminal:
cd frontend
cp .env.example .env # defaults to localhost, no changes needed for local dev
npm install
npm run dev
Open `http://localhost:5173`.

## Running the tests
cd backend
npm test

Covers the CRDT convergence algorithm, the full REST API (including
auth and ownership isolation), and a real two-client WebSocket
integration test.

## Project structure
sync-engine/
├── backend/ Express API, WebSocket server, CRDT, models, tests
├── frontend/ React app (editor, sidebar, auth, history panel)
└── docs/ Detailed engineering documentation and decision log

## Documentation

Every major decision and feature is documented as it was built:

- [`docs/architecture.md`](./docs/architecture.md) — how it all fits together
- [`docs/crdt.md`](./docs/crdt.md) — the conflict resolution algorithm, explained
- [`docs/websocket-flow.md`](./docs/websocket-flow.md) — the real-time message protocol
- [`docs/decisions.md`](./docs/decisions.md) — engineering decisions and trade-offs
- [`docs/interview-notes.md`](./docs/interview-notes.md) — plain-English feature summaries
- [`docs/progress.md`](./docs/progress.md) — the full step-by-step build log
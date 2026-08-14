# Architecture

This document explains how Sync Engine's pieces fit together as one
system. For deep detail on any single piece, see the more focused
docs it links to.

## Folder structure
sync-engine/
├── backend/
│ ├── app.js Express app: middleware, routes (no server startup)
│ ├── server.js Connects DB, creates HTTP server, starts listening, attaches WebSockets
│ ├── config/db.js MongoDB connection logic
│ ├── models/ Mongoose schemas: User, Document, OperationLog
│ ├── routes/ REST routes: authRoutes, documentRoutes
│ ├── middleware/auth.js JWT verification middleware for REST routes
│ ├── websocket/ WebSocket server, rooms, presence, the CRDT message protocol
│ ├── crdt/ The CRDT algorithm itself (insert/delete/undelete, convergence logic)
│ ├── services/ reconstructDocument.js — replays history into a past document state
│ ├── utils/ Small shared helpers (forceDns.js, applyOperation.js)
│ └── *.test.js Jest tests, colocated next to the code they test
├── frontend/
│ └── src/
│ ├── components/ React components: NavBar, Sidebar, DocumentEditor, Login, HistoryPanel, StatusIndicator
│ └── utils/ crdt.js (frontend copy), diff.js, cursorExtension.js
└── docs/ This documentation

## Data flow: opening a document
Browser Backend MongoDB
|-- GET /api/documents/:id -->|
| (Authorization: Bearer) |-- verify JWT (middleware)
| |-- check ownership
| |-------- find document ------->|
| |<------- document doc ---------|
|<---------- document JSON ---|
|
|-- WebSocket "join" (token, documentId) ------------------->|
| server verifies JWT + ownership again, joins room |
|<---------- "presence" (who else is here) -------------------|

Notice authorization is checked **twice**, independently — once for the REST fetch, once for the WebSocket join — since they're two separate entry points into the same data (see `decisions.md` for why this matters).

## Data flow: a live edit
Browser A types a character
|
|-- diff against previous text (utils/diff.js)
|-- turn the diff into CRDT operations (insert/delete)
|-- WebSocket: {"type": "crdtOps", operations: [...]}
|
v
Backend: per-document save queue (websocket/socketServer.js)
|-- apply operations to the document's CRDT character array
|-- save the updated document to MongoDB
|-- log the operation batch to OperationLog (event sourcing)
|-- broadcast the operations to every other client in the room
|-- send a "saved" acknowledgment back to Browser A only
|
v
Browser B receives the operations, applies them as a precise
CodeMirror transaction (not a full-text replace) — see crdt.md

The per-document queue is what prevents two near-simultaneous edits
from racing each other and corrupting the saved document — every
save for a given document happens strictly one at a time, in the
order the server received them.

## How the frontend talks to the backend

Two separate channels, used for different things:

- **REST** (`fetch`, with `Authorization: Bearer <token>`) — document
  CRUD, auth, version history, and restoring a past version. Anything
  that's a one-time request/response.
- **WebSocket** — everything continuous and live: joining a document's
  room, sending/receiving edit operations, presence, typing
  indicators, cursor positions, and save acknowledgments. See
  `websocket-flow.md` for the full message protocol.

## How the backend talks to the database

Mongoose (an ODM — object-document mapper) sits between the backend
code and MongoDB, turning schemas (`models/`) into JavaScript objects
with methods like `.save()` and `.find()`. Three collections exist:
`users`, `documents` (current state), and `operationlogs` (permanent,
append-only edit history — see `database.md`).

## How WebSockets fit into the architecture

The WebSocket server isn't a separate process — `server.js` creates
one plain Node HTTP server and attaches **both** Express (for REST)
and the `ws` WebSocket server to it, so they share one port. Rooms
(which clients are viewing which document) are tracked entirely
in-memory, in a `Map`, not in the database — presence and room
membership disappear and rebuild naturally on every server restart,
which is correct, since they only describe "right now," not
persisted state.

## Where to go deeper

- [`crdt.md`](./crdt.md) — the conflict-resolution algorithm itself
- [`websocket-flow.md`](./websocket-flow.md) — every message type, in detail
- [`database.md`](./database.md) — collections and schemas
- [`decisions.md`](./decisions.md) — why things were built this way, including trade-offs
- [`testing.md`](./testing.md) — what's tested and why
- [`progress.md`](./progress.md) — the full step-by-step build log
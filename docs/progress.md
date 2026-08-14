# Progress

## Step 1: Git & GitHub Setup
Created the project skeleton (backend/, frontend/, docs/), added .gitignore
and README.md, made the first commit, and pushed the repo to GitHub.

## Step 2: Basic Express Server
Set up the backend folder with npm, installed Express and nodemon, and
created a minimal server with one route that confirms the backend is
running at http://localhost:5000.

## Step 3: MongoDB Connection
Created a free MongoDB Atlas cluster, connected it to the backend using
Mongoose, and stored the connection string safely in a .env file. Hit
and fixed a DNS/SRV lookup issue by forcing Node to use Google DNS.

## Step 4: Document Model
Created the Document schema (title, content, timestamps) and confirmed
it works end-to-end by saving a real document to MongoDB with a small
test script. Moved the DNS fix into db.js so every future database
connection (routes, tests) is protected automatically.

## Step 5: Document API Routes
Built full CRUD REST routes (create, list, get one, update, delete) for
documents under /api/documents, and added express.json() middleware so
the server can read JSON request bodies. Confirmed all five routes work
using curl.

## Step 6: Basic WebSocket Server
Added a WebSocket server using the ws library, sharing the same HTTP
server as Express. Confirmed a client can connect, receive a welcome
message, send messages the server logs, and disconnect cleanly.

## Step 7: Document Rooms and Live Broadcasting
Added join/edit message handling to the WebSocket server. Clients now
join a document-specific room, and edits are saved to MongoDB and
broadcast live to every other client in that same room. Confirmed with
two simultaneous Postman WebSocket connections.

## Step 8: Frontend Scaffold (Vite + React + Tailwind)
Set up the frontend project with Vite, React, and Tailwind CSS (using
Tailwind's current Vite-plugin-based install, not the older config-file
method). Confirmed a styled test page renders correctly at
http://localhost:5173.

## Step 9: Live Document Editor UI
Connected the frontend to the backend: loads a document over REST,
joins its room over WebSocket, and syncs edits live between browser
tabs. Added CORS to the backend so the frontend (port 5173) can reach
it (port 5000). Confirmed working with two tabs syncing in real time.

### Step 10: Operation-Based Editing
Replaced whole-document syncing with a diffing algorithm that computes
a single operation (position, deleteCount, insertText) representing
exactly what changed. Both the client-to-server and server-to-client
messages now carry operations instead of full document content.

## Step 11: Custom CRDT (standalone)
Built a hand-written CRDT from scratch: each character has a unique
id, a reference to what it was inserted after, and a tombstone for
deletion. Concurrent inserts at the same spot are ordered by comparing
ids. Proved convergence with a standalone test script simulating two
replicas applying the same conflicting operations in different orders.
Not yet wired into the live editor.

## Step 12: CRDT Wired Into the Live Editor
Replaced position-based operations with the CRDT from Step 11. Documents
now store a "characters" array (id, char, afterId, deleted) in MongoDB
instead of relying on plain-text positions. Each browser tab generates
its own unique ids and sends real insert/delete CRDT operations over
WebSocket. Confirmed working with concurrent typing in two tabs.

## Step 13: Offline Editing and Auto-Reconnect
Edits made while disconnected now queue locally instead of being lost.
The frontend automatically retries the WebSocket connection every 2
seconds on disconnect. On reconnect, it fetches the latest document,
merges any locally-queued offline operations on top of it using the
CRDT, and sends them to the server. Tested with real per-tab network
throttling simulating one user going offline while another kept editing.


## Step 14: Operation Event Log
Added an OperationLog model that permanently records every batch of
CRDT operations applied to a document, in order, separate from the
document's current state. Added GET /api/documents/:id/history to
view the raw log. Nothing restores from it yet — that's next.

## Step 15: Version Preview and Live Restore
Added GET /:id/version/:logId to preview the document as it looked at
any past point (via replaying the operation log), and POST
/:id/restore/:logId to actually restore it — computed as a real diff
(delete/undelete operations) against the current state, logged as a
new event, and broadcast live to every connected tab. Added an
"undelete" operation to the CRDT to support restoring previously
deleted characters.


## Step 16: Presence (Online Users and Typing Indicator)
Added live presence: the server tracks each connection's userId/name
(generated client-side, no auth yet) per room and broadcasts the full
online list on join/disconnect. Added a lightweight "typing" broadcast,
sent immediately on incoming edits (not gated behind the database
save), with the frontend fading each user's typing indicator via a
per-user 2-second timer.

## Step 17: Automated CRDT Tests with Jest
Installed Jest and wrote 7 automated tests covering basic CRDT
operations (insert, delete, undelete) and convergence under concurrent
edits — replacing the manual testCRDT.js script from Step 11 with
real, repeatable assertions. All tests pass via npm test.

## Step 18: Backend Deployed to Render
Deployed the Express + WebSocket backend to Render as a Web Service,
with Root Directory set to "backend" for the monorepo, MONGO_URI set
as an environment variable, and PORT handled automatically by Render.
Confirmed the live REST API and a live wss:// WebSocket connection
both work from outside localhost.

## Step 19: Frontend Deployed to Vercel, CORS Locked Down
Made the frontend's backend URL configurable via Vite environment
variables (VITE_API_URL, VITE_WS_URL) instead of hardcoded localhost.
Deployed to Vercel with Root Directory set to "frontend". Used the
real Vercel URL to restrict backend CORS to an explicit allowlist
(localhost for dev, the real frontend URL via FRONTEND_URL on Render)
instead of allowing all origins. Confirmed live sync works between
two tabs over the real internet, and that CORS now actually rejects
unauthorized origins.

## Step 20: Document List Sidebar (Create and Switch Documents)
Restructured the frontend into App (top-level, tracks selected
document), Sidebar (lists all documents via existing GET /api/documents,
creates new ones), and DocumentEditor (the existing live-sync editor,
now parameterized by a documentId prop instead of always loading "the
first document"). Used React's key prop to fully remount the editor on
document switch, cleanly resetting WebSocket connections and state.
Confirmed multiple documents each get independent CRDT rooms, presence,
and typing indicators.

## Step 21: User Registration and Login (Backend Only)
Added a User model (name, email, bcrypt-hashed password) and
POST /api/auth/register + POST /api/auth/login routes, returning a
signed JWT on success. Not yet wired into any document routes or the
frontend — that's next.

## Step 22: Authentication Wired Into Documents (Backend + Frontend)
All document REST routes now require a valid JWT and are scoped to the
requesting user's own documents (via a shared getOwnedDocument helper,
returning 404 for both "missing" and "not yours" to avoid leaking
info). The WebSocket join handshake now verifies the same JWT and
document ownership before allowing a client into a room. Added a real
Login/Register screen on the frontend, storing the session in
localStorage, replacing the random per-tab names with real account
names. Confirmed two separate accounts cannot see or edit each other's
documents.

## Step 23: Version History Panel (Frontend)
Added a HistoryPanel component listing every logged version of a
document, with a click-to-preview and a "Restore this version" button,
using the existing history/version/restore routes from Step 15 (now
sending the Authorization header required since Step 22). Restoring
closes the panel and relies on the existing WebSocket broadcast to
update the live editor, with no new backend logic needed.

## Step 24: Production Auth Configuration (Render)
Added a separate, production-only JWT_SECRET to Render's environment
variables (distinct from the local .env value), fixing a gap where
auth had been built and wired up after the initial backend deployment
and had never actually worked on the live site. Confirmed register,
login, and full live sync work end-to-end on the real deployed URL.


## Step 25: Rename and Delete in the Sidebar
Added inline rename (click to edit, Enter to save, Escape to cancel)
and delete (with a confirmation prompt) to the document sidebar, using
the existing PUT/DELETE routes from Step 5. Fixed PUT /:id to only
update fields actually present in the request body, instead of always
expecting both title and content — a rename could previously have
silently wiped a document's content.

## Step 26: Automated API Tests with Supertest
Split server.js into app.js (Express app, routes, middleware) and
server.js (connects DB, starts HTTP server, attaches WebSockets) to
make the app testable without a running port. Added 8 Supertest-based
tests against a dedicated MONGO_TEST_URI database, covering document
CRUD, the "no token" rejection, the Step 22 ownership isolation check,
and the Step 25 partial-update fix. All 15 tests (7 CRDT + 8 API) pass
via npm test.

## Step 27: WebSocket Integration Test
Added a real end-to-end test: two live WebSocket clients join the same
document, send genuinely concurrent insert operations, and the test
verifies both the live cross-client broadcast and the final saved
MongoDB content converge to the same deterministic result. Also
consolidated the Step 3 DNS fix (previously duplicated in three
places) into a single shared utils/forceDns.js.

## Step 28: Real CodeMirror Editor (Closing a Stack Gap)
Replaced the plain <textarea> with @uiw/react-codemirror, closing a
gap against the original finalized stack (which specified CodeMirror
from the start). Kept the exact same controlled value/onChange data
flow so no synchronization logic changed. Noted a real, undecided
trade-off: remote updates can visibly move the local cursor, since
content is still fully replaced on each incoming operation rather than
using CodeMirror's lower-level transaction API.

## Step 29: Precise Remote Updates via CodeMirror Transactions
Replaced full-document value replacement for incoming remote
operations with precise CodeMirror transactions (dispatching exact
insert/delete changes at computed positions), fixing the cursor-jump
issue flagged in Step 28. Added visibleIndexOfId to translate CRDT
character ids into editor positions. Added an applyingRemoteRef guard
to stop CodeMirror's onChange from re-sending our own remote-applied
changes back to the server as duplicate operations.

## Step 30: Live Collaborator Cursors
Added colored, named cursor markers showing where other connected
users' cursors currently are, using a CodeMirror StateField/Decoration
extension (cursorExtension.js). Cursor position broadcasts reuse the
existing WebSocket room infrastructure (ephemeral, like typing
indicators — no database write). Colors are deterministically derived
per userId so they stay consistent across reconnects. Cursor markers
are cleaned up automatically when a user disconnects, using the
existing presence broadcast.

## Step 31: Navigation Bar and User Profile Menu
Replaced the plain "Signed in as X / Log out" bar with a real NavBar
component: a small logo mark plus app name on the left, and an
avatar-initials button on the right that opens a dropdown showing
name, email, and log out, using a click-outside-to-close pattern via a
ref and a document-level mousedown listener.

## Step 32: Real Connection and Save Status Indicators
Added a colored-dot connection status indicator (StatusIndicator
component) and a genuine save/sync indicator backed by a new "saved"
WebSocket acknowledgment sent from server to the originating client
only, once its edit is actually persisted — replacing the previous
plain connection-only status text with two distinct, accurate signals.

## Step 33: Responsive Layout (Mobile/Tablet Sidebar Drawer)
Made the sidebar a slide-out drawer with a backdrop on small screens
(toggled via a new hamburger button in NavBar), using a single
responsive element rather than separate mobile/desktop components.
Fixed rename/delete buttons to use opacity instead of hover-only
display, since hover doesn't exist on touch. Adjusted spacing in
DocumentEditor and made HistoryPanel's two-column layout stack
vertically on narrow screens.

## Step 34: Security Hardening (Helmet + Rate Limiting)
Added helmet() for standard HTTP security headers on every response,
and a rate limiter (10 requests per 15 minutes per IP) on the auth
routes specifically, making brute-force login/register attempts
impractical. Added the missing backend/.env.example, matching the
pattern already used in frontend/.env.example.
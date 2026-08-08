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

## Current Milestone
Full end-to-end live collaboration works through the real UI: open two
tabs, type in either, see it sync instantly. Still sends the whole
document on every keystroke — no operations, no CRDT, no conflict
handling for simultaneous edits yet.

## Next Milestone
To be planned in the next step.

## Remaining Work
Operation-based editing, custom CRDT, offline sync, version history,
presence, testing, deployment.
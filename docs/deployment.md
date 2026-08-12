# Deployment

## MongoDB Atlas (set up in Step 3)
Free-tier cluster, connected via Mongoose using a connection string
stored as an environment variable (MONGO_URI), never committed to
git. Network access is set to allow from anywhere (0.0.0.0/0) — fine
for this project's scale, would be tightened in a real production
setup.

## Backend — Render
Deployed as a Web Service, built from the same GitHub repo as
everything else, with Root Directory set to "backend" (since this is
a monorepo). Build command: npm install. Start command: npm start.

Environment variables set in Render's dashboard (not in a committed
file):
- MONGO_URI — same Atlas connection string used locally

PORT is not set manually — Render provides it automatically, and the
app already reads process.env.PORT.

Free tier spins down after inactivity; the first request after idle
time can take 30-60 seconds while it wakes up.

Live backend URL: https://sync-engine-backend-mcwk.onrender.com/
(replace with your actual Render URL)

## Frontend — Vercel
Deployed with Root Directory set to "frontend" (monorepo). Build
command and output directory auto-detected for Vite (npm run build,
dist).

Environment variables set in Vercel's dashboard:
- VITE_API_URL — the deployed Render backend's /api/documents URL
- VITE_WS_URL — the deployed Render backend's URL with wss:// instead
  of https://

Locally, these same variables live in frontend/.env (gitignored),
defaulting to localhost if unset — see frontend/.env.example for the
expected shape.

Live frontend URL: https://sync-engine-git-main-mayank231.vercel.app

## Why Render for the backend instead of a serverless platform
This backend runs a persistent WebSocket server, which needs a
connection that stays open continuously. Most serverless platforms
run code per-request and shut it down right after, which doesn't
support a long-lived WebSocket connection. Render runs the backend as
an always-on process, the same way it behaves locally.

## CORS lockdown
Backend now only allows requests from an explicit list: localhost:5173
for local development, plus the real deployed frontend URL, read from
a FRONTEND_URL environment variable set on Render. Replaces the
wide-open cors() from Step 9.


## JWT_SECRET (Render)
Added as an environment variable on Render, separate from the value in
local .env. Auth (Steps 21-22) was built after the initial backend
deployment (Step 18), so this was a real gap until fixed here — the
live backend had no secret to sign or verify tokens with.
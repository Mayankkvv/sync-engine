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
Not deployed yet — planned for the next step.

## Why Render for the backend instead of a serverless platform
This backend runs a persistent WebSocket server, which needs a
connection that stays open continuously. Most serverless platforms
run code per-request and shut it down right after, which doesn't
support a long-lived WebSocket connection. Render runs the backend as
an always-on process, the same way it behaves locally.
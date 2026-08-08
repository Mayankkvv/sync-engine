# Decisions

## MongoDB Atlas instead of a local MongoDB install
We're deploying to MongoDB Atlas eventually anyway, so connecting to
Atlas from the very first database step means we're always developing
against the real thing — no separate "switch from local to Atlas"
migration step needed later.

## Forcing DNS to Google's resolver (8.8.8.8 / 8.8.4.4)
MongoDB Atlas connection strings use mongodb+srv://, which requires a
special kind of DNS lookup called an SRV lookup. On this network, that
lookup was being refused (error: querySrv ECONNREFUSED), even though
normal DNS worked fine — this happens on some ISPs and wifi networks.
Fixed by telling Node to use Google's public DNS servers instead of the
network's default, at the very top of server.js, before anything else
runs. This is a one-time fix, not a workaround we need to remove later.

## ws instead of Socket.IO
Socket.IO adds its own protocol, automatic reconnection, and "room"
features on top of WebSockets. We chose the plain ws library instead
because the goal of this project is to understand WebSockets and
synchronization directly, not to lean on a library that hides how
messages actually flow between client and server.

## Tailwind's Vite plugin instead of the older config-based install
Newer Tailwind versions install as a dedicated Vite plugin
(@tailwindcss/vite) rather than generating a tailwind.config.js and
running a separate build step. It's simpler and is now the standard,
current approach — used here instead of older tutorials' method.
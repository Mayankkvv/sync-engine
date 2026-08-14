# WebSocket Flow

## Connection process
The backend runs one shared HTTP server for both REST and WebSockets
(see server.js). When a client opens a WebSocket connection to
ws://localhost:5000, the server immediately sends a small "welcome"
JSON message back, confirming the connection is live.

## Current state
Right now the server only logs messages it receives — it doesn't do
anything with document content yet. Message flow, broadcasting to
multiple clients, and reconnection handling will be documented here
as those pieces get built.

## Message protocol
Every WebSocket message is JSON with a "type" field.

- {"type": "join", "documentId": "..."} — client joins a document's room
- {"type": "edit", "documentId": "...", "content": "..."} — client sends
  new content; server saves it to MongoDB and broadcasts it to every
  other client in that room

## Rooms
The server keeps an in-memory Map of documentId -> Set of connected
clients. Joining adds a client to the right set; disconnecting removes
them and deletes the room if it's now empty. Broadcasting loops through
a room's clients and sends the update to everyone except whoever sent
the edit.

## Message protocol (updated)
- {"type": "join", "documentId": "..."} — unchanged
- {"type": "operation", "documentId": "...", "operation": {"position":
  N, "deleteCount": N, "insertText": "..."}} — replaces the old "edit"
  message type. Carries only the changed portion of the document, not
  the full content.

## Message protocol (updated)
- {"type": "crdtOps", "documentId": "...", "operations": [...]} —
  replaces "operation". Each item in "operations" is either
  { kind: "insert", character: {id, char, afterId, deleted} } or
  { kind: "delete", id }. Applied identically on sender, server, and
  every other connected client using the same insertOperation /
  deleteOperation functions.


## Reconnection and offline sync
If the WebSocket closes unexpectedly, the client sets status to
"Disconnected — retrying..." and attempts a new connection every 2
seconds. Any edits made while disconnected are held in a local queue
instead of being sent. When a new connection successfully opens, the
client: 1) rejoins the document's room, 2) fetches the current document
over REST (catching up on anything missed while offline), 3) replays
its queued local operations on top of that fresh state, then 4) sends
those operations to the server. Because CRDT operations reference
stable character ids rather than positions, they merge correctly even
though the document changed while the client was disconnected.

## Presence protocol (new)
- "join" now also includes userId and name (client-generated, random,
  session-only — no auth yet)
- {"type": "presence", "documentId": "...", "users": [{userId, name}]}
  — sent to the whole room whenever someone joins or disconnects;
  always the full current list, not an incremental add/remove
- {"type": "typing", "documentId": "...", "userId": "...", "name":
  "..."} — sent immediately when a user sends edits, before the
  database save completes, since it's a disposable UI signal with no
  need to wait. The client fades each user's typing indicator locally
  after 2 seconds of no further typing messages from them — the server
  never sends an explicit "stopped typing" message.

  ## Authentication on join (updated)
"join" messages now include a token (the JWT from login). The server
verifies it and checks that the requesting user owns the target
document before adding them to the room. On failure, the server sends
{"type": "error", "message": "..."} and does not join the room. The
crdtOps handler also ignores any message from a connection that never
successfully joined (no userId set on it).


## Cursor protocol (new)
{"type": "cursor", "documentId": "...", "position": N} — sent by a
client whenever its local cursor/selection changes (not on every
document edit). The server broadcasts it to the rest of the room as
{"type": "cursor", "documentId", "userId", "name", "position"},
excluding the sender. Purely ephemeral, like typing — no database
write. Clients discard a user's last-known cursor position once that
user's id no longer appears in a presence broadcast.

## Save acknowledgment (new)
{"type": "saved", "documentId": "...", "savedAt": "..."} — sent
directly to the client whose crdtOps batch was just successfully saved
and logged, right after the existing broadcast to the rest of the
room. Unlike presence/typing/crdtOps, this is sent to exactly one
client (the sender), never broadcast, since it only has meaning to
whoever's edit it confirms.

## Authorization on join (updated)
The join handshake now checks owner OR collaborator (previously owner
only), matching the REST routes' access rule exactly — both entry
points into a document's data were updated together, since either one
alone being permissive would defeat the other's restriction.
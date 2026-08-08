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
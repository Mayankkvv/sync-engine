# Testing

## What we're using
Jest, installed as a dev dependency in the backend. Run with npm test.

## Synchronization tests (crdt/crdt.test.js)
These are the most important tests in the project. They prove the CRDT
converges correctly under the exact conflict types the spec called
out:
- Concurrent inserts at the same position, applied in different orders
  on two simulated replicas — checks both end up with identical text.
- A delete racing an insert-after-the-deleted-character, in different
  orders — checks both replicas still agree.
- A general "reverse the whole operation order" check, as a broader
  version of the same property.

## Unit tests (also in crdt/crdt.test.js)
Smaller checks on individual functions: insert produces correct text,
chained inserts order correctly, delete tombstones without removing
from the array, undelete restores visibility.

## Why these tests matter
Naive approaches (like the position-based operations from Step 10)
silently break under exactly these conditions. These tests exist
specifically to catch that class of bug automatically, rather than
relying on manually typing in two browser tabs and eyeballing the
result.

## Not yet tested
API routes (Document CRUD, history, restore) and WebSocket message
handling don't have automated tests yet — planned for a future step.

## API tests (routes/documentRoutes.test.js)
Uses Supertest against the real Express app (via the new app.js) and a
dedicated test-only MongoDB database (MONGO_TEST_URI), dropped clean
after each run. Covers: rejecting unauthenticated requests, full CRUD,
that a different user cannot access another user's document (Step 22),
and that PUT only updates fields actually sent (Step 25).

## Not yet tested
WebSocket message handling (crdtOps, presence, typing) and the
history/version/restore routes don't have automated tests yet.

## WebSocket tests (websocket/socketServer.test.js)
Starts a real server on an ephemeral port and connects two real
WebSocket clients (simulating the same account on two devices, since
only a document's owner can join it). Both send genuinely concurrent
insert operations; the test verifies each client receives the other's
broadcasted operation, and that the final saved document content in
MongoDB matches the CRDT's deterministic convergence result.

## Not yet tested
Offline reconnection/merge behavior and presence/typing timeouts don't
have automated tests yet — currently verified manually.
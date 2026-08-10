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
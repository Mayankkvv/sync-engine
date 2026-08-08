# CRDT (Conflict-Free Replicated Data Type)

## Why we need this
Our earlier approach sent operations like "insert at position 5." That
breaks when two people edit at the same time, because "position 5"
means something different once someone else's edit has also landed —
whoever's operation arrives second can land in the wrong place.

## The idea
Instead of a plain string, the document is a list of characters. Each
character has:
- a permanent unique id (never reused, even after deletion)
- the id of the character it was inserted after
- a "deleted" flag (a tombstone) instead of being truly removed

## Handling concurrent inserts at the same spot
If two people insert right after the same character at the same time,
both operations say "insert after X." We break the tie with one fixed
rule: compare the two new ids, and the larger one always goes first.
Every replica applies this same rule, so no matter which operation
arrives first, everyone ends up with the same order.

## Why deletions are tombstones, not real removals
If a character were actually deleted from the list, any operation that
says "insert after that character" would have nothing to find. Marking
it deleted (but keeping it in the list) means that reference still
works, forever — the character just gets filtered out when we turn the
list back into visible text.

## Step-by-step example
Two replicas both have "Hi". User A inserts "!" after "i". User B,
without knowing about A's edit, inserts "?" after "i" too. Whichever
order these two operations arrive in, on either replica, the tie-break
rule (larger id goes first) puts them in the same final order every
time — proven in backend/testCRDT.js.

## Current status
The CRDT logic exists and is proven correct with a standalone test
script (testCRDT.js). It is not yet connected to the live editor —
Step 10's simpler position-based operations are still what's running
in the app. The next step replaces that with this CRDT.
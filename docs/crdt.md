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
The CRDT is now fully wired into the live editor. Documents store a
"characters" array in MongoDB (id, char, afterId, deleted) instead of
relying on plain-text positions. Each browser tab generates its own
unique ids (siteId + local counter) and sends real insert/delete
operations over WebSocket, applied identically on both the sending
client, the server, and every other connected client.

## Undelete operation (added for version restore)
Restoring to a past version sometimes needs to bring back a character
that's since been deleted. Since tombstoned characters are never
actually removed from the list, "undelete" just flips deleted back to
false — the exact mirror of delete, and just as simple.
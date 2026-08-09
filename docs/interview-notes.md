# Interview Notes

## Custom CRDT for conflict resolution

**What it is:** a way of structuring the document (a list of uniquely-
id'd characters instead of a plain string) so that edits from multiple
users, applied in any order, always converge to the same final result.

**Why we built it:** simple "insert at position 5" operations break
when two people edit at the same moment, because "position 5" means
something different to each of them once one edit has already landed.

**How it works:** every character has a permanent unique id and a
reference to the id of the character it was inserted after — like a
linked list. Deletions are tombstones (marked, not removed), so future
references to that character still resolve. Concurrent inserts at the
same spot are ordered by comparing ids — one fixed rule, applied the
same way everywhere, so order never depends on which operation arrives
first.

**Why companies care:** this is the same category of problem behind
Google Docs, Figma, and Notion's real-time collaboration — and CRDTs
are also used outside of editors, in distributed databases and offline-
first mobile apps, anywhere multiple copies of data can change
independently and need to reconcile without a central authority.

**How to explain it in an interview:** "I built a CRDT from scratch
instead of using a library like Yjs, specifically so I'd understand
exactly how conflict resolution works rather than depending on a black
box. I proved it converges with a test that applies the same
conflicting operations in different orders on two simulated replicas
and checks they produce identical results."


## Offline editing with auto-reconnect

**What it is:** the editor keeps working with no network connection,
queuing edits locally, and automatically catches up and merges once
reconnected.

**Why we built it:** a real collaborative editor has to tolerate flaky
networks — losing edits or freezing the UI on disconnect isn't
acceptable.

**How it works:** on disconnect, new edits go into a local queue instead
of being sent, and the client retries connecting every 2 seconds. On
reconnect, it fetches the authoritative current document, replays its
queued edits on top of it, and sends them to the server — a real merge,
not just a resend, made possible by the CRDT's stable per-character ids.

**How to explain it in an interview:** "I simulated real network drops
using per-tab DevTools throttling, not just closing a tab, to prove
edits made fully offline correctly merge with edits made elsewhere
during the same window — which only works because the CRDT operations
reference stable ids instead of shifting text positions."


## Event-sourcing operation log

**What it is:** a permanent, append-only record of every edit ever
made to a document, stored separately from the document's current
state.

**Why we built it:** version history needs more than "here's an old
copy" — event sourcing means the current state is just one point
derivable from replaying history, which is what makes true restore
possible later, not just viewing snapshots.

**How it works:** every batch of CRDT operations that gets applied to
a document is also saved, unchanged, to a separate OperationLog
collection, in the same order it was applied — guaranteed by the same
per-document queue that already prevents save race conditions.

**How to explain it in an interview:** "History isn't a bolted-on
feature here — because edits are already CRDT operations, logging them
verbatim as they happen gives me a true event-sourced history for
free, instead of needing a separate snapshotting system."

## Version history and restore via event replay

**What it is:** any past state of a document can be viewed or restored
to, purely by replaying its operation log — no separate snapshot
system.

**Why we built it:** this is the actual payoff of event sourcing —
because every edit was already logged in Step 14, "what did this look
like an hour ago" is just a replay, and "go back to that" is just a
diff against the current state.

**How it works:** reconstruct the target state by replaying logged
operations up to a timestamp. Compare it to the live document
character-by-character; anything that should be deleted now but isn't
gets deleted, anything that should be visible now but is tombstoned
gets undeleted. That diff is applied, saved, logged as a new event, and
broadcast live — restoring is just another operation, not a special
case.

**How to explain it in an interview:** "Restore isn't a snapshot
rollback — it's computed as a real diff and logged like any other
edit, so the history stays complete and truthful even after a
restore, and every connected client sees it happen live through the
same WebSocket broadcast path as a normal keystroke."


## Live presence (online users + typing indicator)

**What it is:** every connected client sees who else is currently in
the document, plus a transient indicator when someone's actively
typing.

**Why we built it:** collaborative tools need visible collaboration —
without presence, users have no idea if they're alone or editing
alongside others.

**How it works:** the server already tracks WebSocket connections per
document room (from Step 7); presence just attaches a userId/name to
each connection and broadcasts the full online list whenever someone
joins or disconnects. Typing indicators are even simpler: a disposable
broadcast sent the moment edits arrive, faded out purely by a
client-side timer that resets on each new keystroke — no "stopped
typing" message needed from the server at all.

**How to explain it in an interview:** "Typing indicators don't need
to be reliable or persisted — I deliberately kept that signal outside
the database-backed save queue so it's never delayed by a write, and
let the client expire it locally instead of round-tripping a 'stopped'
event."
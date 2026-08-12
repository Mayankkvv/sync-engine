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



## Deploying a WebSocket backend

**What it is:** the backend now runs continuously on Render, reachable
by a real public URL, instead of only existing on a local machine.

**Why we built it this way:** WebSocket connections need a server
process that stays alive continuously — that ruled out typical
serverless hosting, which runs code per-request and shuts it down
right after.

**How to explain it in an interview:** "I specifically picked a host
that supports long-running processes because of the WebSocket
requirement — it's a good example of infrastructure choice being
driven by the actual architecture of the app, not just convenience or
cost."

## Environment-based configuration and CORS lockdown

**What it is:** the frontend's backend URL and the backend's CORS
allowlist are both driven by environment variables instead of
hardcoded values.

**Why we built it this way:** hardcoded localhost URLs silently break
the moment code runs somewhere other than your own machine — this is
one of the most common "works on my machine" bugs in real deployments.

**How to explain it in an interview:** "CORS was deliberately left
open during development since the frontend URL didn't exist yet — I
tracked that as a known gap in decisions.md, then closed it as soon as
deployment gave me a real URL to restrict it to, rather than shipping
with 'allow everyone' permanently."

## Document switching via React's key prop

**What it is:** clicking a different document in the sidebar fully
tears down and rebuilds the editor component, rather than updating it
in place.

**Why we built it this way:** the editor holds a lot of connected
state — WebSocket connection, CRDT character list, presence, typing
timers — and manually resetting every piece when switching documents
would be error-prone and easy to leave something stale.

**How to explain it in an interview:** "I used React's key prop as a
deliberate reset mechanism — changing the key forces React to unmount
and remount the component instead of patching it, which guarantees
clean teardown of the WebSocket and timers without me having to
manually track and reset every piece of state myself."

## Authentication with bcrypt + JWT

**What it is:** account registration and login, with passwords hashed
(never stored in plain text) and a signed JWT issued on success.

**Why we built it this way:** documents had no ownership at all until
now — anyone with the URL could see and edit everything. This is the
foundation for scoping documents to their actual owners.

**How it works:** bcrypt hashes passwords with a one-way algorithm, so
even a compromised database doesn't expose real passwords. Login
re-hashes the submitted password and compares hashes, never decrypting
anything. A successful login returns a JWT — a signed token containing
the user's id — which future requests will present to prove identity.

**How to explain it in an interview:** "I deliberately returned the
same generic error for a wrong email and a wrong password, instead of
being specific about which one failed — a small detail, but it's the
kind of thing that stops an attacker from using your login endpoint to
enumerate valid accounts."

## End-to-end authentication (REST + WebSocket)

**What it is:** every document route and the WebSocket join handshake
both independently verify identity and document ownership before
allowing access.

**Why we built it this way:** protecting only the REST API while
leaving the WebSocket unchecked would still let anyone bypass "the
front door" entirely and edit any document directly over the socket —
both layers needed the same check.

**How to explain it in an interview:** "I made sure authorization was
enforced at every entry point into the data, not just the obvious one
— it's easy to secure a REST API and forget that a WebSocket
connection is a second, completely separate way into the same data."


## Version History UI built entirely on existing backend work

**What it is:** a panel to browse, preview, and restore past versions
of a document, from the actual UI instead of Postman.

**Why it came together so quickly:** the backend (event log, replay,
restore-as-a-diff, live broadcast) was already fully built and tested
by Step 15 — this step required zero new backend logic, only a
frontend window onto capability that already existed.

**How to explain it in an interview:** "Building the backend
capability first and proving it thoroughly through direct API calls,
before ever writing UI for it, meant the actual frontend feature came
together as pure plumbing — no new business logic, no new edge cases,
just displaying and triggering things I'd already gotten right."


## API integration tests catching real regressions

**What it is:** Supertest-based tests hitting the real Express app and
a dedicated test database, covering full document CRUD plus the two
actual bugs this project hit and fixed before (ownership isolation,
partial-update overwrite).

**How to explain it in an interview:** "These weren't hypothetical
test cases — I wrote tests specifically for the two real bugs I'd
already found and fixed by hand, so a regression in either one would
be caught automatically instead of relying on me remembering to
manually re-check old features every time I touch the code."
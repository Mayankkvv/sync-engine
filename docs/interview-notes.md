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


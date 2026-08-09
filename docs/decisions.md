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

## Hand-written prefix/suffix diffing instead of a diff library
Libraries like diff-match-patch exist for this, but writing the
prefix/suffix comparison by hand keeps the logic fully understood and
produces operations in exactly the {position, deleteCount, insertText}
shape the CRDT step will need — no translation layer required.

## RGA-style CRDT instead of Operational Transformation or a library
We chose a hand-written RGA-style design (unique id + "inserted after"
reference + tombstone) over Operational Transformation because it
doesn't require a central server to transform conflicting operations
against each other — any replica can apply operations in any order and
still converge. We also avoided existing CRDT libraries (Yjs, Automerge)
on purpose, since the goal of this project is to understand exactly how
conflict resolution works, not to depend on one that hides it.

## document.markModified("characters") after mutating it
Mongoose generally detects array changes automatically, but explicitly
marking the field modified before save() is a small safeguard against
a subtle class of bug where in-memory changes look correct but don't
actually persist. Cheap to add, and removes any doubt.

## Separate OperationLog collection instead of embedding history in Document
Keeping the event log in its own collection, rather than nesting it
inside the Document itself, means the document stays small and fast to
load for normal editing, while the (potentially very large) history
only gets queried when someone actually wants to view or restore a
past version.


## Restore as a computed diff, not an overwrite
Restoring could have just replaced the live document's characters with
the old reconstructed array. Instead we compute the minimal set of
delete/undelete operations needed to get there, and log that as a real
event. This keeps every state change — including restores — visible
in the history, consistent with event sourcing, and means the restore
broadcasts as normal small operations instead of a full document
replacement.


## Client-generated random names instead of waiting for auth
Presence needs some identity to display, but real user accounts don't
exist yet (intentionally deferred per the spec). Each browser tab
generates a random adjective+animal name once per session — enough to
tell people apart visually during testing and demos, with the clear
understanding this gets replaced once authentication exists.
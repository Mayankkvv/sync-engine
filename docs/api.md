# API Documentation

## POST /api/documents
Creates a new document.
Request body: { "title": "string", "content": "string" }
Response: the created document, including its _id.

## GET /api/documents
Returns all documents, most recently updated first.
Response: an array of documents.

## GET /api/documents/:id
Returns a single document by id.
Response: the document, or 404 if not found.

## PUT /api/documents/:id
Updates a document's title and/or content.
Request body: { "title": "string", "content": "string" }
Response: the updated document, or 404 if not found.

## DELETE /api/documents/:id
Deletes a document by id.
Response: { "message": "Document deleted" }, or 404 if not found.

## GET /api/documents/:id/history
Returns every logged operation batch for a document, oldest first.
Response: an array of { documentId, operations, createdAt }.

## GET /api/documents/:id/version/:logId
Previews the document as it looked at a given point in history
(replays the log up to that entry's timestamp). Does not change
anything.
Response: { content, createdAt }

## POST /api/documents/:id/restore/:logId
Restores the document to how it looked at a given point in history.
Computed as a real diff against the current state (delete/undelete
operations), saved, logged as a new history entry, and broadcast live
to every connected client viewing the document.
Response: the updated document.

## POST /api/auth/register
Creates a new account.
Request body: { name, email, password }
Response: { token, user: { id, name, email } }

## POST /api/auth/login
Logs in an existing account.
Request body: { email, password }
Response: { token, user: { id, name, email } }

## Authentication (updated)
Every /api/documents route now requires a valid token:
Header: Authorization: Bearer <token>
Requests without a valid token receive 401. Requests for a document
that exists but belongs to a different user receive 404 (not 403),
to avoid revealing that the document exists at all.

## PUT /api/documents/:id (updated)
Now a true partial update — only fields present in the request body
are changed. Sending { title } alone updates only the title and
leaves content untouched.

## Access levels (updated)
Two tiers now exist per document:
- Owner: full access, including delete and managing collaborators
- Collaborator: can view, edit, view history, and restore — cannot
  delete the document or manage who else has access

## POST /api/documents/:id/collaborators (owner only)
Invites an existing user by email.
Request body: { email }
Response: { collaborators: [{ _id, name, email }, ...] }
Errors: 404 if no account exists with that email, 400 if inviting
yourself or someone already added.

## DELETE /api/documents/:id/collaborators/:collaboratorId (owner only)
Removes a collaborator's access.
Response: { message: "Collaborator removed" }

## GET /api/documents/:id (updated)
Now returns owner and collaborators populated with { _id, name,
email } instead of raw ids.

## POST /api/auth/forgot-password
Request body: { email }
Always responds the same way regardless of whether the email has an
account, to prevent discovering which emails are registered.
Response: { message: "If an account with that email exists, a
password reset link has been sent." }

## POST /api/auth/reset-password
Request body: { token, newPassword }
token is the raw value from the emailed reset link (never the stored
hash). Response: { message: "Password has been reset. You can now
log in." }, or 400 { error: "Invalid or expired reset link" } if the
token is wrong, already used, or expired (1 hour).
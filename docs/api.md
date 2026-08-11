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
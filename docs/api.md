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
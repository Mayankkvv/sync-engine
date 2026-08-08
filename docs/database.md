# Database

## What we're using
MongoDB (hosted on MongoDB Atlas, free tier) with Mongoose as the library
that lets our Node code talk to it.

## Why MongoDB instead of something like PostgreSQL
Documents in this project are naturally flexible, nested pieces of data
(text, operations, version history) rather than neat rows and columns.
MongoDB stores data as JSON-like documents, which matches that shape
without forcing us to design a rigid table structure up front.

## Connection setup
The connection string lives in backend/.env as MONGO_URI, loaded with
dotenv and never committed to git. backend/config/db.js contains a
connectDB() function that connects on server startup, forces Google DNS
to avoid an SRV lookup issue seen on some networks, and shuts the server
down if the connection fails, so we never run silently broken.

## Collections

### documents
Created by backend/models/Document.js. Fields:
- title (String, default "Untitled Document")
- content (String, default "")
- createdAt, updatedAt (added automatically by Mongoose timestamps)

No user/owner field yet — that gets added once authentication exists.

### documents (updated)
Added a "characters" field: an array of subdocuments, each shaped
{ id, char, afterId, deleted }, representing the document as a CRDT
character list. "content" is kept as a plain-text mirror, always
regenerated from "characters" — never edited directly anymore.
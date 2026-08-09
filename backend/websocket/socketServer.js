const { WebSocketServer } = require("ws");
const Document = require("../models/Document");
const OperationLog = require("../models/OperationLog");
const { insertOperation, deleteOperation, toText } = require("../crdt/crdt");

const rooms = new Map();
const documentQueues = new Map();

function joinRoom(documentId, ws) {
  if (!rooms.has(documentId)) {
    rooms.set(documentId, new Set());
  }
  rooms.get(documentId).add(ws);
  ws.documentId = documentId;
}

function leaveRoom(ws) {
  const documentId = ws.documentId;
  if (!documentId) return null;

  const room = rooms.get(documentId);
  if (!room) return documentId;

  room.delete(ws);
  if (room.size === 0) {
    rooms.delete(documentId);
  }

  return documentId;
}

function broadcastToRoom(documentId, message, excludeWs) {
  const room = rooms.get(documentId);
  if (!room) return;

  for (const client of room) {
    if (client !== excludeWs && client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}

function getPresenceList(documentId) {
  const room = rooms.get(documentId);
  if (!room) return [];

  return Array.from(room).map((client) => ({
    userId: client.userId,
    name: client.userName,
  }));
}

function broadcastPresence(documentId) {
  broadcastToRoom(documentId, { type: "presence", documentId, users: getPresenceList(documentId) }, null);
}

function queueForDocument(documentId, task) {
  const previous = documentQueues.get(documentId) || Promise.resolve();

  const next = previous
    .catch(() => {})
    .then(task)
    .catch((error) => {
      console.error(`Error processing operation for document ${documentId}:`, error.message);
    });

  documentQueues.set(documentId, next);
  return next;
}

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.send(JSON.stringify({ type: "welcome", message: "Connected to Sync Engine" }));

    ws.on("message", (data) => {
      let parsed;

      try {
        parsed = JSON.parse(data.toString());
      } catch (error) {
        console.log("Received non-JSON message:", data.toString());
        return;
      }

      if (parsed.type === "join") {
        ws.userId = parsed.userId;
        ws.userName = parsed.name || "Anonymous";
        joinRoom(parsed.documentId, ws);
        console.log(`Client joined document ${parsed.documentId}`);
        broadcastPresence(parsed.documentId);
      }

      if (parsed.type === "crdtOps") {
        const { documentId, operations } = parsed;

        broadcastToRoom(documentId, { type: "typing", documentId, userId: ws.userId, name: ws.userName }, ws);

        queueForDocument(documentId, async () => {
          const document = await Document.findById(documentId);
          if (!document) return;

          for (const op of operations) {
            if (op.kind === "insert") {
              insertOperation(document.characters, op.character);
            } else if (op.kind === "delete") {
              deleteOperation(document.characters, op.id);
            }
          }

          document.content = toText(document.characters);
          document.markModified("characters");
          await document.save();

          await OperationLog.create({ documentId, operations });

          broadcastToRoom(documentId, { type: "crdtOps", documentId, operations }, ws);
        });
      }
    });

    ws.on("close", () => {
      const documentId = leaveRoom(ws);
      console.log("Client disconnected");
      if (documentId) {
        broadcastPresence(documentId);
      }
    });
  });

  return wss;
}

module.exports = { setupWebSocket, queueForDocument, broadcastToRoom };
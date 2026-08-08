const { WebSocketServer } = require("ws");
const Document = require("../models/Document");

const rooms = new Map();

function joinRoom(documentId, ws) {
  if (!rooms.has(documentId)) {
    rooms.set(documentId, new Set());
  }
  rooms.get(documentId).add(ws);
  ws.documentId = documentId;
}

function leaveRoom(ws) {
  const documentId = ws.documentId;
  if (!documentId) return;

  const room = rooms.get(documentId);
  if (!room) return;

  room.delete(ws);
  if (room.size === 0) {
    rooms.delete(documentId);
  }
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

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.send(JSON.stringify({ type: "welcome", message: "Connected to Sync Engine" }));

    ws.on("message", async (data) => {
      let parsed;

      try {
        parsed = JSON.parse(data.toString());
      } catch (error) {
        console.log("Received non-JSON message:", data.toString());
        return;
      }

      if (parsed.type === "join") {
        joinRoom(parsed.documentId, ws);
        console.log(`Client joined document ${parsed.documentId}`);
      }

      if (parsed.type === "edit") {
        const { documentId, content } = parsed;

        await Document.findByIdAndUpdate(documentId, { content });

        broadcastToRoom(documentId, { type: "update", documentId, content }, ws);
      }
    });

    ws.on("close", () => {
      leaveRoom(ws);
      console.log("Client disconnected");
    });
  });

  return wss;
}

module.exports = setupWebSocket;
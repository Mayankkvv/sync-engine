const { WebSocketServer } = require("ws");

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.send(JSON.stringify({ type: "welcome", message: "Connected to Sync Engine" }));

    ws.on("message", (data) => {
      console.log("Received:", data.toString());
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  return wss;
}

module.exports = setupWebSocket;
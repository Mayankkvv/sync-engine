require("dotenv").config();
const http = require("http");
const connectDB = require("./config/db");
const app = require("./app");
const { setupWebSocket } = require("./websocket/socketServer");

connectDB();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
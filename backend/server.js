require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDB = require("./config/db");
const documentRoutes = require("./routes/documentRoutes");
const { setupWebSocket } = require("./websocket/socketServer");

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = ["http://localhost:5173"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Sync Engine backend is running" });
});

app.use("/api/documents", documentRoutes);

const server = http.createServer(app);

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
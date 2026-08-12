const express = require("express");
const cors = require("cors");
const documentRoutes = require("./routes/documentRoutes");
const authRoutes = require("./routes/authRoutes");

const allowedOrigins = ["http://localhost:5173"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const app = express();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Sync Engine backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

module.exports = app;
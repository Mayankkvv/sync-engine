require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const documentRoutes = require("./routes/documentRoutes");

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Sync Engine backend is running" });
});

app.use("/api/documents", documentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
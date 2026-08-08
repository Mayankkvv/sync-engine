//http://localhost:${PORT}
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({ message: "Sync Engine backend is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
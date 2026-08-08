const express = require("express");

const app = express();
const PORT = 5000;

app.get("/", (req, res) => {
  res.json({ message: "Sync Engine backend is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
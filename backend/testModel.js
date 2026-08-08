require("dotenv").config();
const connectDB = require("./config/db");
const Document = require("./models/Document");

async function run() {
  await connectDB();

  const doc = await Document.create({
    title: "My First Document",
    content: "Hello world",
  });

  console.log("Created document:", doc);

  process.exit(0);
}

run();
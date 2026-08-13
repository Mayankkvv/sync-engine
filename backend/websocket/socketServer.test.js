require("dotenv").config();
require("../utils/forceDns");

const http = require("http");
const mongoose = require("mongoose");
const request = require("supertest");
const WebSocket = require("ws");
const app = require("../app");
const { setupWebSocket } = require("./socketServer");

let server;
let wsUrl;
let token;
let documentId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);

  server = http.createServer(app);
  setupWebSocket(server);

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });

  const port = server.address().port;
  wsUrl = `ws://localhost:${port}`;

  const uniqueEmail = `ws-test-${Date.now()}@example.com`;
  const registerRes = await request(app).post("/api/auth/register").send({
    name: "WS Test User",
    email: uniqueEmail,
    password: "password123",
  });
  token = registerRes.body.token;

  const docRes = await request(app)
    .post("/api/documents")
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "WS Test Doc", content: "" });
  documentId = docRes.body._id;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));
});

function waitForMessage(socket, predicate, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.removeListener("message", onMessage);
      reject(new Error("Timed out waiting for expected message"));
    }, timeoutMs);

    function onMessage(raw) {
      const data = JSON.parse(raw.toString());
      if (predicate(data)) {
        clearTimeout(timeout);
        socket.removeListener("message", onMessage);
        resolve(data);
      }
    }

    socket.on("message", onMessage);
  });
}

function waitForOpen(socket) {
  return new Promise((resolve) => socket.once("open", resolve));
}

test("two clients editing the same document converge, live and in the database", async () => {
  const clientA = new WebSocket(wsUrl);
  const clientB = new WebSocket(wsUrl);

  await Promise.all([waitForOpen(clientA), waitForOpen(clientB)]);

  clientA.send(JSON.stringify({ type: "join", documentId, token, userId: "device-A", name: "Device A" }));
  clientB.send(JSON.stringify({ type: "join", documentId, token, userId: "device-B", name: "Device B" }));

  await Promise.all([
    waitForMessage(clientA, (d) => d.type === "presence" && d.users.length === 2),
    waitForMessage(clientB, (d) => d.type === "presence" && d.users.length === 2),
  ]);

  const opFromA = { id: "A-1", char: "1", afterId: null, deleted: false };
  const opFromB = { id: "B-1", char: "2", afterId: null, deleted: false };

  const bReceivesA = waitForMessage(clientB, (d) => d.type === "crdtOps" && d.operations[0].character.id === "A-1");
  const aReceivesB = waitForMessage(clientA, (d) => d.type === "crdtOps" && d.operations[0].character.id === "B-1");

  clientA.send(JSON.stringify({ type: "crdtOps", documentId, operations: [{ kind: "insert", character: opFromA }] }));
  clientB.send(JSON.stringify({ type: "crdtOps", documentId, operations: [{ kind: "insert", character: opFromB }] }));

  await Promise.all([bReceivesA, aReceivesB]);

  await new Promise((resolve) => setTimeout(resolve, 300));

  const res = await request(app)
    .get(`/api/documents/${documentId}`)
    .set("Authorization", `Bearer ${token}`);

  expect(res.body.content).toBe("21");

  clientA.close();
  clientB.close();
});
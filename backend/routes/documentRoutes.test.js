//require("dotenv").config();
//const dns = require("dns");

//dns.setServers(["8.8.8.8", "8.8.4.4"]);

//const request = require("supertest");

require("dotenv").config();
require("../utils/forceDns");

const request = require("supertest");                                         
const mongoose = require("mongoose");
const app = require("../app");

let token;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);

  const uniqueEmail = `test-${Date.now()}@example.com`;

  const res = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: uniqueEmail,
    password: "password123",
  });

  token = res.body.token;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe("Document API", () => {
  let documentId;

  test("rejects requests with no token", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
  });

  test("creates a document", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test Doc", content: "hello" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Test Doc");
    documentId = res.body._id;
  });

  test("lists documents for the logged-in user", async () => {
    const res = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.some((doc) => doc._id === documentId)).toBe(true);
  });

  test("gets a single document by id", async () => {
    const res = await request(app)
      .get(`/api/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(documentId);
  });

  test("updates only the fields sent, leaving others untouched", async () => {
    const res = await request(app)
      .put(`/api/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Renamed" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed");
    expect(res.body.content).toBe("hello");
  });

  test("a different user cannot access this document", async () => {
    const otherEmail = `other-${Date.now()}@example.com`;
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Other User",
      email: otherEmail,
      password: "password123",
    });
    const otherToken = registerRes.body.token;

    const res = await request(app)
      .get(`/api/documents/${documentId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });

  test("deletes a document", async () => {
    const res = await request(app)
      .delete(`/api/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  test("a deleted document is no longer accessible", async () => {
    const res = await request(app)
      .get(`/api/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
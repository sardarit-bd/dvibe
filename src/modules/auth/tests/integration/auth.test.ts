import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockDb = {
  user: {
    findUnique: jest.fn<AnyFn>(),
    create: jest.fn<AnyFn>(),
  },
};

jest.unstable_mockModule("../../../../config/database/index.js", () => ({
  db: mockDb,
}));

const { default: app } = await import("../../../../app.js");

const validBody = {
  name: "John Doe",
  email: "john@example.com",
  password: "secret123",
  role: "user",
};

describe("Auth API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("registers a user and sets the token cookie", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: "u1",
        name: "John Doe",
        email: "john@example.com",
        role: "user",
      });

      const res = await request(app).post("/api/auth/register").send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        id: "u1",
        name: "John Doe",
        email: "john@example.com",
        role: "user",
      });
      expect(res.headers["set-cookie"]?.[0]).toContain("token=");
      expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    });

    it("does not store the plain password", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({ id: "u1", role: "user" });

      await request(app).post("/api/auth/register").send(validBody);

      const arg = mockDb.user.create.mock.calls[0]![0] as {
        data: { password: string };
      };
      expect(arg.data.password).not.toBe("secret123");
    });

    it("returns 409 when the email already exists", async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: "u1" });

      const res = await request(app).post("/api/auth/register").send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email already registered");
      expect(mockDb.user.create).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty body", async () => {
      const res = await request(app).post("/api/auth/register").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Name is required");
      expect(res.body.message).toContain("Email is required");
      expect(res.body.message).toContain("Password is required");
      expect(res.body.message).toContain("Role is required");
    });

    it("returns 400 for an invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...validBody, email: "bad" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid email format");
    });

    it("returns 400 for a short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...validBody, password: "123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        "Password must be at least 6 characters",
      );
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with valid credentials", async () => {
      const bcrypt = (await import("bcryptjs")).default;
      const hash = await bcrypt.hash("secret123", 4);
      mockDb.user.findUnique.mockResolvedValue({
        id: "u1",
        name: "John Doe",
        email: "john@example.com",
        role: "user",
        password: hash,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@example.com", password: "secret123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Login successful");
      expect(res.body.data).not.toHaveProperty("password");
      expect(res.headers["set-cookie"]?.[0]).toContain("token=");
    });

    it("returns 401 for an unknown email", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "no@example.com", password: "secret123" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("returns 401 for a wrong password", async () => {
      const bcrypt = (await import("bcryptjs")).default;
      const hash = await bcrypt.hash("other-password", 4);
      mockDb.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "john@example.com",
        role: "user",
        password: hash,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@example.com", password: "secret123" });

      expect(res.status).toBe(401);
    });

    it("returns 400 for an empty body", async () => {
      const res = await request(app).post("/api/auth/login").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Email is required");
      expect(res.body.message).toContain("Password is required");
    });
  });

  describe("authMiddleware token handling", () => {
    it("rejects a token signed with the wrong secret", async () => {
      const bad = jwt.sign({ id: "u1" }, "wrong-secret");

      const res = await request(app)
        .get("/api/partner/restaurant")
        .set("Authorization", `Bearer ${bad}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired token");
    });

    it("returns 404 when the token's user no longer exists", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      const token = jwt.sign({ id: "gone" }, "test-secret");

      const res = await request(app)
        .get("/api/partner/restaurant")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });
  });
});
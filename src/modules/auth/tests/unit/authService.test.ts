import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const repo = {
  findUserByEmail: jest.fn<AnyFn>(),
  findUserWithPassword: jest.fn<AnyFn>(),
  createUser: jest.fn<AnyFn>(),
};

const bcryptMock = {
  hash: jest.fn<AnyFn>(),
  compare: jest.fn<AnyFn>(),
};

jest.unstable_mockModule("../../authRepository.js", () => ({ ...repo }));
jest.unstable_mockModule("bcryptjs", () => ({
  default: bcryptMock,
  ...bcryptMock,
}));

const { registerUser, loginUser } = await import("../../authService.js");
const { default: jwt } = await import("jsonwebtoken");

const SECRET = "test-secret";

describe("authService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = SECRET;
  });

  describe("registerUser", () => {
    const input = {
      name: "John",
      email: "john@example.com",
      password: "secret123",
    };

    it("throws 409 when the email is already registered", async () => {
      repo.findUserByEmail.mockResolvedValue({ id: "u1" });

      await expect(registerUser(input)).rejects.toMatchObject({
        statusCode: 409,
        message: "Email already registered",
      });
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it("hashes the password and creates the user", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      bcryptMock.hash.mockResolvedValue("hashed");
      repo.createUser.mockResolvedValue({
        id: "u1",
        name: "John",
        email: "john@example.com",
        role: "user",
      });

      const result = await registerUser(input);

      expect(bcryptMock.hash).toHaveBeenCalledWith("secret123", 10);
      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ password: "hashed" }),
      );
      expect(result.user.id).toBe("u1");
    });

    it("returns a JWT containing the user id and role", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      bcryptMock.hash.mockResolvedValue("hashed");
      repo.createUser.mockResolvedValue({ id: "u1", role: "user" });

      const { token } = await registerUser(input);
      const decoded = jwt.verify(token, SECRET) as { id: string; role: string };

      expect(decoded.id).toBe("u1");
      expect(decoded.role).toBe("user");
    });

    it("assigns role 'user' by default", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      bcryptMock.hash.mockResolvedValue("hashed");
      repo.createUser.mockResolvedValue({ id: "u1", role: "user" });

      await registerUser(input);

      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: "user" }),
      );
    });

    it("assigns role 'solver' when solver is true", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      bcryptMock.hash.mockResolvedValue("hashed");
      repo.createUser.mockResolvedValue({ id: "u1", role: "solver" });

      await registerUser({ ...input, solver: true });

      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: "solver" }),
      );
    });
  });

  describe("loginUser", () => {
    const input = { email: "john@example.com", password: "secret123" };
    const dbUser = {
      id: "u1",
      name: "John",
      email: "john@example.com",
      role: "user",
      password: "hashed",
    };

    it("throws 401 when the user does not exist", async () => {
      repo.findUserWithPassword.mockResolvedValue(null);

      await expect(loginUser(input)).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid email or password",
      });
    });

    it("throws 401 when the password is wrong", async () => {
      repo.findUserWithPassword.mockResolvedValue(dbUser);
      bcryptMock.compare.mockResolvedValue(false);

      await expect(loginUser(input)).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid email or password",
      });
    });

    it("returns a token and a user without the password", async () => {
      repo.findUserWithPassword.mockResolvedValue(dbUser);
      bcryptMock.compare.mockResolvedValue(true);

      const result = await loginUser(input);

      expect(result.user).toEqual({
        id: "u1",
        name: "John",
        email: "john@example.com",
        role: "user",
      });
      expect(result.user).not.toHaveProperty("password");
      expect(typeof result.token).toBe("string");
    });
  });
});
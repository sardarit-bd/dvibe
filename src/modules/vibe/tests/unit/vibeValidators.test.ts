import { describe, it, expect } from "@jest/globals";
import { parseListVibesQuery } from "../../vibeValidators.js";

describe("parseListVibesQuery", () => {
  it("applies defaults with no category", async () => {
    await expect(parseListVibesQuery({})).resolves.toEqual({
      limit: 20,
      offset: 0,
    });
  });

  it("accepts a valid category", async () => {
    await expect(
      parseListVibesQuery({ category: "LIVE_MUSIC", limit: "5" }),
    ).resolves.toEqual({ category: "LIVE_MUSIC", limit: 5, offset: 0 });
  });

  it("rejects an invalid category", async () => {
    await expect(parseListVibesQuery({ category: "JAZZ" })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("category must be one of"),
    });
  });

  it("rejects limit outside 1-100 and negative offset", async () => {
    await expect(parseListVibesQuery({ limit: "0" })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(parseListVibesQuery({ limit: "101" })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(parseListVibesQuery({ offset: "-1" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
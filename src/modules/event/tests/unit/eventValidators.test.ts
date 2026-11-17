import { describe, it, expect } from "@jest/globals";
import { parseListEventsQuery } from "../../eventValidators.js";

describe("parseListEventsQuery", () => {
  it("applies defaults", async () => {
    await expect(parseListEventsQuery({})).resolves.toEqual({
      upcoming: true,
      limit: 20,
      offset: 0,
    });
  });

  it("coerces query strings", async () => {
    await expect(
      parseListEventsQuery({ upcoming: "false", limit: "5", offset: "10" }),
    ).resolves.toEqual({ upcoming: false, limit: 5, offset: 10 });
  });

  it("rejects an invalid upcoming value", async () => {
    await expect(parseListEventsQuery({ upcoming: "maybe" })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("upcoming must be true or false"),
    });
  });

  it("rejects limit outside 1-100", async () => {
    await expect(parseListEventsQuery({ limit: "0" })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(parseListEventsQuery({ limit: "101" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects a negative offset", async () => {
    await expect(parseListEventsQuery({ offset: "-1" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
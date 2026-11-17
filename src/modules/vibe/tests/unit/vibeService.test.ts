import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>;
const mockFn = () => jest.fn<AnyAsyncFn>();

const repo = {
  findPublishedVibes: mockFn(),
  findPublishedVibeById: mockFn(),
};

jest.unstable_mockModule("../../vibeRepository.js", () => ({ ...repo }));

const service = await import("../../vibeService.js");

describe("vibeService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns vibes for the given query", async () => {
    repo.findPublishedVibes.mockResolvedValue([{ id: "v1" }]);
    const query = { category: "NIGHTLIFE" as const, limit: 20, offset: 0 };

    await expect(service.getVibes(query)).resolves.toEqual([{ id: "v1" }]);
    expect(repo.findPublishedVibes).toHaveBeenCalledWith(query);
  });

  it("returns a vibe", async () => {
    repo.findPublishedVibeById.mockResolvedValue({ id: "v1" });

    await expect(service.getVibe("v1")).resolves.toEqual({ id: "v1" });
  });

  it("throws 404 when the vibe is not found", async () => {
    repo.findPublishedVibeById.mockResolvedValue(null);

    await expect(service.getVibe("nope")).rejects.toMatchObject({
      statusCode: 404,
      message: "Vibe not found",
    });
  });
});
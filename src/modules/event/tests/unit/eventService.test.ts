import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>;
const mockFn = () => jest.fn<AnyAsyncFn>();

const repo = {
  findPublicEvents: mockFn(),
  findPublicEventById: mockFn(),
};

jest.unstable_mockModule("../../eventRepository.js", () => ({ ...repo }));

const service = await import("../../eventService.js");

describe("eventService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("passes today's date when upcoming is true", async () => {
    repo.findPublicEvents.mockResolvedValue([]);

    await service.getEvents({ upcoming: true, limit: 20, offset: 0 });

    const arg = repo.findPublicEvents.mock.calls[0]![0] as {
      from: Date;
      limit: number;
      offset: number;
    };
    expect(arg.from).toBeInstanceOf(Date);
    expect(arg.from.getUTCHours()).toBe(0);
    expect(arg.limit).toBe(20);
    expect(arg.offset).toBe(0);
  });

  it("passes no date filter when upcoming is false", async () => {
    repo.findPublicEvents.mockResolvedValue([]);

    await service.getEvents({ upcoming: false, limit: 5, offset: 10 });

    expect(repo.findPublicEvents).toHaveBeenCalledWith({
      from: undefined,
      limit: 5,
      offset: 10,
    });
  });

  it("returns an event", async () => {
    repo.findPublicEventById.mockResolvedValue({ id: "e1" });

    await expect(service.getEvent("e1")).resolves.toEqual({ id: "e1" });
  });

  it("throws 404 when the event is not found", async () => {
    repo.findPublicEventById.mockResolvedValue(null);

    await expect(service.getEvent("nope")).rejects.toMatchObject({
      statusCode: 404,
      message: "Event not found",
    });
  });
});
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type {
  Driver,
  TaxiRequestWithDriver,
} from "../../taxiTypes.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockRepo = {
  findAvailableDrivers: jest.fn<AnyFn>(),
  findDriverById: jest.fn<AnyFn>(),
  updateDriverAvailability: jest.fn<AnyFn>(),
  createTaxiRequest: jest.fn<AnyFn>(),
  findTaxiRequestById: jest.fn<AnyFn>(),
  findTaxiRequests: jest.fn<AnyFn>(),
};

jest.unstable_mockModule("../../taxiRepository.js", () => mockRepo);

const taxiService = await import("../../taxiService.js");

const makeDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: "d1",
  name: "Rahim",
  phone: "+8801711111111",
  whatsappNumber: "+880 1711-111111",
  serviceArea: "Gazipur",
  vehicleType: "Car",
  vehicleDetails: null,
  profileImage: null,
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeRequest = (
  overrides: Partial<TaxiRequestWithDriver> = {},
): TaxiRequestWithDriver => ({
  id: "t1",
  driverId: "d1",
  customerId: null,
  customerName: "Sam",
  customerPhone: "+8801700000000",
  pickupLocation: "Gazipur Chowrasta",
  destination: "Hazrat Shahjalal Airport",
  notes: null,
  status: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
  driver: makeDriver(),
  ...overrides,
});

const baseInput = {
  driverId: "d1",
  customerName: "Sam",
  customerPhone: "+8801700000000",
  pickupLocation: "Gazipur Chowrasta",
  destination: "Hazrat Shahjalal Airport",
};

describe("taxiService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("listDrivers", () => {
    it("passes the query through and computes pagination", async () => {
      mockRepo.findAvailableDrivers.mockResolvedValue({
        drivers: [makeDriver()],
        total: 45,
      });

      const query = { serviceArea: "Gazipur", page: 2, limit: 20 };
      const result = await taxiService.listDrivers(query);

      expect(mockRepo.findAvailableDrivers).toHaveBeenCalledWith(query);
      expect(result.drivers).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it("returns zero pages when there are no drivers", async () => {
      mockRepo.findAvailableDrivers.mockResolvedValue({
        drivers: [],
        total: 0,
      });

      const result = await taxiService.listDrivers({ page: 1, limit: 20 });

      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe("getDriver", () => {
    it("returns the driver, available or not", async () => {
      mockRepo.findDriverById.mockResolvedValue(
        makeDriver({ isAvailable: false }),
      );

      const driver = await taxiService.getDriver("d1");

      expect(driver.isAvailable).toBe(false);
    });

    it("throws 404 when missing", async () => {
      mockRepo.findDriverById.mockResolvedValue(null);

      await expect(taxiService.getDriver("nope")).rejects.toMatchObject({
        statusCode: 404,
        message: "Driver not found",
      });
    });
  });

  describe("updateDriverAvailability", () => {
    it("updates an existing driver", async () => {
      mockRepo.findDriverById.mockResolvedValue(makeDriver());
      mockRepo.updateDriverAvailability.mockResolvedValue(
        makeDriver({ isAvailable: false }),
      );

      const driver = await taxiService.updateDriverAvailability("d1", {
        isAvailable: false,
      });

      expect(driver.isAvailable).toBe(false);
      expect(mockRepo.updateDriverAvailability).toHaveBeenCalledWith(
        "d1",
        false,
      );
    });

    it("throws 404 and does not update an unknown driver", async () => {
      mockRepo.findDriverById.mockResolvedValue(null);

      await expect(
        taxiService.updateDriverAvailability("nope", { isAvailable: true }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.updateDriverAvailability).not.toHaveBeenCalled();
    });
  });

  describe("createTaxiRequest", () => {
    beforeEach(() => {
      mockRepo.findDriverById.mockResolvedValue(makeDriver());
      mockRepo.createTaxiRequest.mockResolvedValue(makeRequest());
    });

    it("creates the request and defaults notes to null", async () => {
      await taxiService.createTaxiRequest(null, baseInput);

      expect(mockRepo.createTaxiRequest).toHaveBeenCalledWith({
        driverId: "d1",
        customerId: null,
        customerName: "Sam",
        customerPhone: "+8801700000000",
        pickupLocation: "Gazipur Chowrasta",
        destination: "Hazrat Shahjalal Airport",
        notes: null,
      });
    });

    it("passes customerId and notes through", async () => {
      await taxiService.createTaxiRequest("u1", {
        ...baseInput,
        notes: "Two bags",
      });

      expect(mockRepo.createTaxiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: "u1", notes: "Two bags" }),
      );
    });

    it("builds a digits-only whatsapp number and message", async () => {
      mockRepo.createTaxiRequest.mockResolvedValue(
        makeRequest({ notes: "Two bags" }),
      );

      const result = await taxiService.createTaxiRequest(null, baseInput);

      expect(result.whatsapp).not.toBeNull();
      expect(result.whatsapp!.whatsappNumber).toBe("8801711111111");
      expect(result.whatsapp!.message).toBe(
        [
          "Hello Rahim, I need a taxi.",
          "Name: Sam",
          "Phone: +8801700000000",
          "Pickup: Gazipur Chowrasta",
          "Destination: Hazrat Shahjalal Airport",
          "Notes: Two bags",
        ].join("\n"),
      );
      expect(result.whatsapp!.url).toBe(
        `https://wa.me/8801711111111?text=${encodeURIComponent(
          result.whatsapp!.message,
        )}`,
      );
    });

    it("omits the notes line when there are no notes", async () => {
      const result = await taxiService.createTaxiRequest(null, baseInput);

      expect(result.whatsapp!.message).not.toContain("Notes:");
    });

    it.each(["n/a", "", "---"])(
      "returns whatsapp null for the driver number %p",
      async (whatsappNumber) => {
        mockRepo.createTaxiRequest.mockResolvedValue(
          makeRequest({ driver: makeDriver({ whatsappNumber }) }),
        );

        const result = await taxiService.createTaxiRequest(null, baseInput);

        expect(result.whatsapp).toBeNull();
      },
    );

    it("throws 404 for an unknown driver", async () => {
      mockRepo.findDriverById.mockResolvedValue(null);

      await expect(
        taxiService.createTaxiRequest(null, baseInput),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Driver not found",
      });
      expect(mockRepo.createTaxiRequest).not.toHaveBeenCalled();
    });

    it("throws 409 for an unavailable driver", async () => {
      mockRepo.findDriverById.mockResolvedValue(
        makeDriver({ isAvailable: false }),
      );

      await expect(
        taxiService.createTaxiRequest(null, baseInput),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Driver is not available",
      });
      expect(mockRepo.createTaxiRequest).not.toHaveBeenCalled();
    });
  });

  describe("getTaxiRequest", () => {
    it("returns the request with whatsapp details", async () => {
      mockRepo.findTaxiRequestById.mockResolvedValue(makeRequest());

      const result = await taxiService.getTaxiRequest("t1");

      expect(result.id).toBe("t1");
      expect(result.whatsapp!.whatsappNumber).toBe("8801711111111");
    });

    it("throws 404 when missing", async () => {
      mockRepo.findTaxiRequestById.mockResolvedValue(null);

      await expect(taxiService.getTaxiRequest("nope")).rejects.toMatchObject({
        statusCode: 404,
        message: "Taxi request not found",
      });
    });
  });

  describe("listPartnerTaxiRequests", () => {
    it("passes the query through and computes pagination", async () => {
      mockRepo.findTaxiRequests.mockResolvedValue({
        taxiRequests: [makeRequest()],
        total: 21,
      });

      const query = { status: "PENDING" as const, page: 1, limit: 10 };
      const result = await taxiService.listPartnerTaxiRequests(query);

      expect(mockRepo.findTaxiRequests).toHaveBeenCalledWith(query);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 21,
        totalPages: 3,
      });
    });
  });
});
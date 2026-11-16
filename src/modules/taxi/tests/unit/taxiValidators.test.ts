import { describe, it, expect } from "@jest/globals";
import { ValidationError } from "yup";
import type { AnySchema } from "yup";
import {
  createTaxiRequestSchema,
  updateDriverAvailabilitySchema,
  parseListDriversQuery,
  parseListTaxiRequestsQuery,
} from "../../taxiValidators.js";
import { TAXI_REQUEST_STATUSES } from "../../taxiTypes.js";

const errorsOf = async (
  schema: AnySchema,
  value: unknown,
): Promise<string[]> => {
  try {
    await schema.validate(value, { abortEarly: false });
    return [];
  } catch (error) {
    return (error as ValidationError).errors;
  }
};

const validRequest = {
  driverId: "d1",
  customerName: "Sam",
  customerPhone: "+8801700000000",
  pickupLocation: "Gazipur Chowrasta",
  destination: "Hazrat Shahjalal Airport",
  notes: "Two bags",
};

describe("createTaxiRequestSchema", () => {
  it("accepts a valid request", async () => {
    expect(await errorsOf(createTaxiRequestSchema, validRequest)).toEqual([]);
  });

  it("accepts missing or null notes", async () => {
    const withoutNotes: Partial<typeof validRequest> = { ...validRequest };
    delete withoutNotes.notes;

    expect(await errorsOf(createTaxiRequestSchema, withoutNotes)).toEqual([]);
    expect(
      await errorsOf(createTaxiRequestSchema, { ...validRequest, notes: null }),
    ).toEqual([]);
  });

  it("trims string fields", async () => {
    const result = await createTaxiRequestSchema.validate({
      ...validRequest,
      driverId: "  d1  ",
      customerName: "  Sam  ",
      pickupLocation: "  Gazipur Chowrasta  ",
    });

    expect(result.driverId).toBe("d1");
    expect(result.customerName).toBe("Sam");
    expect(result.pickupLocation).toBe("Gazipur Chowrasta");
  });

  it("reports every missing required field", async () => {
    const errors = await errorsOf(createTaxiRequestSchema, {});

    expect(errors).toEqual(
      expect.arrayContaining([
        "Driver is required",
        "Customer name is required",
        "Customer phone is required",
        "Pickup location is required",
        "Destination is required",
      ]),
    );
  });

  it.each(["abc", "123", "++8801700000000"])(
    "rejects the invalid phone %p",
    async (customerPhone) => {
      expect(
        await errorsOf(createTaxiRequestSchema, {
          ...validRequest,
          customerPhone,
        }),
      ).toContain("Customer phone is invalid");
    },
  );

  it.each([
    ["customerName", 101, "Customer name is too long"],
    ["pickupLocation", 256, "Pickup location is too long"],
    ["destination", 256, "Destination is too long"],
    ["notes", 501, "Notes are too long"],
  ])("rejects %s over its limit", async (field, length, message) => {
    expect(
      await errorsOf(createTaxiRequestSchema, {
        ...validRequest,
        [field]: "a".repeat(length),
      }),
    ).toContain(message);
  });

  it("accepts fields exactly at their limits", async () => {
    expect(
      await errorsOf(createTaxiRequestSchema, {
        ...validRequest,
        customerName: "a".repeat(100),
        pickupLocation: "a".repeat(255),
        destination: "a".repeat(255),
        notes: "a".repeat(500),
      }),
    ).toEqual([]);
  });
});

describe("updateDriverAvailabilitySchema", () => {
  it.each([true, false])("accepts isAvailable %p", async (isAvailable) => {
    expect(
      await errorsOf(updateDriverAvailabilitySchema, { isAvailable }),
    ).toEqual([]);
  });

  it("requires isAvailable", async () => {
    expect(await errorsOf(updateDriverAvailabilitySchema, {})).toContain(
      "isAvailable is required",
    );
  });
});

describe("parseListDriversQuery", () => {
  it("applies defaults for an empty query", async () => {
    expect(await parseListDriversQuery({})).toEqual({ page: 1, limit: 20 });
  });

  it("coerces and trims query values", async () => {
    expect(
      await parseListDriversQuery({
        serviceArea: "  Gazipur ",
        vehicleType: "Car",
        page: "2",
        limit: "5",
      }),
    ).toEqual({ serviceArea: "Gazipur", vehicleType: "Car", page: 2, limit: 5 });
  });

  it("strips unknown keys", async () => {
    expect(await parseListDriversQuery({ foo: "bar" })).not.toHaveProperty(
      "foo",
    );
  });

  it.each([
    [{ page: "0" }, "Page must be at least 1"],
    [{ page: "abc" }, "Page must be a number"],
    [{ limit: "0" }, "Limit must be at least 1"],
    [{ limit: "101" }, "Limit cannot exceed 100"],
    [{ serviceArea: "a".repeat(101) }, "Service area is too long"],
    [{ vehicleType: "a".repeat(51) }, "Vehicle type is too long"],
  ])("rejects %j with a 400 AppError", async (query, message) => {
    await expect(parseListDriversQuery(query)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(parseListDriversQuery(query)).rejects.toThrow(message);
  });
});

describe("parseListTaxiRequestsQuery", () => {
  it("applies defaults for an empty query", async () => {
    expect(await parseListTaxiRequestsQuery({})).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it.each([...TAXI_REQUEST_STATUSES])("accepts status %s", async (status) => {
    expect(await parseListTaxiRequestsQuery({ status })).toEqual({
      status,
      page: 1,
      limit: 20,
    });
  });

  it("coerces values and keeps driverId", async () => {
    expect(
      await parseListTaxiRequestsQuery({
        status: "PENDING",
        driverId: "d1",
        page: "3",
        limit: "10",
      }),
    ).toEqual({ status: "PENDING", driverId: "d1", page: 3, limit: 10 });
  });

  it.each([
    [{ status: "NOPE" }, "Invalid status"],
    [{ status: "pending" }, "Invalid status"],
    [{ page: "0" }, "Page must be at least 1"],
    [{ limit: "101" }, "Limit cannot exceed 100"],
  ])("rejects %j with a 400 AppError", async (query, message) => {
    await expect(parseListTaxiRequestsQuery(query)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(parseListTaxiRequestsQuery(query)).rejects.toThrow(message);
  });
});
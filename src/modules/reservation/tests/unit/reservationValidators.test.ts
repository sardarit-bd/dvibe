import { describe, it, expect } from "@jest/globals";
import { ValidationError } from "yup";
import type { AnySchema } from "yup";
import {
  createReservationSchema,
  updateReservationStatusSchema,
  parseListReservationsQuery,
} from "../../reservationValidators.js";
import { RESERVATION_STATUSES } from "../../reservationTypes.js";

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

const validReservation = {
  restaurantId: "r1",
  customerName: "Sam",
  customerPhone: "+8801700000000",
  reservationDate: "2026-12-01",
  reservationTime: "19:30",
  guestCount: 4,
  specialRequest: "Window table",
};

describe("createReservationSchema", () => {
  it("accepts a valid reservation", async () => {
    expect(await errorsOf(createReservationSchema, validReservation)).toEqual(
      [],
    );
  });

  it("accepts a missing or null special request", async () => {
    const { specialRequest: _specialRequest, ...withoutRequest } =
      validReservation;

    expect(await errorsOf(createReservationSchema, withoutRequest)).toEqual([]);
    expect(
      await errorsOf(createReservationSchema, {
        ...validReservation,
        specialRequest: null,
      }),
    ).toEqual([]);
  });

  it("trims string fields", async () => {
    const result = await createReservationSchema.validate({
      ...validReservation,
      restaurantId: "  r1  ",
      customerName: "  Sam  ",
      reservationDate: " 2026-12-01 ",
      reservationTime: " 19:30 ",
    });

    expect(result.restaurantId).toBe("r1");
    expect(result.customerName).toBe("Sam");
    expect(result.reservationDate).toBe("2026-12-01");
    expect(result.reservationTime).toBe("19:30");
  });

  it("reports every missing required field", async () => {
    const errors = await errorsOf(createReservationSchema, {});

    expect(errors).toEqual(
      expect.arrayContaining([
        "Restaurant is required",
        "Customer name is required",
        "Customer phone is required",
        "Reservation date is required",
        "Reservation time is required",
        "Guest count is required",
      ]),
    );
  });

  it.each(["abc", "123", "++8801700000000"])(
    "rejects the invalid phone %p",
    async (customerPhone) => {
      expect(
        await errorsOf(createReservationSchema, {
          ...validReservation,
          customerPhone,
        }),
      ).toContain("Customer phone is invalid");
    },
  );

  it("rejects a customer name over 100 characters", async () => {
    expect(
      await errorsOf(createReservationSchema, {
        ...validReservation,
        customerName: "a".repeat(101),
      }),
    ).toContain("Customer name is too long");
  });

  it("rejects a special request over 500 characters", async () => {
    expect(
      await errorsOf(createReservationSchema, {
        ...validReservation,
        specialRequest: "a".repeat(501),
      }),
    ).toContain("Special request is too long");
  });

  it.each(["2026-12-01", "2026-02-28", "2028-02-29"])(
    "accepts the date %p",
    async (reservationDate) => {
      expect(
        await errorsOf(createReservationSchema, {
          ...validReservation,
          reservationDate,
        }),
      ).toEqual([]);
    },
  );

  it.each(["12/01/2026", "2026-1-5", "20261201", "tomorrow"])(
    "rejects the date format %p",
    async (reservationDate) => {
      expect(
        await errorsOf(createReservationSchema, {
          ...validReservation,
          reservationDate,
        }),
      ).toEqual(["Reservation date must be in YYYY-MM-DD format"]);
    },
  );

  it.each(["2026-02-30", "2026-13-01", "2026-00-10", "2027-02-29"])(
    "rejects the impossible date %p",
    async (reservationDate) => {
      expect(
        await errorsOf(createReservationSchema, {
          ...validReservation,
          reservationDate,
        }),
      ).toEqual(["Reservation date is invalid"]);
    },
  );

  it.each(["00:00", "09:05", "12:00", "23:59"])(
    "accepts the time %p",
    async (reservationTime) => {
      expect(
        await errorsOf(createReservationSchema, {
          ...validReservation,
          reservationTime,
        }),
      ).toEqual([]);
    },
  );

  it.each(["24:00", "9:30", "12:60", "12:5", "7pm", "19:30:00"])(
    "rejects the time %p",
    async (reservationTime) => {
      expect(
        await errorsOf(createReservationSchema, {
          ...validReservation,
          reservationTime,
        }),
      ).toContain("Reservation time must be in HH:mm format (24-hour)");
    },
  );

  it.each([
    [0, "Guest count must be at least 1"],
    [-2, "Guest count must be at least 1"],
    [21, "Guest count cannot exceed 20"],
    [2.5, "Guest count must be an integer"],
    ["abc", "Guest count must be a number"],
  ])("rejects guest count %p", async (guestCount, message) => {
    expect(
      await errorsOf(createReservationSchema, {
        ...validReservation,
        guestCount,
      }),
    ).toContain(message);
  });

  it("accepts guest count boundaries 1 and 20", async () => {
    for (const guestCount of [1, 20]) {
      expect(
        await errorsOf(createReservationSchema, {
          ...validReservation,
          guestCount,
        }),
      ).toEqual([]);
    }
  });
});

describe("updateReservationStatusSchema", () => {
  it.each([...RESERVATION_STATUSES])("accepts %s", async (status) => {
    expect(await errorsOf(updateReservationStatusSchema, { status })).toEqual(
      [],
    );
  });

  it("requires a status", async () => {
    expect(await errorsOf(updateReservationStatusSchema, {})).toContain(
      "Status is required",
    );
  });

  it("rejects an unknown or lowercase status", async () => {
    expect(
      await errorsOf(updateReservationStatusSchema, { status: "SEATED" }),
    ).toContain("Invalid status");
    expect(
      await errorsOf(updateReservationStatusSchema, { status: "pending" }),
    ).toContain("Invalid status");
  });
});

describe("parseListReservationsQuery", () => {
  it("applies defaults for an empty query", async () => {
    expect(await parseListReservationsQuery({})).toEqual({ page: 1, limit: 20 });
  });

  it("coerces string values from the query string", async () => {
    expect(
      await parseListReservationsQuery({
        page: "2",
        limit: "5",
        status: "CONFIRMED",
        date: "2026-12-01",
      }),
    ).toEqual({ page: 2, limit: 5, status: "CONFIRMED", date: "2026-12-01" });
  });

  it("strips unknown keys", async () => {
    const result = await parseListReservationsQuery({ foo: "bar" });

    expect(result).not.toHaveProperty("foo");
  });

  it.each([
    [{ status: "NOPE" }, "Invalid status"],
    [{ date: "12/01/2026" }, "Date must be in YYYY-MM-DD format"],
    [{ date: "2026-02-30" }, "Date is invalid"],
    [{ page: "0" }, "Page must be at least 1"],
    [{ page: "abc" }, "Page must be a number"],
    [{ limit: "0" }, "Limit must be at least 1"],
    [{ limit: "101" }, "Limit cannot exceed 100"],
  ])("rejects %j with a 400 AppError", async (query, message) => {
    await expect(parseListReservationsQuery(query)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(parseListReservationsQuery(query)).rejects.toThrow(message);
  });
});
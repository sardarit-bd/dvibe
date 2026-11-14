import {
  createRestaurantSchema,
  updateRestaurantSchema,
  updateStatusSchema,
} from "../../restaurantValidators.js";
import { describe, it, expect } from "@jest/globals";
const options = { abortEarly: false, stripUnknown: true };

const validCreate = {
  name: "Spice Garden",
  address: "Dhanmondi, Dhaka",
  phone: "+8801712345678",
};

describe("createRestaurantSchema", () => {
  it("accepts the minimum required fields", async () => {
    await expect(
      createRestaurantSchema.validate(validCreate, options),
    ).resolves.toMatchObject(validCreate);
  });

  it("accepts all optional fields", async () => {
    await expect(
      createRestaurantSchema.validate(
        {
          ...validCreate,
          description: "Bengali food",
          latitude: 23.7461,
          longitude: 90.3742,
          whatsappNumber: "+8801712345678",
          email: "info@spice.com",
          openingHours: { mon: "09:00-22:00" },
          coverImage: "https://example.com/cover.jpg",
        },
        options,
      ),
    ).resolves.toBeDefined();
  });

  it("rejects an empty body and reports every required field", async () => {
    await expect(
      createRestaurantSchema.validate({}, options),
    ).rejects.toMatchObject({
      errors: expect.arrayContaining([
        "Name is required",
        "Address is required",
        "Phone is required",
      ]),
    });
  });

  it("rejects an invalid email", async () => {
    await expect(
      createRestaurantSchema.validate(
        { ...validCreate, email: "bad" },
        options,
      ),
    ).rejects.toMatchObject({ errors: ["Invalid email format"] });
  });

  it("rejects an out-of-range latitude", async () => {
    await expect(
      createRestaurantSchema.validate(
        { ...validCreate, latitude: 200 },
        options,
      ),
    ).rejects.toMatchObject({
      errors: ["Latitude must be between -90 and 90"],
    });
  });

  it("rejects an out-of-range longitude", async () => {
    await expect(
      createRestaurantSchema.validate(
        { ...validCreate, longitude: -181 },
        options,
      ),
    ).rejects.toMatchObject({
      errors: ["Longitude must be between -180 and 180"],
    });
  });

  it("rejects openingHours with non-string values", async () => {
    await expect(
      createRestaurantSchema.validate(
        { ...validCreate, openingHours: { mon: 9 } },
        options,
      ),
    ).rejects.toMatchObject({
      errors: ["openingHours must be an object of string values"],
    });
  });

  it("rejects openingHours given as an array", async () => {
    await expect(
      createRestaurantSchema.validate(
        { ...validCreate, openingHours: ["09:00"] },
        options,
      ),
    ).rejects.toBeDefined();
  });

  it("strips fields the client must not set", async () => {
    const result = await createRestaurantSchema.validate(
      { ...validCreate, ownerId: "hacker", slug: "x", status: "OPEN" },
      options,
    );

    expect(result).not.toHaveProperty("ownerId");
    expect(result).not.toHaveProperty("slug");
    expect(result).not.toHaveProperty("status");
  });
});

describe("updateRestaurantSchema", () => {
  it("accepts a single field", async () => {
    await expect(
      updateRestaurantSchema.validate({ phone: "+8801799999999" }, options),
    ).resolves.toMatchObject({ phone: "+8801799999999" });
  });

  it("rejects an empty body", async () => {
    await expect(
      updateRestaurantSchema.validate({}, options),
    ).rejects.toMatchObject({ errors: ["At least one field is required"] });
  });

  it("rejects an empty name", async () => {
    await expect(
      updateRestaurantSchema.validate({ name: "" }, options),
    ).rejects.toMatchObject({ errors: ["Name cannot be empty"] });
  });

  it("strips status and ownerId", async () => {
    const result = await updateRestaurantSchema.validate(
      { phone: "1", status: "OPEN", ownerId: "x" },
      options,
    );

    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("ownerId");
  });
});

describe("updateStatusSchema", () => {
  it.each(["OPEN", "CLOSED"])("accepts %s", async (status) => {
    await expect(
      updateStatusSchema.validate({ status }, options),
    ).resolves.toEqual({ status });
  });

  it("rejects INACTIVE", async () => {
    await expect(
      updateStatusSchema.validate({ status: "INACTIVE" }, options),
    ).rejects.toMatchObject({ errors: ["Status must be OPEN or CLOSED"] });
  });

  it("rejects a missing status", async () => {
    await expect(
      updateStatusSchema.validate({}, options),
    ).rejects.toMatchObject({ errors: ["Status is required"] });
  });
});
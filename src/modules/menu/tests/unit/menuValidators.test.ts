import { describe, it, expect } from "@jest/globals";
import {
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema,
  updateAvailabilitySchema,
} from "../../menuValidators.js";

const options = { abortEarly: false, stripUnknown: true };

describe("createCategorySchema", () => {
  it("accepts a name only", async () => {
    await expect(
      createCategorySchema.validate({ name: "Starters" }, options),
    ).resolves.toMatchObject({ name: "Starters" });
  });

  it("rejects an empty body", async () => {
    await expect(
      createCategorySchema.validate({}, options),
    ).rejects.toMatchObject({ errors: ["Name is required"] });
  });

  it("rejects a negative or fractional sortOrder", async () => {
    await expect(
      createCategorySchema.validate({ name: "A", sortOrder: -1 }, options),
    ).rejects.toMatchObject({ errors: ["Sort order cannot be negative"] });
    await expect(
      createCategorySchema.validate({ name: "A", sortOrder: 1.5 }, options),
    ).rejects.toMatchObject({ errors: ["Sort order must be an integer"] });
  });

  it("strips restaurantId", async () => {
    const result = await createCategorySchema.validate(
      { name: "A", restaurantId: "x" },
      options,
    );
    expect(result).not.toHaveProperty("restaurantId");
  });
});

describe("updateCategorySchema", () => {
  it("accepts a single field", async () => {
    await expect(
      updateCategorySchema.validate({ isActive: false }, options),
    ).resolves.toMatchObject({ isActive: false });
  });

  it("rejects an empty body", async () => {
    await expect(
      updateCategorySchema.validate({}, options),
    ).rejects.toMatchObject({ errors: ["At least one field is required"] });
  });
});

describe("createItemSchema", () => {
  const valid = { categoryId: "c1", name: "Soup", price: 5.5 };

  it("accepts the required fields", async () => {
    await expect(createItemSchema.validate(valid, options)).resolves.toMatchObject(
      valid,
    );
  });

  it("reports every missing required field", async () => {
    await expect(createItemSchema.validate({}, options)).rejects.toMatchObject({
      errors: expect.arrayContaining([
        "Category is required",
        "Name is required",
        "Price is required",
      ]),
    });
  });

  it("rejects zero and negative prices", async () => {
    await expect(
      createItemSchema.validate({ ...valid, price: 0 }, options),
    ).rejects.toMatchObject({ errors: ["Price must be greater than 0"] });
    await expect(
      createItemSchema.validate({ ...valid, price: -3 }, options),
    ).rejects.toMatchObject({ errors: ["Price must be greater than 0"] });
  });

  it("rejects more than 2 decimal places", async () => {
    await expect(
      createItemSchema.validate({ ...valid, price: 5.555 }, options),
    ).rejects.toMatchObject({
      errors: ["Price can have at most 2 decimal places"],
    });
  });

  it("rejects a non-numeric price", async () => {
    await expect(
      createItemSchema.validate({ ...valid, price: "abc" }, options),
    ).rejects.toMatchObject({ errors: ["Price must be a number"] });
  });

  it("rejects a price above the column limit", async () => {
    await expect(
      createItemSchema.validate({ ...valid, price: 100000000 }, options),
    ).rejects.toMatchObject({ errors: ["Price is too large"] });
  });

  it("strips isAvailable and restaurantId", async () => {
    const result = await createItemSchema.validate(
      { ...valid, isAvailable: false, restaurantId: "x" },
      options,
    );
    expect(result).not.toHaveProperty("isAvailable");
    expect(result).not.toHaveProperty("restaurantId");
  });
});

describe("updateItemSchema", () => {
  it("accepts a single field", async () => {
    await expect(
      updateItemSchema.validate({ price: 9.99 }, options),
    ).resolves.toMatchObject({ price: 9.99 });
  });

  it("rejects an empty body", async () => {
    await expect(updateItemSchema.validate({}, options)).rejects.toMatchObject({
      errors: ["At least one field is required"],
    });
  });

  it("strips isAvailable", async () => {
    const result = await updateItemSchema.validate(
      { name: "X", isAvailable: false },
      options,
    );
    expect(result).not.toHaveProperty("isAvailable");
  });
});

describe("updateAvailabilitySchema", () => {
  it.each([true, false])("accepts %s", async (isAvailable) => {
    await expect(
      updateAvailabilitySchema.validate({ isAvailable }, options),
    ).resolves.toEqual({ isAvailable });
  });

  it("rejects a missing value", async () => {
    await expect(
      updateAvailabilitySchema.validate({}, options),
    ).rejects.toMatchObject({ errors: ["isAvailable is required"] });
  });
});
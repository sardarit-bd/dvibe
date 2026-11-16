import { describe, it, expect } from "@jest/globals";
import { uploadMediaSchema, addPhotoSchema } from "../../mediaValidators.js";

describe("mediaValidators", () => {
  describe("uploadMediaSchema", () => {
    it("validates successfully with optional menuItemId", async () => {
      const result = await uploadMediaSchema.validate({ menuItemId: "m1" });
      expect(result.menuItemId).toBe("m1");
    });

    it("validates successfully without menuItemId", async () => {
      const result = await uploadMediaSchema.validate({});
      expect(result.menuItemId).toBeUndefined();
    });

    it("trims menuItemId", async () => {
      const result = await uploadMediaSchema.validate({ menuItemId: "  m1  " });
      expect(result.menuItemId).toBe("m1");
    });
  });

  describe("addPhotoSchema", () => {
    it("validates successfully with required mediaId", async () => {
      const result = await addPhotoSchema.validate({ mediaId: "m1" });
      expect(result.mediaId).toBe("m1");
    });

    it("throws error when mediaId is missing", async () => {
      await expect(addPhotoSchema.validate({})).rejects.toThrow("Media is required");
    });

    it("validates successfully with valid sortOrder", async () => {
      const result = await addPhotoSchema.validate({ mediaId: "m1", sortOrder: 0 });
      expect(result.sortOrder).toBe(0);
    });

    it("throws error when sortOrder is negative", async () => {
      await expect(addPhotoSchema.validate({ mediaId: "m1", sortOrder: -1 })).rejects.toThrow(
        "Sort order cannot be negative"
      );
    });

    it("throws error when sortOrder is not an integer", async () => {
      await expect(addPhotoSchema.validate({ mediaId: "m1", sortOrder: 1.5 })).rejects.toThrow(
        "Sort order must be an integer"
      );
    });
  });
});
import { jest } from "@jest/globals";
import * as restaurantRepository from "../../restaurantRepository.js";
import {
  createPartnerRestaurant,
  getPartnerRestaurant,
  getPublicRestaurantById,
  getPublicRestaurants,
  updatePartnerRestaurant,
  updatePartnerRestaurantStatus,
} from "../../restaurantService.js";

jest.mock("../../restaurantRepository.js");

const repo = restaurantRepository as jest.Mocked<typeof restaurantRepository>;

const input = {
  name: "Spice Garden",
  address: "Dhanmondi, Dhaka",
  phone: "+8801712345678",
};

describe("restaurantService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("getPublicRestaurants", () => {
    it("returns the list from the repository", async () => {
      repo.findAllPublic.mockResolvedValue([{ id: "r1" }] as never);

      const result = await getPublicRestaurants();

      expect(result).toEqual([{ id: "r1" }]);
    });
  });

  describe("getPublicRestaurantById", () => {
    it("returns the restaurant when found", async () => {
      repo.findPublicById.mockResolvedValue({ id: "r1" } as never);

      await expect(getPublicRestaurantById("r1")).resolves.toEqual({
        id: "r1",
      });
    });

    it("throws 404 when not found or not public", async () => {
      repo.findPublicById.mockResolvedValue(null);

      await expect(getPublicRestaurantById("x")).rejects.toMatchObject({
        statusCode: 404,
        message: "Restaurant not found",
      });
    });
  });

  describe("getPartnerRestaurant", () => {
    it("returns the owner's restaurant", async () => {
      repo.findByOwnerId.mockResolvedValue({ id: "r1" } as never);

      await expect(getPartnerRestaurant("u1")).resolves.toEqual({ id: "r1" });
    });

    it("throws 404 when the owner has no restaurant", async () => {
      repo.findByOwnerId.mockResolvedValue(null);

      await expect(getPartnerRestaurant("u1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("createPartnerRestaurant", () => {
    it("throws 409 when the owner already has a restaurant", async () => {
      repo.findByOwnerId.mockResolvedValue({ id: "r1" } as never);

      await expect(createPartnerRestaurant("u1", input)).rejects.toMatchObject(
        { statusCode: 409 },
      );
      expect(repo.createRestaurant).not.toHaveBeenCalled();
    });

    it("creates a restaurant with a generated slug", async () => {
      repo.findByOwnerId.mockResolvedValue(null);
      repo.findBySlug.mockResolvedValue(null);
      repo.createRestaurant.mockResolvedValue({ id: "r1" } as never);

      await createPartnerRestaurant("u1", input);

      expect(repo.createRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({
          ...input,
          ownerId: "u1",
          slug: "spice-garden",
        }),
      );
    });

    it("appends a suffix when the slug is already taken", async () => {
      repo.findByOwnerId.mockResolvedValue(null);
      repo.findBySlug
        .mockResolvedValueOnce({ id: "other" })
        .mockResolvedValueOnce(null);
      repo.createRestaurant.mockResolvedValue({ id: "r1" } as never);

      await createPartnerRestaurant("u1", input);

      const arg = repo.createRestaurant.mock.calls[0]![0];
      expect(arg.slug).toMatch(/^spice-garden-[0-9a-f]{4}$/);
    });

    it("falls back to 'restaurant' when the name has no usable characters", async () => {
      repo.findByOwnerId.mockResolvedValue(null);
      repo.findBySlug.mockResolvedValue(null);
      repo.createRestaurant.mockResolvedValue({ id: "r1" } as never);

      await createPartnerRestaurant("u1", { ...input, name: "!!!" });

      expect(repo.createRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "restaurant" }),
      );
    });
  });

  describe("updatePartnerRestaurant", () => {
    it("throws 404 when the owner has no restaurant", async () => {
      repo.findByOwnerId.mockResolvedValue(null);

      await expect(
        updatePartnerRestaurant("u1", { phone: "1" }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(repo.updateByOwnerId).not.toHaveBeenCalled();
    });

    it("updates and returns the restaurant", async () => {
      repo.findByOwnerId.mockResolvedValue({ id: "r1" } as never);
      repo.updateByOwnerId.mockResolvedValue({ id: "r1", phone: "1" } as never);

      const result = await updatePartnerRestaurant("u1", { phone: "1" });

      expect(repo.updateByOwnerId).toHaveBeenCalledWith("u1", { phone: "1" });
      expect(result).toEqual({ id: "r1", phone: "1" });
    });
  });

  describe("updatePartnerRestaurantStatus", () => {
    it("throws 404 when the owner has no restaurant", async () => {
      repo.findByOwnerId.mockResolvedValue(null);

      await expect(
        updatePartnerRestaurantStatus("u1", { status: "OPEN" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("updates the status", async () => {
      repo.findByOwnerId.mockResolvedValue({ id: "r1" } as never);
      repo.updateStatusByOwnerId.mockResolvedValue({
        id: "r1",
        status: "OPEN",
      } as never);

      await updatePartnerRestaurantStatus("u1", { status: "OPEN" });

      expect(repo.updateStatusByOwnerId).toHaveBeenCalledWith("u1", "OPEN");
    });
  });
});
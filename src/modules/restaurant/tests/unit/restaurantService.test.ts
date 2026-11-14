import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from "@jest/globals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>;
const mockFn = () => jest.fn<AnyAsyncFn>();

const repo = {
  findAllPublic: mockFn(),
  findPublicById: mockFn(),
  findByOwnerId: mockFn(),
  findBySlug: mockFn(),
  createRestaurant: mockFn(),
  updateByOwnerId: mockFn(),
  updateStatusByOwnerId: mockFn(),
};

jest.unstable_mockModule("../../restaurantRepository.js", () => ({
  ...repo,
}));

const {
  createPartnerRestaurant,
  getPartnerRestaurant,
  getPublicRestaurantById,
  getPublicRestaurants,
  updatePartnerRestaurant,
  updatePartnerRestaurantStatus,
} = await import("../../restaurantService.js");

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
      repo.findAllPublic.mockResolvedValue([{ id: "r1" }]);

      await expect(getPublicRestaurants()).resolves.toEqual([{ id: "r1" }]);
    });
  });

  describe("getPublicRestaurantById", () => {
    it("returns the restaurant when found", async () => {
      repo.findPublicById.mockResolvedValue({ id: "r1" });

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
      repo.findByOwnerId.mockResolvedValue({ id: "r1" });

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
      repo.findByOwnerId.mockResolvedValue({ id: "r1" });

      await expect(createPartnerRestaurant("u1", input)).rejects.toMatchObject(
        { statusCode: 409 },
      );
      expect(repo.createRestaurant).not.toHaveBeenCalled();
    });

    it("creates a restaurant with a generated slug", async () => {
      repo.findByOwnerId.mockResolvedValue(null);
      repo.findBySlug.mockResolvedValue(null);
      repo.createRestaurant.mockResolvedValue({ id: "r1" });

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
      repo.createRestaurant.mockResolvedValue({ id: "r1" });

      await createPartnerRestaurant("u1", input);

      const arg = repo.createRestaurant.mock.calls[0]![0];
      expect(arg.slug).toMatch(/^spice-garden-[0-9a-f]{4}$/);
    });

    it("falls back to 'restaurant' when the name has no usable characters", async () => {
      repo.findByOwnerId.mockResolvedValue(null);
      repo.findBySlug.mockResolvedValue(null);
      repo.createRestaurant.mockResolvedValue({ id: "r1" });

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
      repo.findByOwnerId.mockResolvedValue({ id: "r1" });
      repo.updateByOwnerId.mockResolvedValue({ id: "r1", phone: "1" });

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
      repo.findByOwnerId.mockResolvedValue({ id: "r1" });
      repo.updateStatusByOwnerId.mockResolvedValue({
        id: "r1",
        status: "OPEN",
      });

      await updatePartnerRestaurantStatus("u1", { status: "OPEN" });

      expect(repo.updateStatusByOwnerId).toHaveBeenCalledWith("u1", "OPEN");
    });
  });
});
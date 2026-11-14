import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>;
const mockFn = () => jest.fn<AnyAsyncFn>();

const repo = {
  findPublicRestaurantId: mockFn(),
  findOwnerRestaurantId: mockFn(),
  findVisibleCategories: mockFn(),
  findVisibleMenu: mockFn(),
  findCategoryById: mockFn(),
  findCategoryByName: mockFn(),
  createCategory: mockFn(),
  updateCategory: mockFn(),
  countItemsInCategory: mockFn(),
  deleteCategory: mockFn(),
  findItemById: mockFn(),
  createItem: mockFn(),
  updateItem: mockFn(),
  updateItemAvailability: mockFn(),
  deleteItem: mockFn(),
};

jest.unstable_mockModule("../../menuRepository.js", () => ({ ...repo }));

const service = await import("../../menuService.js");

const withRestaurant = (): void => {
  repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
};

describe("menuService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("public menu", () => {
    it("throws 404 when the restaurant is not public", async () => {
      repo.findPublicRestaurantId.mockResolvedValue(null);

      await expect(service.getPublicMenu("x")).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(service.getPublicCategories("x")).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(repo.findVisibleMenu).not.toHaveBeenCalled();
    });

    it("returns the visible menu", async () => {
      repo.findPublicRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findVisibleMenu.mockResolvedValue([{ id: "c1", items: [] }]);

      await expect(service.getPublicMenu("r1")).resolves.toEqual([
        { id: "c1", items: [] },
      ]);
    });

    it("returns the visible categories", async () => {
      repo.findPublicRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findVisibleCategories.mockResolvedValue([{ id: "c1" }]);

      await expect(service.getPublicCategories("r1")).resolves.toEqual([
        { id: "c1" },
      ]);
    });
  });

  describe("owner without a restaurant", () => {
    it("gets 404 on every partner operation", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue(null);

      const calls = [
        service.createCategory("u1", { name: "A" }),
        service.updateCategory("u1", "c1", { name: "A" }),
        service.deleteCategory("u1", "c1"),
        service.createItem("u1", { categoryId: "c1", name: "A", price: 1 }),
        service.updateItem("u1", "i1", { name: "A" }),
        service.deleteItem("u1", "i1"),
        service.updateItemAvailability("u1", "i1", { isAvailable: true }),
      ];

      for (const call of calls) {
        await expect(call).rejects.toMatchObject({
          statusCode: 404,
          message: "Restaurant not found",
        });
      }
    });
  });

  describe("createCategory", () => {
    it("throws 409 on a duplicate name", async () => {
      withRestaurant();
      repo.findCategoryByName.mockResolvedValue({ id: "c9" });

      await expect(
        service.createCategory("u1", { name: "Starters" }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(repo.createCategory).not.toHaveBeenCalled();
    });

    it("creates the category for the owner's restaurant", async () => {
      withRestaurant();
      repo.findCategoryByName.mockResolvedValue(null);
      repo.createCategory.mockResolvedValue({ id: "c1" });

      await service.createCategory("u1", { name: "Starters" });

      expect(repo.createCategory).toHaveBeenCalledWith({
        name: "Starters",
        restaurantId: "r1",
      });
    });
  });

  describe("updateCategory", () => {
    it("throws 404 for a category of another restaurant", async () => {
      withRestaurant();
      repo.findCategoryById.mockResolvedValue(null);

      await expect(
        service.updateCategory("u1", "c1", { isActive: false }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Category not found" });
      expect(repo.findCategoryById).toHaveBeenCalledWith("c1", "r1");
    });

    it("throws 409 when renaming to an existing name", async () => {
      withRestaurant();
      repo.findCategoryById.mockResolvedValue({ id: "c1", name: "Old" });
      repo.findCategoryByName.mockResolvedValue({ id: "c2" });

      await expect(
        service.updateCategory("u1", "c1", { name: "Taken" }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("skips the duplicate check when the name is unchanged", async () => {
      withRestaurant();
      repo.findCategoryById.mockResolvedValue({ id: "c1", name: "Same" });
      repo.updateCategory.mockResolvedValue({ id: "c1" });

      await service.updateCategory("u1", "c1", { name: "Same" });

      expect(repo.findCategoryByName).not.toHaveBeenCalled();
      expect(repo.updateCategory).toHaveBeenCalledWith("c1", { name: "Same" });
    });
  });

  describe("deleteCategory", () => {
    it("throws 404 when the category is not owned", async () => {
      withRestaurant();
      repo.findCategoryById.mockResolvedValue(null);

      await expect(service.deleteCategory("u1", "c1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 409 when the category still has items", async () => {
      withRestaurant();
      repo.findCategoryById.mockResolvedValue({ id: "c1" });
      repo.countItemsInCategory.mockResolvedValue(2);

      await expect(service.deleteCategory("u1", "c1")).rejects.toMatchObject({
        statusCode: 409,
        message: "Category has menu items",
      });
      expect(repo.deleteCategory).not.toHaveBeenCalled();
    });

    it("deletes an empty category", async () => {
      withRestaurant();
      repo.findCategoryById.mockResolvedValue({ id: "c1" });
      repo.countItemsInCategory.mockResolvedValue(0);
      repo.deleteCategory.mockResolvedValue(undefined);

      await service.deleteCategory("u1", "c1");

      expect(repo.deleteCategory).toHaveBeenCalledWith("c1");
    });
  });

  describe("createItem", () => {
    const input = { categoryId: "c1", name: "Soup", price: 5.5 };

    it("throws 404 when the category is not owned", async () => {
      withRestaurant();
      repo.findCategoryById.mockResolvedValue(null);

      await expect(service.createItem("u1", input)).rejects.toMatchObject({
        statusCode: 404,
        message: "Category not found",
      });
      expect(repo.createItem).not.toHaveBeenCalled();
    });

    it("creates the item for the owner's restaurant", async () => {
      withRestaurant();
      repo.findCategoryById.mockResolvedValue({ id: "c1" });
      repo.createItem.mockResolvedValue({ id: "i1" });

      await service.createItem("u1", input);

      expect(repo.createItem).toHaveBeenCalledWith({
        ...input,
        restaurantId: "r1",
      });
    });
  });

  describe("updateItem", () => {
    it("throws 404 for an item of another restaurant", async () => {
      withRestaurant();
      repo.findItemById.mockResolvedValue(null);

      await expect(
        service.updateItem("u1", "i1", { name: "X" }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Menu item not found" });
      expect(repo.findItemById).toHaveBeenCalledWith("i1", "r1");
    });

    it("throws 404 when moving to a category that is not owned", async () => {
      withRestaurant();
      repo.findItemById.mockResolvedValue({ id: "i1" });
      repo.findCategoryById.mockResolvedValue(null);

      await expect(
        service.updateItem("u1", "i1", { categoryId: "other" }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Category not found" });
      expect(repo.updateItem).not.toHaveBeenCalled();
    });

    it("updates the item", async () => {
      withRestaurant();
      repo.findItemById.mockResolvedValue({ id: "i1" });
      repo.updateItem.mockResolvedValue({ id: "i1", price: "9.00" });

      await service.updateItem("u1", "i1", { price: 9 });

      expect(repo.findCategoryById).not.toHaveBeenCalled();
      expect(repo.updateItem).toHaveBeenCalledWith("i1", { price: 9 });
    });
  });

  describe("deleteItem and availability", () => {
    it("deletes an owned item", async () => {
      withRestaurant();
      repo.findItemById.mockResolvedValue({ id: "i1" });
      repo.deleteItem.mockResolvedValue(undefined);

      await service.deleteItem("u1", "i1");

      expect(repo.deleteItem).toHaveBeenCalledWith("i1");
    });

    it("throws 404 deleting an item that is not owned", async () => {
      withRestaurant();
      repo.findItemById.mockResolvedValue(null);

      await expect(service.deleteItem("u1", "i1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("updates availability", async () => {
      withRestaurant();
      repo.findItemById.mockResolvedValue({ id: "i1" });
      repo.updateItemAvailability.mockResolvedValue({
        id: "i1",
        isAvailable: false,
      });

      await service.updateItemAvailability("u1", "i1", { isAvailable: false });

      expect(repo.updateItemAvailability).toHaveBeenCalledWith("i1", false);
    });
  });
});
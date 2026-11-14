import AppError from "../../shared/utils/AppError.js";
import * as menuRepository from "./menuRepository.js";
import type {
  CreateCategoryInput,
  CreateItemInput,
  MenuCategory,
  MenuItem,
  PublicCategory,
  PublicMenuCategory,
  UpdateAvailabilityInput,
  UpdateCategoryInput,
  UpdateItemInput,
} from "./menuTypes.js";

const assertPublicRestaurant = async (restaurantId: string): Promise<void> => {
  const restaurant = await menuRepository.findPublicRestaurantId(restaurantId);

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }
};

const getOwnerRestaurantId = async (ownerId: string): Promise<string> => {
  const restaurant = await menuRepository.findOwnerRestaurantId(ownerId);

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return restaurant.id;
};

const getOwnedCategory = async (
  restaurantId: string,
  id: string,
): Promise<MenuCategory> => {
  const category = await menuRepository.findCategoryById(id, restaurantId);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return category;
};

const getOwnedItem = async (
  restaurantId: string,
  id: string,
): Promise<MenuItem> => {
  const item = await menuRepository.findItemById(id, restaurantId);

  if (!item) {
    throw new AppError("Menu item not found", 404);
  }

  return item;
};

/* ---------- public ---------- */

export const getPublicMenu = async (
  restaurantId: string,
): Promise<PublicMenuCategory[]> => {
  await assertPublicRestaurant(restaurantId);

  return menuRepository.findVisibleMenu(restaurantId);
};

export const getPublicCategories = async (
  restaurantId: string,
): Promise<PublicCategory[]> => {
  await assertPublicRestaurant(restaurantId);

  return menuRepository.findVisibleCategories(restaurantId);
};

/* ---------- partner: categories ---------- */

export const createCategory = async (
  ownerId: string,
  data: CreateCategoryInput,
): Promise<MenuCategory> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);

  const duplicate = await menuRepository.findCategoryByName(
    restaurantId,
    data.name,
  );

  if (duplicate) {
    throw new AppError("Category name already exists", 409);
  }

  return menuRepository.createCategory({ ...data, restaurantId });
};

export const updateCategory = async (
  ownerId: string,
  id: string,
  data: UpdateCategoryInput,
): Promise<MenuCategory> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  const category = await getOwnedCategory(restaurantId, id);

  if (data.name && data.name !== category.name) {
    const duplicate = await menuRepository.findCategoryByName(
      restaurantId,
      data.name,
    );

    if (duplicate) {
      throw new AppError("Category name already exists", 409);
    }
  }

  return menuRepository.updateCategory(id, data);
};

export const deleteCategory = async (
  ownerId: string,
  id: string,
): Promise<void> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  await getOwnedCategory(restaurantId, id);

  const itemCount = await menuRepository.countItemsInCategory(id);

  if (itemCount > 0) {
    throw new AppError("Category has menu items", 409);
  }

  await menuRepository.deleteCategory(id);
};

/* ---------- partner: items ---------- */

export const createItem = async (
  ownerId: string,
  data: CreateItemInput,
): Promise<MenuItem> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  await getOwnedCategory(restaurantId, data.categoryId);

  return menuRepository.createItem({ ...data, restaurantId });
};

export const updateItem = async (
  ownerId: string,
  id: string,
  data: UpdateItemInput,
): Promise<MenuItem> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  await getOwnedItem(restaurantId, id);

  if (data.categoryId) {
    await getOwnedCategory(restaurantId, data.categoryId);
  }

  return menuRepository.updateItem(id, data);
};

export const deleteItem = async (
  ownerId: string,
  id: string,
): Promise<void> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  await getOwnedItem(restaurantId, id);

  await menuRepository.deleteItem(id);
};

export const updateItemAvailability = async (
  ownerId: string,
  id: string,
  data: UpdateAvailabilityInput,
): Promise<MenuItem> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  await getOwnedItem(restaurantId, id);

  return menuRepository.updateItemAvailability(id, data.isAvailable);
};
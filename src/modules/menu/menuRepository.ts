import { db } from "../../config/database/index.js";
import type {
  CreateCategoryData,
  CreateItemData,
  MenuCategory,
  MenuItem,
  PublicMenuCategory,
  PublicCategory,
  UpdateCategoryInput,
  UpdateItemInput,
} from "./menuTypes.js";

type WithDecimalPrice<T> = Omit<T, "price"> & {
  price: { toString(): string };
};

const withPrice = <T extends { price: { toString(): string } }>(
  item: T,
): Omit<T, "price"> & { price: string } => ({
  ...item,
  price: item.price.toString(),
});

const toItem = (item: WithDecimalPrice<MenuItem>): MenuItem => withPrice(item);

const publicItemSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  image: true,
} as const;

const visibleCategoryWhere = (restaurantId: string) => ({
  restaurantId,
  isActive: true,
  items: { some: { isAvailable: true } },
});

const categoryOrder = [
  { sortOrder: "asc" as const },
  { createdAt: "asc" as const },
];

/* ---------- restaurant lookups ---------- */

export const findPublicRestaurantId = async (
  id: string,
): Promise<{ id: string } | null> => {
  return db.restaurant.findFirst({
    where: { id, status: { in: ["OPEN", "CLOSED"] } },
    select: { id: true },
  });
};

export const findOwnerRestaurantId = async (
  ownerId: string,
): Promise<{ id: string } | null> => {
  return db.restaurant.findUnique({
    where: { ownerId },
    select: { id: true },
  });
};

/* ---------- public menu ---------- */

export const findVisibleCategories = async (
  restaurantId: string,
): Promise<PublicCategory[]> => {
  return db.menuCategory.findMany({
    where: visibleCategoryWhere(restaurantId),
    select: { id: true, name: true, description: true, sortOrder: true },
    orderBy: categoryOrder,
  });
};

export const findVisibleMenu = async (
  restaurantId: string,
): Promise<PublicMenuCategory[]> => {
  const categories = await db.menuCategory.findMany({
    where: visibleCategoryWhere(restaurantId),
    select: {
      id: true,
      name: true,
      description: true,
      sortOrder: true,
      items: {
        where: { isAvailable: true },
        select: publicItemSelect,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: categoryOrder,
  });

  return categories.map((category) => ({
    ...category,
    items: category.items.map(withPrice),
  }));
};

/* ---------- partner: categories ---------- */

export const findCategoryById = async (
  id: string,
  restaurantId: string,
): Promise<MenuCategory | null> => {
  return db.menuCategory.findFirst({ where: { id, restaurantId } });
};

export const findCategoryByName = async (
  restaurantId: string,
  name: string,
): Promise<{ id: string } | null> => {
  return db.menuCategory.findUnique({
    where: { restaurantId_name: { restaurantId, name } },
    select: { id: true },
  });
};

export const createCategory = async (
  data: CreateCategoryData,
): Promise<MenuCategory> => {
  return db.menuCategory.create({ data });
};

export const updateCategory = async (
  id: string,
  data: UpdateCategoryInput,
): Promise<MenuCategory> => {
  return db.menuCategory.update({ where: { id }, data });
};

export const countItemsInCategory = async (
  categoryId: string,
): Promise<number> => {
  return db.menuItem.count({ where: { categoryId } });
};

export const deleteCategory = async (id: string): Promise<void> => {
  await db.menuCategory.delete({ where: { id } });
};

/* ---------- partner: items ---------- */

export const findItemById = async (
  id: string,
  restaurantId: string,
): Promise<MenuItem | null> => {
  const item = await db.menuItem.findFirst({ where: { id, restaurantId } });
  return item ? toItem(item) : null;
};

export const createItem = async (data: CreateItemData): Promise<MenuItem> => {
  return toItem(await db.menuItem.create({ data }));
};

export const updateItem = async (
  id: string,
  data: UpdateItemInput,
): Promise<MenuItem> => {
  return toItem(await db.menuItem.update({ where: { id }, data }));
};

export const updateItemAvailability = async (
  id: string,
  isAvailable: boolean,
): Promise<MenuItem> => {
  return toItem(
    await db.menuItem.update({ where: { id }, data: { isAvailable } }),
  );
};

export const deleteItem = async (id: string): Promise<void> => {
  await db.menuItem.delete({ where: { id } });
};
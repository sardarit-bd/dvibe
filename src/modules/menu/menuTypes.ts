export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
}

export interface PublicMenuCategory extends PublicCategory {
  items: PublicMenuItem[];
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateItemInput {
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
}

export interface UpdateItemInput {
  categoryId?: string;
  name?: string;
  description?: string | null;
  price?: number;
  image?: string | null;
}

export interface UpdateAvailabilityInput {
  isAvailable: boolean;
}

export type CreateCategoryData = CreateCategoryInput & { restaurantId: string };
export type CreateItemData = CreateItemInput & { restaurantId: string };
import { db } from "../../config/database/index.js";
import type {
  CreateRestaurantData,
  PartnerRestaurant,
  PublicRestaurant,
  UpdateRestaurantInput,
} from "./restaurantTypes.js";

const publicSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  latitude: true,
  longitude: true,
  phone: true,
  whatsappNumber: true,
  email: true,
  openingHours: true,
  coverImage: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const findAllPublic = async (): Promise<PublicRestaurant[]> => {
  return db.restaurant.findMany({
    where: { status: { in: ["OPEN", "CLOSED"] } },
    select: publicSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const findPublicById = async (
  id: string,
): Promise<PublicRestaurant | null> => {
  return db.restaurant.findFirst({
    where: { id, status: { in: ["OPEN", "CLOSED"] } },
    select: publicSelect,
  });
};

export const findByOwnerId = async (
  ownerId: string,
): Promise<PartnerRestaurant | null> => {
  return db.restaurant.findUnique({ where: { ownerId } });
};

export const findBySlug = async (
  slug: string,
): Promise<{ id: string } | null> => {
  return db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
};

export const createRestaurant = async (
  data: CreateRestaurantData,
): Promise<PartnerRestaurant> => {
  return db.restaurant.create({ data });
};

export const updateByOwnerId = async (
  ownerId: string,
  data: UpdateRestaurantInput,
): Promise<PartnerRestaurant> => {
  return db.restaurant.update({ where: { ownerId }, data });
};

export const updateStatusByOwnerId = async (
  ownerId: string,
  status: "OPEN" | "CLOSED",
): Promise<PartnerRestaurant> => {
  return db.restaurant.update({ where: { ownerId }, data: { status } });
};
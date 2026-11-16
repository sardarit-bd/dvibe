import { db } from "../../config/database/index.js";
import type {
  CreateRestaurantData,
  PartnerRestaurant,
  PublicRestaurant,
  UpdateRestaurantInput,
} from "./restaurantTypes.js";
import { Prisma } from "../../../generated/prisma/client.js";
const toJson = (
  value: Record<string, string> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value;
};
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
  const { openingHours, ...rest } = data;

  return db.restaurant.create({
    data: { ...rest, openingHours: toJson(openingHours) },
  });
};

export const updateByOwnerId = async (
  ownerId: string,
  data: UpdateRestaurantInput,
): Promise<PartnerRestaurant> => {
  const { openingHours, ...rest } = data;

  return db.restaurant.update({
    where: { ownerId },
    data: { ...rest, openingHours: toJson(openingHours) },
  });
};

export const updateStatusByOwnerId = async (
  ownerId: string,
  status: "OPEN" | "CLOSED",
): Promise<PartnerRestaurant> => {
  return db.restaurant.update({ where: { ownerId }, data: { status } });
};

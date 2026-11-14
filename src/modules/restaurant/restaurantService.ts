import { randomBytes } from "crypto";
import AppError from "../../shared/utils/AppError.js";
import * as restaurantRepository from "./restaurantRepository.js";
import type {
  CreateRestaurantInput,
  PartnerRestaurant,
  PublicRestaurant,
  UpdateRestaurantInput,
  UpdateStatusInput,
} from "./restaurantTypes.js";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateUniqueSlug = async (name: string): Promise<string> => {
  const base = slugify(name) || "restaurant";
  let slug = base;

  while (await restaurantRepository.findBySlug(slug)) {
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }

  return slug;
};

export const getPublicRestaurants = async (): Promise<PublicRestaurant[]> => {
  return restaurantRepository.findAllPublic();
};

export const getPublicRestaurantById = async (
  id: string,
): Promise<PublicRestaurant> => {
  const restaurant = await restaurantRepository.findPublicById(id);

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return restaurant;
};

export const getPartnerRestaurant = async (
  ownerId: string,
): Promise<PartnerRestaurant> => {
  const restaurant = await restaurantRepository.findByOwnerId(ownerId);

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return restaurant;
};

export const createPartnerRestaurant = async (
  ownerId: string,
  data: CreateRestaurantInput,
): Promise<PartnerRestaurant> => {
  const existing = await restaurantRepository.findByOwnerId(ownerId);

  if (existing) {
    throw new AppError("Restaurant profile already exists", 409);
  }

  const slug = await generateUniqueSlug(data.name);

  return restaurantRepository.createRestaurant({ ...data, ownerId, slug });
};

export const updatePartnerRestaurant = async (
  ownerId: string,
  data: UpdateRestaurantInput,
): Promise<PartnerRestaurant> => {
  await getPartnerRestaurant(ownerId);

  return restaurantRepository.updateByOwnerId(ownerId, data);
};

export const updatePartnerRestaurantStatus = async (
  ownerId: string,
  data: UpdateStatusInput,
): Promise<PartnerRestaurant> => {
  await getPartnerRestaurant(ownerId);

  return restaurantRepository.updateStatusByOwnerId(ownerId, data.status);
};
import { db } from "../../config/database/index.js";
import type {
  CreateMediaData,
  CreatePhotoData,
  MediaInfo,
  PhotoWithMedia,
} from "./mediaTypes.js";

const mediaSelect = {
  id: true,
  restaurantId: true,
  menuItemId: true,
  url: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  createdAt: true,
} as const;

const photoSelect = {
  id: true,
  restaurantId: true,
  mediaId: true,
  sortOrder: true,
  createdAt: true,
  media: { select: mediaSelect },
} as const;

export const findOwnerRestaurantId = async (
  ownerId: string,
): Promise<{ id: string } | null> => {
  return db.restaurant.findUnique({
    where: { ownerId },
    select: { id: true },
  });
};

export const findMenuItemInRestaurant = async (
  id: string,
  restaurantId: string,
): Promise<{ id: string } | null> => {
  return db.menuItem.findFirst({
    where: { id, restaurantId },
    select: { id: true },
  });
};

export const createMedia = async (
  data: CreateMediaData,
): Promise<MediaInfo> => {
  return db.media.create({ data, select: mediaSelect });
};

export const findMediaInfoById = async (
  id: string,
): Promise<MediaInfo | null> => {
  return db.media.findUnique({ where: { id }, select: mediaSelect });
};

export const findOwnedMedia = async (
  id: string,
  restaurantId: string,
): Promise<{ id: string; storageKey: string } | null> => {
  return db.media.findFirst({
    where: { id, restaurantId },
    select: { id: true, storageKey: true },
  });
};

export const deleteMedia = async (id: string): Promise<void> => {
  await db.media.delete({ where: { id } });
};

export const findPhotoByMediaId = async (
  mediaId: string,
): Promise<{ id: string } | null> => {
  return db.restaurantPhoto.findUnique({
    where: { mediaId },
    select: { id: true },
  });
};

export const getMaxPhotoSortOrder = async (
  restaurantId: string,
): Promise<number | null> => {
  const result = await db.restaurantPhoto.aggregate({
    where: { restaurantId },
    _max: { sortOrder: true },
  });
  return result._max.sortOrder;
};

export const createPhoto = async (
  data: CreatePhotoData,
): Promise<PhotoWithMedia> => {
  return db.restaurantPhoto.create({ data, select: photoSelect });
};

export const findOwnedPhoto = async (
  id: string,
  restaurantId: string,
): Promise<{ id: string } | null> => {
  return db.restaurantPhoto.findFirst({
    where: { id, restaurantId },
    select: { id: true },
  });
};

export const deletePhoto = async (id: string): Promise<void> => {
  await db.restaurantPhoto.delete({ where: { id } });
};

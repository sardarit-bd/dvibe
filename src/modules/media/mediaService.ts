import path from "path";
import AppError from "../../shared/utils/AppError.js";
import * as mediaRepository from "./mediaRepository.js";
import { hasValidImageSignature, removeFile } from "./mediaStorage.js";
import type {
  AddPhotoInput,
  MediaInfo,
  PhotoWithMedia,
  UploadedFile,
  UploadMediaInput,
} from "./mediaTypes.js";

const getOwnerRestaurantId = async (ownerId: string): Promise<string> => {
  const restaurant = await mediaRepository.findOwnerRestaurantId(ownerId);

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return restaurant.id;
};

export const uploadMedia = async (
  ownerId: string,
  file: UploadedFile | undefined,
  data: UploadMediaInput,
): Promise<MediaInfo> => {
  if (!file) {
    throw new AppError("File is required", 400);
  }

  const restaurantId = await getOwnerRestaurantId(ownerId);

  const validSignature = await hasValidImageSignature(
    file.path,
    file.mimetype,
  );

  if (!validSignature) {
    throw new AppError("File content does not match its image type", 400);
  }

  const menuItemId = data.menuItemId || null;

  if (menuItemId) {
    const item = await mediaRepository.findMenuItemInRestaurant(
      menuItemId,
      restaurantId,
    );

    if (!item) {
      throw new AppError("Menu item not found", 404);
    }
  }

  return mediaRepository.createMedia({
    restaurantId,
    menuItemId,
    url: `/uploads/${file.filename}`,
    storageKey: file.filename,
    fileName: path.basename(file.originalname).slice(0, 255),
    fileType: file.mimetype,
    fileSize: file.size,
  });
};

export const getMedia = async (id: string): Promise<MediaInfo> => {
  const media = await mediaRepository.findMediaInfoById(id);

  if (!media) {
    throw new AppError("Media not found", 404);
  }

  return media;
};

export const deleteMedia = async (
  ownerId: string,
  id: string,
): Promise<void> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  const media = await mediaRepository.findOwnedMedia(id, restaurantId);

  if (!media) {
    throw new AppError("Media not found", 404);
  }

  const photo = await mediaRepository.findPhotoByMediaId(id);

  if (photo) {
    throw new AppError("Media is in use", 409);
  }

  await mediaRepository.deleteMedia(id);
  await removeFile(media.storageKey);
};

export const addPhoto = async (
  ownerId: string,
  data: AddPhotoInput,
): Promise<PhotoWithMedia> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  const media = await mediaRepository.findOwnedMedia(
    data.mediaId,
    restaurantId,
  );

  if (!media) {
    throw new AppError("Media not found", 404);
  }

  const existing = await mediaRepository.findPhotoByMediaId(data.mediaId);

  if (existing) {
    throw new AppError("Media is already a restaurant photo", 409);
  }

  const sortOrder =
    data.sortOrder ??
    ((await mediaRepository.getMaxPhotoSortOrder(restaurantId)) ?? -1) + 1;

  return mediaRepository.createPhoto({
    restaurantId,
    mediaId: data.mediaId,
    sortOrder,
  });
};

export const removePhoto = async (
  ownerId: string,
  id: string,
): Promise<void> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  const photo = await mediaRepository.findOwnedPhoto(id, restaurantId);

  if (!photo) {
    throw new AppError("Photo not found", 404);
  }

  await mediaRepository.deletePhoto(id);
};
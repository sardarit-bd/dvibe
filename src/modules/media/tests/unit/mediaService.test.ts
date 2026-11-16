import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { UploadedFile, MediaInfo, PhotoWithMedia } from "../../mediaTypes.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>;
const mockFn = () => jest.fn<AnyAsyncFn>();

const repo = {
  findOwnerRestaurantId: mockFn(),
  findMenuItemInRestaurant: mockFn(),
  createMedia: mockFn(),
  findMediaInfoById: mockFn(),
  findOwnedMedia: mockFn(),
  deleteMedia: mockFn(),
  findPhotoByMediaId: mockFn(),
  getMaxPhotoSortOrder: mockFn(),
  createPhoto: mockFn(),
  findOwnedPhoto: mockFn(),
  deletePhoto: mockFn(),
};

jest.unstable_mockModule("../../mediaRepository.js", () => ({ ...repo }));

const mockStorage = {
  hasValidImageSignature: mockFn(),
  removeFile: mockFn(),
};
jest.unstable_mockModule("../../mediaStorage.js", () => mockStorage);

const service = await import("../../mediaService.js");

const createMockFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  path: "p",
  filename: "f",
  originalname: "o",
  mimetype: "m",
  size: 10,
  ...overrides,
});

describe("mediaService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockStorage.hasValidImageSignature.mockResolvedValue(true);
    mockStorage.removeFile.mockResolvedValue(undefined);
  });

  describe("uploadMedia", () => {
    it("throws 400 when file is missing", async () => {
      await expect(service.uploadMedia("u1", undefined, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "File is required",
      });
    });

    it("throws 404 when restaurant is not found", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue(null);
      const file = createMockFile();
      await expect(service.uploadMedia("u1", file, {})).rejects.toMatchObject({
        statusCode: 404,
        message: "Restaurant not found",
      });
    });

    it("throws 400 when image signature is invalid", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockStorage.hasValidImageSignature.mockResolvedValue(false);
      const file = createMockFile();
      await expect(service.uploadMedia("u1", file, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "File content does not match its image type",
      });
    });

    it("throws 404 when menuItemId is provided but not found in restaurant", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findMenuItemInRestaurant.mockResolvedValue(null);
      const file = createMockFile();
      await expect(service.uploadMedia("u1", file, { menuItemId: "m1" })).rejects.toMatchObject({
        statusCode: 404,
        message: "Menu item not found",
      });
    });

    it("creates media successfully", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.createMedia.mockResolvedValue({ id: "m1" } as unknown as MediaInfo);
      const file = createMockFile({ 
        filename: "f.jpg", 
        originalname: "test.jpg", 
        mimetype: "image/jpeg", 
        size: 100 
      });
      
      await service.uploadMedia("u1", file, {});

      expect(repo.createMedia).toHaveBeenCalledWith({
        restaurantId: "r1",
        menuItemId: null,
        url: "/uploads/f.jpg",
        storageKey: "f.jpg",
        fileName: "test.jpg",
        fileType: "image/jpeg",
        fileSize: 100,
      });
    });
  });

  describe("getMedia", () => {
    it("throws 404 when media is not found", async () => {
      repo.findMediaInfoById.mockResolvedValue(null);
      await expect(service.getMedia("m1")).rejects.toMatchObject({
        statusCode: 404,
        message: "Media not found",
      });
    });

    it("returns media info", async () => {
      repo.findMediaInfoById.mockResolvedValue({ id: "m1" } as unknown as MediaInfo);
      const result = await service.getMedia("m1");
      expect(result).toEqual({ id: "m1" });
    });
  });

  describe("deleteMedia", () => {
    it("throws 404 when media is not found or not owned", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedMedia.mockResolvedValue(null);
      await expect(service.deleteMedia("u1", "m1")).rejects.toMatchObject({
        statusCode: 404,
        message: "Media not found",
      });
    });

    it("throws 409 when media is in use as a photo", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedMedia.mockResolvedValue({ id: "m1", storageKey: "k1" });
      repo.findPhotoByMediaId.mockResolvedValue({ id: "p1" });
      await expect(service.deleteMedia("u1", "m1")).rejects.toMatchObject({
        statusCode: 409,
        message: "Media is in use",
      });
    });

    it("deletes media and removes file", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedMedia.mockResolvedValue({ id: "m1", storageKey: "k1" });
      repo.findPhotoByMediaId.mockResolvedValue(null);
      
      await service.deleteMedia("u1", "m1");

      expect(repo.deleteMedia).toHaveBeenCalledWith("m1");
      expect(mockStorage.removeFile).toHaveBeenCalledWith("k1");
    });
  });

  describe("addPhoto", () => {
    it("throws 404 when media is not found or not owned", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedMedia.mockResolvedValue(null);
      await expect(service.addPhoto("u1", { mediaId: "m1" })).rejects.toMatchObject({
        statusCode: 404,
        message: "Media not found",
      });
    });

    it("throws 409 when media is already a restaurant photo", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedMedia.mockResolvedValue({ id: "m1" });
      repo.findPhotoByMediaId.mockResolvedValue({ id: "p1" });
      await expect(service.addPhoto("u1", { mediaId: "m1" })).rejects.toMatchObject({
        statusCode: 409,
        message: "Media is already a restaurant photo",
      });
    });

    it("creates photo with calculated sortOrder", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedMedia.mockResolvedValue({ id: "m1" });
      repo.findPhotoByMediaId.mockResolvedValue(null);
      repo.getMaxPhotoSortOrder.mockResolvedValue(2);
      repo.createPhoto.mockResolvedValue({ id: "p1" } as unknown as PhotoWithMedia);

      await service.addPhoto("u1", { mediaId: "m1" });

      expect(repo.createPhoto).toHaveBeenCalledWith({
        restaurantId: "r1",
        mediaId: "m1",
        sortOrder: 3,
      });
    });

    it("creates photo with provided sortOrder", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedMedia.mockResolvedValue({ id: "m1" });
      repo.findPhotoByMediaId.mockResolvedValue(null);
      repo.createPhoto.mockResolvedValue({ id: "p1" } as unknown as PhotoWithMedia);

      await service.addPhoto("u1", { mediaId: "m1", sortOrder: 5 });

      expect(repo.createPhoto).toHaveBeenCalledWith({
        restaurantId: "r1",
        mediaId: "m1",
        sortOrder: 5,
      });
    });
  });

  describe("removePhoto", () => {
    it("throws 404 when photo is not found or not owned", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedPhoto.mockResolvedValue(null);
      await expect(service.removePhoto("u1", "p1")).rejects.toMatchObject({
        statusCode: 404,
        message: "Photo not found",
      });
    });

    it("deletes photo", async () => {
      repo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      repo.findOwnedPhoto.mockResolvedValue({ id: "p1" });
      
      await service.removePhoto("u1", "p1");

      expect(repo.deletePhoto).toHaveBeenCalledWith("p1");
    });
  });
});
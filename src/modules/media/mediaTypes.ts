export interface UploadedFile {
  path: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface MediaInfo {
  id: string;
  restaurantId: string;
  menuItemId: string | null;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
}

export interface PhotoWithMedia {
  id: string;
  restaurantId: string;
  mediaId: string;
  sortOrder: number;
  createdAt: Date;
  media: MediaInfo;
}

export interface UploadMediaInput {
  menuItemId?: string;
}

export interface AddPhotoInput {
  mediaId: string;
  sortOrder?: number;
}

export interface CreateMediaData {
  restaurantId: string;
  menuItemId: string | null;
  url: string;
  storageKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface CreatePhotoData {
  restaurantId: string;
  mediaId: string;
  sortOrder: number;
}
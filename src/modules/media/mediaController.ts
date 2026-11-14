import { Request, Response, NextFunction } from "express";
import * as mediaService from "./mediaService.js";
import sendResponse from "../../shared/utils/response.js";

type AuthedRequest = Request & { user: { id: string; role: string } };

const ownerId = (req: Request): string => (req as AuthedRequest).user.id;

export const upload = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const media = await mediaService.uploadMedia(
      ownerId(req),
      req.file,
      req.body ?? {},
    );
    sendResponse(res, 201, true, "Media uploaded successfully", media);
  } catch (error) {
    next(error);
  }
};

export const getOne = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const media = await mediaService.getMedia(req.params.id as string);
    sendResponse(res, 200, true, "Media fetched successfully", media);
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await mediaService.deleteMedia(ownerId(req), req.params.id as string);
    sendResponse(res, 200, true, "Media deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const addPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const photo = await mediaService.addPhoto(ownerId(req), req.body);
    sendResponse(res, 201, true, "Restaurant photo added successfully", photo);
  } catch (error) {
    next(error);
  }
};

export const removePhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await mediaService.removePhoto(ownerId(req), req.params.id as string);
    sendResponse(res, 200, true, "Restaurant photo removed successfully");
  } catch (error) {
    next(error);
  }
};
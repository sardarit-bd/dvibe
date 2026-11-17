import { Request, Response, NextFunction } from "express";
import * as languageService from "./languageService.js";
import sendResponse from "../../shared/utils/response.js";

export const getLanguages = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const languages = await languageService.getLanguages();
    sendResponse(res, 200, true, "Languages fetched successfully", languages);
  } catch (error) {
    next(error);
  }
};

export const getTranslations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const translations = await languageService.getTranslations(
      req.params.locale as string,
    );
    res.set("Cache-Control", "public, max-age=60");
    sendResponse(
      res,
      200,
      true,
      "Translations fetched successfully",
      translations,
    );
  } catch (error) {
    next(error);
  }
};

export const updateTranslations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const translations = await languageService.updateTranslations(
      req.params.locale as string,
      req.body,
    );
    sendResponse(
      res,
      200,
      true,
      "Translations updated successfully",
      translations,
    );
  } catch (error) {
    next(error);
  }
};
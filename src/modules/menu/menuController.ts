import { Request, Response, NextFunction } from "express";
import * as menuService from "./menuService.js";
import sendResponse from "../../shared/utils/response.js";

type AuthedRequest = Request & { user: { id: string; role: string } };

const ownerId = (req: Request): string => (req as AuthedRequest).user.id;

export const getMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const menu = await menuService.getPublicMenu(req.params.id as string);
    sendResponse(res, 200, true, "Menu fetched successfully", menu);
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categories = await menuService.getPublicCategories(
      req.params.id as string,
    );
    sendResponse(res, 200, true, "Categories fetched successfully", categories);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const category = await menuService.createCategory(ownerId(req), req.body);
    sendResponse(res, 201, true, "Category created successfully", category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const category = await menuService.updateCategory(
      ownerId(req),
      req.params.id as string,
      req.body,
    );
    sendResponse(res, 200, true, "Category updated successfully", category);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await menuService.deleteCategory(ownerId(req), req.params.id as string);
    sendResponse(res, 200, true, "Category deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const item = await menuService.createItem(ownerId(req), req.body);
    sendResponse(res, 201, true, "Menu item created successfully", item);
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const item = await menuService.updateItem(
      ownerId(req),
      req.params.id as string,
      req.body,
    );
    sendResponse(res, 200, true, "Menu item updated successfully", item);
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await menuService.deleteItem(ownerId(req), req.params.id as string);
    sendResponse(res, 200, true, "Menu item deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const updateItemAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const item = await menuService.updateItemAvailability(
      ownerId(req),
      req.params.id as string,
      req.body,
    );
    sendResponse(
      res,
      200,
      true,
      "Menu item availability updated successfully",
      item,
    );
  } catch (error) {
    next(error);
  }
};
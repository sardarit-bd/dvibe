import { Request, Response, NextFunction } from "express";
import * as restaurantService from "./restaurantService.js";
import sendResponse from "../../shared/utils/response.js";

type AuthedRequest = Request & { user: { id: string; role: string } };

export const getAll = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurants = await restaurantService.getPublicRestaurants();
    sendResponse(res, 200, true, "Restaurants fetched successfully", restaurants);
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurant = await restaurantService.getPublicRestaurantById(
      req.params.id as string,
    );
    sendResponse(res, 200, true, "Restaurant fetched successfully", restaurant);
  } catch (error) {
    next(error);
  }
};

export const getMine = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurant = await restaurantService.getPartnerRestaurant(
      (req as AuthedRequest).user.id,
    );
    sendResponse(res, 200, true, "Restaurant fetched successfully", restaurant);
  } catch (error) {
    next(error);
  }
};

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurant = await restaurantService.createPartnerRestaurant(
      (req as AuthedRequest).user.id,
      req.body,
    );
    sendResponse(res, 201, true, "Restaurant created successfully", restaurant);
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurant = await restaurantService.updatePartnerRestaurant(
      (req as AuthedRequest).user.id,
      req.body,
    );
    sendResponse(res, 200, true, "Restaurant updated successfully", restaurant);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurant = await restaurantService.updatePartnerRestaurantStatus(
      (req as AuthedRequest).user.id,
      req.body,
    );
    sendResponse(
      res,
      200,
      true,
      "Restaurant status updated successfully",
      restaurant,
    );
  } catch (error) {
    next(error);
  }
};
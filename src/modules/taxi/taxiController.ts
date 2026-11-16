import { Request, Response, NextFunction } from "express";
import * as taxiService from "./taxiService.js";
import {
  parseListDriversQuery,
  parseListTaxiRequestsQuery,
} from "./taxiValidators.js";
import sendResponse from "../../shared/utils/response.js";

const optionalUserId = (req: Request): string | null =>
  (req as Request & { user?: { id: string } }).user?.id ?? null;

export const listDrivers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = await parseListDriversQuery(req.query);
    const result = await taxiService.listDrivers(query);
    sendResponse(res, 200, true, "Drivers fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const driver = await taxiService.getDriver(req.params.id as string);
    sendResponse(res, 200, true, "Driver fetched successfully", driver);
  } catch (error) {
    next(error);
  }
};

export const createTaxiRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const request = await taxiService.createTaxiRequest(
      optionalUserId(req),
      req.body,
    );
    sendResponse(res, 201, true, "Taxi request created successfully", request);
  } catch (error) {
    next(error);
  }
};

export const getTaxiRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const request = await taxiService.getTaxiRequest(req.params.id as string);
    sendResponse(res, 200, true, "Taxi request fetched successfully", request);
  } catch (error) {
    next(error);
  }
};

export const listPartnerTaxiRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = await parseListTaxiRequestsQuery(req.query);
    const result = await taxiService.listPartnerTaxiRequests(query);
    sendResponse(res, 200, true, "Taxi requests fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const updateDriverAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const driver = await taxiService.updateDriverAvailability(
      req.params.id as string,
      req.body,
    );
    sendResponse(
      res,
      200,
      true,
      "Driver availability updated successfully",
      driver,
    );
  } catch (error) {
    next(error);
  }
};
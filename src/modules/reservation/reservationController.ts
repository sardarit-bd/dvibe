import { Request, Response, NextFunction } from "express";
import * as reservationService from "./reservationService.js";
import { parseListReservationsQuery } from "./reservationValidators.js";
import sendResponse from "../../shared/utils/response.js";

type AuthedRequest = Request & { user: { id: string; role: string } };

const ownerId = (req: Request): string => (req as AuthedRequest).user.id;

const optionalUserId = (req: Request): string | null =>
  (req as Request & { user?: { id: string } }).user?.id ?? null;

export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reservation = await reservationService.createReservation(
      optionalUserId(req),
      req.body,
    );
    sendResponse(
      res,
      201,
      true,
      "Reservation created successfully",
      reservation,
    );
  } catch (error) {
    next(error);
  }
};

export const getReservation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reservation = await reservationService.getReservation(
      req.params.id as string,
    );
    sendResponse(
      res,
      200,
      true,
      "Reservation fetched successfully",
      reservation,
    );
  } catch (error) {
    next(error);
  }
};

export const listPartnerReservations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = await parseListReservationsQuery(req.query);
    const result = await reservationService.listPartnerReservations(
      ownerId(req),
      query,
    );
    sendResponse(res, 200, true, "Reservations fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getPartnerReservation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reservation = await reservationService.getPartnerReservation(
      ownerId(req),
      req.params.id as string,
    );
    sendResponse(
      res,
      200,
      true,
      "Reservation fetched successfully",
      reservation,
    );
  } catch (error) {
    next(error);
  }
};

export const updateReservationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reservation = await reservationService.updateReservationStatus(
      ownerId(req),
      req.params.id as string,
      req.body,
    );
    sendResponse(
      res,
      200,
      true,
      "Reservation status updated successfully",
      reservation,
    );
  } catch (error) {
    next(error);
  }
};
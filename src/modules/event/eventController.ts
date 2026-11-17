import { Request, Response, NextFunction } from "express";
import * as eventService from "./eventService.js";
import { parseListEventsQuery } from "./eventValidators.js";
import sendResponse from "../../shared/utils/response.js";

export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = await parseListEventsQuery(req.query);
    const events = await eventService.getEvents(query);
    sendResponse(res, 200, true, "Events fetched successfully", events);
  } catch (error) {
    next(error);
  }
};

export const getEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const event = await eventService.getEvent(req.params.id as string);
    sendResponse(res, 200, true, "Event fetched successfully", event);
  } catch (error) {
    next(error);
  }
};
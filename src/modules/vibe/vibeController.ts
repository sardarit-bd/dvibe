import { Request, Response, NextFunction } from "express";
import * as vibeService from "./vibeService.js";
import { parseListVibesQuery } from "./vibeValidators.js";
import sendResponse from "../../shared/utils/response.js";

export const getVibes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = await parseListVibesQuery(req.query);
    const vibes = await vibeService.getVibes(query);
    sendResponse(res, 200, true, "Vibes fetched successfully", vibes);
  } catch (error) {
    next(error);
  }
};

export const getVibe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vibe = await vibeService.getVibe(req.params.id as string);
    sendResponse(res, 200, true, "Vibe fetched successfully", vibe);
  } catch (error) {
    next(error);
  }
};
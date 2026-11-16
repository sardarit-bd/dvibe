import type { Request, Response, NextFunction } from "express";
import authMiddleware from "./authMiddleware.js";

const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> | void => {
  if (!req.headers.authorization) {
    return next();
  }

  return authMiddleware(req, res, next);
};

export default optionalAuth;
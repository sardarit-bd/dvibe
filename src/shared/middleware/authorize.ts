import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError.js";

const authorize =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: { role: string } }).user;

    if (!user) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!roles.includes(user.role)) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };

export default authorize;
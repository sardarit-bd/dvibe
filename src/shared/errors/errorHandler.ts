import { Request, Response, NextFunction } from "express";
import sendResponse from "../utils/response.js";

interface CustomError extends Error {
  statusCode?: number;
}

const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode: number = err.statusCode || 500;
  const message: string = err.message || "Internal Server Error";

  sendResponse(res, statusCode, false, message);
};

export default errorHandler;
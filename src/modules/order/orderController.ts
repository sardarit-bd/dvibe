import { Request, Response, NextFunction } from "express";
import * as orderService from "./orderService.js";
import { parseListOrdersQuery } from "./orderValidators.js";
import sendResponse from "../../shared/utils/response.js";

type AuthedRequest = Request & { user: { id: string; role: string } };

const ownerId = (req: Request): string => (req as AuthedRequest).user.id;

const optionalUserId = (req: Request): string | null =>
  (req as Request & { user?: { id: string } }).user?.id ?? null;

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.createOrder(optionalUserId(req), req.body);
    sendResponse(res, 201, true, "Order created successfully", order);
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.getOrder(req.params.id as string);
    sendResponse(res, 200, true, "Order fetched successfully", order);
  } catch (error) {
    next(error);
  }
};

export const getOrderWhatsApp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const details = await orderService.getOrderWhatsApp(
      req.params.id as string,
    );
    sendResponse(
      res,
      200,
      true,
      "WhatsApp details generated successfully",
      details,
    );
  } catch (error) {
    next(error);
  }
};

export const listPartnerOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = await parseListOrdersQuery(req.query);
    const result = await orderService.listPartnerOrders(ownerId(req), query);
    sendResponse(res, 200, true, "Orders fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getPartnerOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.getPartnerOrder(
      ownerId(req),
      req.params.id as string,
    );
    sendResponse(res, 200, true, "Order fetched successfully", order);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await orderService.updateOrderStatus(
      ownerId(req),
      req.params.id as string,
      req.body,
    );
    sendResponse(res, 200, true, "Order status updated successfully", order);
  } catch (error) {
    next(error);
  }
};
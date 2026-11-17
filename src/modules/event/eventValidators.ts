import * as yup from "yup";
import AppError from "../../shared/utils/AppError.js";
import type { ListEventsQuery } from "./eventTypes.js";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const listEventsQuerySchema = yup.object({
  upcoming: yup
    .boolean()
    .typeError("upcoming must be true or false")
    .default(true),
  limit: yup
    .number()
    .typeError("limit must be a number")
    .integer("limit must be an integer")
    .min(1, "limit must be at least 1")
    .max(MAX_LIMIT, `limit cannot exceed ${MAX_LIMIT}`)
    .default(DEFAULT_LIMIT),
  offset: yup
    .number()
    .typeError("offset must be a number")
    .integer("offset must be an integer")
    .min(0, "offset cannot be negative")
    .default(0),
});

export const parseListEventsQuery = async (
  query: unknown,
): Promise<ListEventsQuery> => {
  try {
    return await listEventsQuerySchema.validate(query, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      throw new AppError(error.errors.join(", "), 400);
    }
    throw error;
  }
};
import * as yup from "yup";
import AppError from "../../shared/utils/AppError.js";
import type { ListVibesQuery, VibeCategory } from "./vibeTypes.js";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const VIBE_CATEGORIES: VibeCategory[] = [
  "EVENT",
  "LIVE_MUSIC",
  "NIGHTLIFE",
];

export const listVibesQuerySchema = yup.object({
  category: yup
    .string()
    .oneOf(VIBE_CATEGORIES, "category must be one of EVENT, LIVE_MUSIC, NIGHTLIFE"),
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

export const parseListVibesQuery = async (
  query: unknown,
): Promise<ListVibesQuery> => {
  try {
    return await listVibesQuerySchema.validate(query, {
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
import { db } from "../../config/database/index.js";
import type { ListVibesQuery, VibeInfo } from "./vibeTypes.js";

export const findPublishedVibes = async (
  query: ListVibesQuery,
): Promise<VibeInfo[]> => {
  return db.vibe.findMany({
    where: {
      status: "PUBLISHED",
      ...(query.category ? { category: query.category } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: query.offset,
    take: query.limit,
  });
};

export const findPublishedVibeById = async (
  id: string,
): Promise<VibeInfo | null> => {
  return db.vibe.findFirst({ where: { id, status: "PUBLISHED" } });
};
import AppError from "../../shared/utils/AppError.js";
import * as vibeRepository from "./vibeRepository.js";
import type { ListVibesQuery, VibeInfo } from "./vibeTypes.js";

export const getVibes = async (query: ListVibesQuery): Promise<VibeInfo[]> => {
  return vibeRepository.findPublishedVibes(query);
};

export const getVibe = async (id: string): Promise<VibeInfo> => {
  const vibe = await vibeRepository.findPublishedVibeById(id);

  if (!vibe) {
    throw new AppError("Vibe not found", 404);
  }

  return vibe;
};
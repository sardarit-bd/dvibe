export type VibeCategory = "EVENT" | "LIVE_MUSIC" | "NIGHTLIFE";
export type VibeStatus = "DRAFT" | "PUBLISHED";

export interface VibeInfo {
  id: string;
  title: string;
  description: string | null;
  category: VibeCategory;
  image: string | null;
  location: string | null;
  status: VibeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListVibesQuery {
  category?: VibeCategory | undefined;
  limit: number;
  offset: number;
}
export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface EventInfo {
  id: string;
  title: string;
  description: string | null;
  location: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  image: string | null;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListEventsQuery {
  upcoming: boolean;
  limit: number;
  offset: number;
}

export interface FindEventsOptions {
  from?: Date | undefined;
  limit: number;
  offset: number;
}
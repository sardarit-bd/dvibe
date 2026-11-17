import { db } from "../../config/database/index.js";
import type {
  EventInfo,
  EventStatus,
  FindEventsOptions,
} from "./eventTypes.js";

type EventRow = Omit<EventInfo, "eventDate"> & { eventDate: Date };

const PUBLIC_STATUSES: EventStatus[] = ["PUBLISHED", "CANCELLED"];

const toEvent = (row: EventRow): EventInfo => ({
  ...row,
  eventDate: row.eventDate.toISOString().slice(0, 10),
});

export const findPublicEvents = async (
  options: FindEventsOptions,
): Promise<EventInfo[]> => {
  const rows = await db.event.findMany({
    where: {
      status: { in: PUBLIC_STATUSES },
      ...(options.from ? { eventDate: { gte: options.from } } : {}),
    },
    orderBy: [
      { eventDate: "asc" },
      { startTime: "asc" },
      { createdAt: "asc" },
    ],
    skip: options.offset,
    take: options.limit,
  });

  return rows.map(toEvent);
};

export const findPublicEventById = async (
  id: string,
): Promise<EventInfo | null> => {
  const row = await db.event.findFirst({
    where: { id, status: { in: PUBLIC_STATUSES } },
  });

  return row ? toEvent(row) : null;
};
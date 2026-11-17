import AppError from "../../shared/utils/AppError.js";
import * as eventRepository from "./eventRepository.js";
import type { EventInfo, ListEventsQuery } from "./eventTypes.js";

// Server date (UTC) at midnight, matching how @db.Date values are read.
const today = (): Date => new Date(new Date().toISOString().slice(0, 10));

export const getEvents = async (
  query: ListEventsQuery,
): Promise<EventInfo[]> => {
  return eventRepository.findPublicEvents({
    from: query.upcoming ? today() : undefined,
    limit: query.limit,
    offset: query.offset,
  });
};

export const getEvent = async (id: string): Promise<EventInfo> => {
  const event = await eventRepository.findPublicEventById(id);

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  return event;
};
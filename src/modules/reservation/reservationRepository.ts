import { db } from "../../config/database/index.js";
import type {
  CreateReservationData,
  ListReservationsQuery,
  Reservation,
  ReservationStatus,
} from "./reservationTypes.js";

type DbReservation = Omit<Reservation, "reservationDate"> & {
  reservationDate: Date;
};

const toReservation = (reservation: DbReservation): Reservation => ({
  ...reservation,
  reservationDate: reservation.reservationDate.toISOString().slice(0, 10),
});

const toDbDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const reservationOrder = [
  { reservationDate: "asc" as const },
  { reservationTime: "asc" as const },
  { createdAt: "asc" as const },
];

/* ---------- restaurant lookups ---------- */

export const findPublicRestaurant = async (
  id: string,
): Promise<{ id: string } | null> => {
  return db.restaurant.findFirst({
    where: { id, status: { in: ["OPEN", "CLOSED"] } },
    select: { id: true },
  });
};

export const findOwnerRestaurantId = async (
  ownerId: string,
): Promise<{ id: string } | null> => {
  return db.restaurant.findUnique({
    where: { ownerId },
    select: { id: true },
  });
};

/* ---------- public ---------- */

export const createReservation = async (
  data: CreateReservationData,
): Promise<Reservation> => {
  return toReservation(
    await db.reservation.create({
      data: { ...data, reservationDate: toDbDate(data.reservationDate) },
    }),
  );
};

export const findReservationById = async (
  id: string,
): Promise<Reservation | null> => {
  const reservation = await db.reservation.findUnique({ where: { id } });

  return reservation ? toReservation(reservation) : null;
};

/* ---------- partner ---------- */

export const findRestaurantReservations = async (
  restaurantId: string,
  query: ListReservationsQuery,
): Promise<{ reservations: Reservation[]; total: number }> => {
  const where = {
    restaurantId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.date ? { reservationDate: toDbDate(query.date) } : {}),
  };

  const [reservations, total] = await Promise.all([
    db.reservation.findMany({
      where,
      orderBy: reservationOrder,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    db.reservation.count({ where }),
  ]);

  return { reservations: reservations.map(toReservation), total };
};

export const findOwnedReservationById = async (
  id: string,
  restaurantId: string,
): Promise<Reservation | null> => {
  const reservation = await db.reservation.findFirst({
    where: { id, restaurantId },
  });

  return reservation ? toReservation(reservation) : null;
};

export const updateReservationStatus = async (
  id: string,
  status: ReservationStatus,
): Promise<Reservation> => {
  return toReservation(
    await db.reservation.update({ where: { id }, data: { status } }),
  );
};
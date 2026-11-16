import AppError from "../../shared/utils/AppError.js";
import * as reservationRepository from "./reservationRepository.js";
import type {
  CreateReservationInput,
  ListReservationsQuery,
  PaginatedReservations,
  Reservation,
  ReservationStatus,
  UpdateReservationStatusInput,
} from "./reservationTypes.js";

const MAX_DAYS_AHEAD = 90;

const allowedTransitions: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
};

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

const addDaysUtc = (date: string, days: number): string => {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);

  return result.toISOString().slice(0, 10);
};

const getOwnerRestaurantId = async (ownerId: string): Promise<string> => {
  const restaurant =
    await reservationRepository.findOwnerRestaurantId(ownerId);

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return restaurant.id;
};

const getOwnedReservation = async (
  restaurantId: string,
  id: string,
): Promise<Reservation> => {
  const reservation = await reservationRepository.findOwnedReservationById(
    id,
    restaurantId,
  );

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  return reservation;
};

/* ---------- public ---------- */

export const createReservation = async (
  customerId: string | null,
  data: CreateReservationInput,
): Promise<Reservation> => {
  const today = todayUtc();

  if (data.reservationDate < today) {
    throw new AppError("Reservation date cannot be in the past", 400);
  }

  if (data.reservationDate > addDaysUtc(today, MAX_DAYS_AHEAD)) {
    throw new AppError(
      `Reservation date cannot be more than ${MAX_DAYS_AHEAD} days ahead`,
      400,
    );
  }

  const restaurant = await reservationRepository.findPublicRestaurant(
    data.restaurantId,
  );

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return reservationRepository.createReservation({
    restaurantId: data.restaurantId,
    customerId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    reservationDate: data.reservationDate,
    reservationTime: data.reservationTime,
    guestCount: data.guestCount,
    specialRequest: data.specialRequest ?? null,
  });
};

export const getReservation = async (id: string): Promise<Reservation> => {
  const reservation = await reservationRepository.findReservationById(id);

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  return reservation;
};

/* ---------- partner ---------- */

export const listPartnerReservations = async (
  ownerId: string,
  query: ListReservationsQuery,
): Promise<PaginatedReservations> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  const { reservations, total } =
    await reservationRepository.findRestaurantReservations(restaurantId, query);

  return {
    reservations,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getPartnerReservation = async (
  ownerId: string,
  id: string,
): Promise<Reservation> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);

  return getOwnedReservation(restaurantId, id);
};

export const updateReservationStatus = async (
  ownerId: string,
  id: string,
  data: UpdateReservationStatusInput,
): Promise<Reservation> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  const reservation = await getOwnedReservation(restaurantId, id);

  if (!allowedTransitions[reservation.status].includes(data.status)) {
    throw new AppError(
      `Cannot change reservation status from ${reservation.status} to ${data.status}`,
      409,
    );
  }

  return reservationRepository.updateReservationStatus(id, data.status);
};
export const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  guestCount: number;
  specialRequest: string | null;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReservationInput {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  guestCount: number;
  specialRequest?: string | null;
}

export interface UpdateReservationStatusInput {
  status: ReservationStatus;
}

export interface ListReservationsQuery {
  status?: ReservationStatus;
  date?: string;
  page: number;
  limit: number;
}

export interface PaginatedReservations {
  reservations: Reservation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReservationData {
  restaurantId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  guestCount: number;
  specialRequest: string | null;
}
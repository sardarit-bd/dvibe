import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type {
  CreateReservationInput,
  Reservation,
  ReservationStatus,
} from "../../reservationTypes.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockRepo = {
  findPublicRestaurant: jest.fn<AnyFn>(),
  findOwnerRestaurantId: jest.fn<AnyFn>(),
  createReservation: jest.fn<AnyFn>(),
  findReservationById: jest.fn<AnyFn>(),
  findRestaurantReservations: jest.fn<AnyFn>(),
  findOwnedReservationById: jest.fn<AnyFn>(),
  updateReservationStatus: jest.fn<AnyFn>(),
};

jest.unstable_mockModule("../../reservationRepository.js", () => mockRepo);

const reservationService = await import("../../reservationService.js");

const dateOffset = (days: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const makeReservation = (status: ReservationStatus): Reservation => ({
  id: "res1",
  restaurantId: "r1",
  customerId: null,
  customerName: "Sam",
  customerPhone: "+8801700000000",
  reservationDate: dateOffset(7),
  reservationTime: "19:30",
  guestCount: 4,
  specialRequest: null,
  status,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const baseInput = (): CreateReservationInput => ({
  restaurantId: "r1",
  customerName: "Sam",
  customerPhone: "+8801700000000",
  reservationDate: dateOffset(7),
  reservationTime: "19:30",
  guestCount: 4,
});

describe("reservationService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("createReservation", () => {
    beforeEach(() => {
      mockRepo.findPublicRestaurant.mockResolvedValue({ id: "r1" });
      mockRepo.createReservation.mockResolvedValue(makeReservation("PENDING"));
    });

    it("creates a reservation and defaults specialRequest to null", async () => {
      await reservationService.createReservation(null, baseInput());

      expect(mockRepo.findPublicRestaurant).toHaveBeenCalledWith("r1");
      expect(mockRepo.createReservation).toHaveBeenCalledWith({
        restaurantId: "r1",
        customerId: null,
        customerName: "Sam",
        customerPhone: "+8801700000000",
        reservationDate: dateOffset(7),
        reservationTime: "19:30",
        guestCount: 4,
        specialRequest: null,
      });
    });

    it("passes customerId and specialRequest through", async () => {
      await reservationService.createReservation("u1", {
        ...baseInput(),
        specialRequest: "Window table",
      });

      expect(mockRepo.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "u1",
          specialRequest: "Window table",
        }),
      );
    });

    it.each([0, 90])("accepts a date %i days from today", async (days) => {
      await expect(
        reservationService.createReservation(null, {
          ...baseInput(),
          reservationDate: dateOffset(days),
        }),
      ).resolves.toBeDefined();
    });

    it("rejects yesterday", async () => {
      await expect(
        reservationService.createReservation(null, {
          ...baseInput(),
          reservationDate: dateOffset(-1),
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Reservation date cannot be in the past",
      });
      expect(mockRepo.findPublicRestaurant).not.toHaveBeenCalled();
      expect(mockRepo.createReservation).not.toHaveBeenCalled();
    });

    it("rejects a date 91 days from today", async () => {
      await expect(
        reservationService.createReservation(null, {
          ...baseInput(),
          reservationDate: dateOffset(91),
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Reservation date cannot be more than 90 days ahead",
      });
      expect(mockRepo.createReservation).not.toHaveBeenCalled();
    });

    it("throws 404 when the restaurant is not public", async () => {
      mockRepo.findPublicRestaurant.mockResolvedValue(null);

      await expect(
        reservationService.createReservation(null, baseInput()),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Restaurant not found",
      });
      expect(mockRepo.createReservation).not.toHaveBeenCalled();
    });
  });

  describe("getReservation", () => {
    it("returns the reservation", async () => {
      mockRepo.findReservationById.mockResolvedValue(
        makeReservation("PENDING"),
      );

      const reservation = await reservationService.getReservation("res1");

      expect(reservation.id).toBe("res1");
    });

    it("throws 404 when missing", async () => {
      mockRepo.findReservationById.mockResolvedValue(null);

      await expect(
        reservationService.getReservation("nope"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Reservation not found",
      });
    });
  });

  describe("listPartnerReservations", () => {
    it("scopes to the owner's restaurant and computes pagination", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockRepo.findRestaurantReservations.mockResolvedValue({
        reservations: [makeReservation("PENDING")],
        total: 45,
      });

      const query = { status: "PENDING" as const, page: 2, limit: 20 };
      const result = await reservationService.listPartnerReservations(
        "u1",
        query,
      );

      expect(mockRepo.findOwnerRestaurantId).toHaveBeenCalledWith("u1");
      expect(mockRepo.findRestaurantReservations).toHaveBeenCalledWith(
        "r1",
        query,
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it("returns zero pages when there are no reservations", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockRepo.findRestaurantReservations.mockResolvedValue({
        reservations: [],
        total: 0,
      });

      const result = await reservationService.listPartnerReservations("u1", {
        page: 1,
        limit: 20,
      });

      expect(result.pagination.totalPages).toBe(0);
    });

    it("throws 404 when the owner has no restaurant", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue(null);

      await expect(
        reservationService.listPartnerReservations("u1", {
          page: 1,
          limit: 20,
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.findRestaurantReservations).not.toHaveBeenCalled();
    });
  });

  describe("getPartnerReservation", () => {
    it("looks the reservation up within the owner's restaurant", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockRepo.findOwnedReservationById.mockResolvedValue(
        makeReservation("PENDING"),
      );

      await reservationService.getPartnerReservation("u1", "res1");

      expect(mockRepo.findOwnedReservationById).toHaveBeenCalledWith(
        "res1",
        "r1",
      );
    });

    it("throws 404 for a reservation that is not owned", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockRepo.findOwnedReservationById.mockResolvedValue(null);

      await expect(
        reservationService.getPartnerReservation("u1", "other"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Reservation not found",
      });
    });
  });

  describe("updateReservationStatus", () => {
    beforeEach(() => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
    });

    const validTransitions: [ReservationStatus, ReservationStatus][] = [
      ["PENDING", "CONFIRMED"],
      ["PENDING", "REJECTED"],
      ["PENDING", "CANCELLED"],
      ["CONFIRMED", "COMPLETED"],
      ["CONFIRMED", "CANCELLED"],
    ];

    it.each(validTransitions)("allows %s -> %s", async (from, to) => {
      mockRepo.findOwnedReservationById.mockResolvedValue(
        makeReservation(from),
      );
      mockRepo.updateReservationStatus.mockResolvedValue(makeReservation(to));

      const reservation = await reservationService.updateReservationStatus(
        "u1",
        "res1",
        { status: to },
      );

      expect(reservation.status).toBe(to);
      expect(mockRepo.updateReservationStatus).toHaveBeenCalledWith(
        "res1",
        to,
      );
    });

    const invalidTransitions: [ReservationStatus, ReservationStatus][] = [
      ["PENDING", "PENDING"],
      ["PENDING", "COMPLETED"],
      ["CONFIRMED", "PENDING"],
      ["CONFIRMED", "REJECTED"],
      ["REJECTED", "CONFIRMED"],
      ["CANCELLED", "PENDING"],
      ["COMPLETED", "CANCELLED"],
    ];

    it.each(invalidTransitions)("rejects %s -> %s", async (from, to) => {
      mockRepo.findOwnedReservationById.mockResolvedValue(
        makeReservation(from),
      );

      await expect(
        reservationService.updateReservationStatus("u1", "res1", {
          status: to,
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: `Cannot change reservation status from ${from} to ${to}`,
      });
      expect(mockRepo.updateReservationStatus).not.toHaveBeenCalled();
    });

    it("throws 404 for a reservation that is not owned", async () => {
      mockRepo.findOwnedReservationById.mockResolvedValue(null);

      await expect(
        reservationService.updateReservationStatus("u1", "other", {
          status: "CONFIRMED",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Reservation not found",
      });
    });

    it("throws 404 when the owner has no restaurant", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue(null);

      await expect(
        reservationService.updateReservationStatus("u1", "res1", {
          status: "CONFIRMED",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Restaurant not found",
      });
    });
  });
});
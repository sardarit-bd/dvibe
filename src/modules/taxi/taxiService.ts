import AppError from "../../shared/utils/AppError.js";
import * as taxiRepository from "./taxiRepository.js";
import type {
  CreateTaxiRequestInput,
  Driver,
  ListDriversQuery,
  ListTaxiRequestsQuery,
  PaginatedDrivers,
  PaginatedTaxiRequests,
  Pagination,
  TaxiRequestDetails,
  TaxiRequestWithDriver,
  TaxiWhatsApp,
  UpdateDriverAvailabilityInput,
} from "./taxiTypes.js";

const toPagination = (
  query: { page: number; limit: number },
  total: number,
): Pagination => ({
  page: query.page,
  limit: query.limit,
  total,
  totalPages: Math.ceil(total / query.limit),
});

const buildWhatsApp = (request: TaxiRequestWithDriver): TaxiWhatsApp | null => {
  const whatsappNumber = request.driver.whatsappNumber.replace(/\D/g, "");

  if (!whatsappNumber) {
    return null;
  }

  const lines = [
    `Hello ${request.driver.name}, I need a taxi.`,
    `Name: ${request.customerName}`,
    `Phone: ${request.customerPhone}`,
    `Pickup: ${request.pickupLocation}`,
    `Destination: ${request.destination}`,
  ];

  if (request.notes) {
    lines.push(`Notes: ${request.notes}`);
  }

  const message = lines.join("\n");

  return {
    whatsappNumber,
    message,
    url: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
  };
};

const withWhatsApp = (request: TaxiRequestWithDriver): TaxiRequestDetails => ({
  ...request,
  whatsapp: buildWhatsApp(request),
});

/* ---------- drivers ---------- */

export const listDrivers = async (
  query: ListDriversQuery,
): Promise<PaginatedDrivers> => {
  const { drivers, total } = await taxiRepository.findAvailableDrivers(query);

  return { drivers, pagination: toPagination(query, total) };
};

export const getDriver = async (id: string): Promise<Driver> => {
  const driver = await taxiRepository.findDriverById(id);

  if (!driver) {
    throw new AppError("Driver not found", 404);
  }

  return driver;
};

export const updateDriverAvailability = async (
  id: string,
  data: UpdateDriverAvailabilityInput,
): Promise<Driver> => {
  await getDriver(id);

  return taxiRepository.updateDriverAvailability(id, data.isAvailable);
};

/* ---------- taxi requests ---------- */

export const createTaxiRequest = async (
  customerId: string | null,
  data: CreateTaxiRequestInput,
): Promise<TaxiRequestDetails> => {
  const driver = await getDriver(data.driverId);

  if (!driver.isAvailable) {
    throw new AppError("Driver is not available", 409);
  }

  const request = await taxiRepository.createTaxiRequest({
    driverId: data.driverId,
    customerId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    pickupLocation: data.pickupLocation,
    destination: data.destination,
    notes: data.notes ?? null,
  });

  return withWhatsApp(request);
};

export const getTaxiRequest = async (
  id: string,
): Promise<TaxiRequestDetails> => {
  const request = await taxiRepository.findTaxiRequestById(id);

  if (!request) {
    throw new AppError("Taxi request not found", 404);
  }

  return withWhatsApp(request);
};

export const listPartnerTaxiRequests = async (
  query: ListTaxiRequestsQuery,
): Promise<PaginatedTaxiRequests> => {
  const { taxiRequests, total } = await taxiRepository.findTaxiRequests(query);

  return { taxiRequests, pagination: toPagination(query, total) };
};
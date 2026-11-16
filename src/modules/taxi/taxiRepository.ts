import { db } from "../../config/database/index.js";
import type {
  CreateTaxiRequestData,
  Driver,
  ListDriversQuery,
  ListTaxiRequestsQuery,
  TaxiRequestWithDriver,
} from "./taxiTypes.js";

const driverOrder = [{ name: "asc" as const }, { id: "asc" as const }];

const taxiRequestOrder = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

/* ---------- drivers ---------- */

export const findAvailableDrivers = async (
  query: ListDriversQuery,
): Promise<{ drivers: Driver[]; total: number }> => {
  const where = {
    isAvailable: true,
    ...(query.serviceArea
      ? {
          serviceArea: {
            contains: query.serviceArea,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(query.vehicleType
      ? {
          vehicleType: {
            equals: query.vehicleType,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const [drivers, total] = await Promise.all([
    db.driver.findMany({
      where,
      orderBy: driverOrder,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    db.driver.count({ where }),
  ]);

  return { drivers, total };
};

export const findDriverById = async (id: string): Promise<Driver | null> => {
  return db.driver.findUnique({ where: { id } });
};

export const updateDriverAvailability = async (
  id: string,
  isAvailable: boolean,
): Promise<Driver> => {
  return db.driver.update({ where: { id }, data: { isAvailable } });
};

/* ---------- taxi requests ---------- */

export const createTaxiRequest = async (
  data: CreateTaxiRequestData,
): Promise<TaxiRequestWithDriver> => {
  return db.taxiRequest.create({ data, include: { driver: true } });
};

export const findTaxiRequestById = async (
  id: string,
): Promise<TaxiRequestWithDriver | null> => {
  return db.taxiRequest.findUnique({
    where: { id },
    include: { driver: true },
  });
};

export const findTaxiRequests = async (
  query: ListTaxiRequestsQuery,
): Promise<{ taxiRequests: TaxiRequestWithDriver[]; total: number }> => {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.driverId ? { driverId: query.driverId } : {}),
  };

  const [taxiRequests, total] = await Promise.all([
    db.taxiRequest.findMany({
      where,
      include: { driver: true },
      orderBy: taxiRequestOrder,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    db.taxiRequest.count({ where }),
  ]);

  return { taxiRequests, total };
};
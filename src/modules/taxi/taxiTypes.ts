export const TAXI_REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TaxiRequestStatus = (typeof TAXI_REQUEST_STATUSES)[number];

export interface Driver {
  id: string;
  name: string;
  phone: string;
  whatsappNumber: string;
  serviceArea: string;
  vehicleType: string;
  vehicleDetails: string | null;
  profileImage: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxiRequest {
  id: string;
  driverId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  destination: string;
  notes: string | null;
  status: TaxiRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxiRequestWithDriver extends TaxiRequest {
  driver: Driver;
}

export interface TaxiWhatsApp {
  whatsappNumber: string;
  message: string;
  url: string;
}

export interface TaxiRequestDetails extends TaxiRequestWithDriver {
  whatsapp: TaxiWhatsApp | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDrivers {
  drivers: Driver[];
  pagination: Pagination;
}

export interface PaginatedTaxiRequests {
  taxiRequests: TaxiRequestWithDriver[];
  pagination: Pagination;
}

export interface CreateTaxiRequestInput {
  driverId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  destination: string;
  notes?: string | null;
}

export interface CreateTaxiRequestData {
  driverId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  destination: string;
  notes: string | null;
}

export interface UpdateDriverAvailabilityInput {
  isAvailable: boolean;
}

export interface ListDriversQuery {
  serviceArea?: string;
  vehicleType?: string;
  page: number;
  limit: number;
}

export interface ListTaxiRequestsQuery {
  status?: TaxiRequestStatus;
  driverId?: string;
  page: number;
  limit: number;
}
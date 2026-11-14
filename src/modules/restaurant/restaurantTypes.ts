export type RestaurantStatus = "OPEN" | "CLOSED" | "INACTIVE";

export type OpeningHours = Record<string, string>;

export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  whatsappNumber: string | null;
  email: string | null;
  openingHours: unknown;
  coverImage: string | null;
  status: RestaurantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerRestaurant extends PublicRestaurant {
  ownerId: string;
}

export interface CreateRestaurantInput {
  name: string;
  description?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
  openingHours?: OpeningHours | null;
  coverImage?: string | null;
}

export interface UpdateRestaurantInput {
  name?: string;
  description?: string | null;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string;
  whatsappNumber?: string | null;
  email?: string | null;
  openingHours?: OpeningHours | null;
  coverImage?: string | null;
}

export interface CreateRestaurantData extends CreateRestaurantInput {
  ownerId: string;
  slug: string;
}

export interface UpdateStatusInput {
  status: "OPEN" | "CLOSED";
}
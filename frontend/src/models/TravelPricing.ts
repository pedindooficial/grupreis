import { Types } from "mongoose";

export type PricingType = "per_km" | "fixed";

export interface TravelPricing {
  _id?: Types.ObjectId;
  upToKm?: number; // null for "Acima de X km"
  pricePerKm?: number; // for per_km type
  fixedPrice?: number; // for fixed type
  type: PricingType;
  description: string; // e.g., "Até 50km", "Acima de 100km"
  roundTrip: boolean; // ida e volta
  order: number; // for sorting
  createdAt?: Date;
  updatedAt?: Date;
}


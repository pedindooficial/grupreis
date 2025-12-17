import { Model, Schema, model, models } from "mongoose";

export type PricingType = "per_km" | "fixed";

export interface TravelPricing {
  _id?: any;
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

const TravelPricingSchema = new Schema<TravelPricing>(
  {
    upToKm: { type: Number, min: 0 },
    pricePerKm: { type: Number, min: 0 },
    fixedPrice: { type: Number, min: 0 },
    type: { type: String, enum: ["per_km", "fixed"], required: true },
    description: { type: String, required: true, trim: true },
    roundTrip: { type: Boolean, required: true, default: true },
    order: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

TravelPricingSchema.index({ order: 1 });

const TravelPricingModel = (models.TravelPricing as Model<TravelPricing>) || 
  model<TravelPricing>("TravelPricing", TravelPricingSchema);

export default TravelPricingModel;


import { Model, Schema, model, models } from "mongoose";

export interface LocationCapture {
  _id?: string;
  token: string;
  description?: string;
  // What this location is for
  resourceType?: "job" | "client" | "team" | "other";
  resourceId?: Schema.Types.ObjectId | string;
  // Captured location
  latitude?: number;
  longitude?: number;
  address?: string;
  // Detailed address components
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  capturedAt?: Date;
  capturedBy?: string; // IP or user identifier
  // Status
  status: "pending" | "captured" | "expired";
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const LocationCaptureSchema = new Schema<LocationCapture>(
  {
    token: { type: String, required: true, unique: true, index: true },
    description: { type: String, trim: true },
    resourceType: { 
      type: String, 
      enum: ["job", "client", "team", "other"],
      default: "other"
    },
    resourceId: { type: Schema.Types.ObjectId },
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, trim: true },
    // Detailed address components
    addressStreet: { type: String, trim: true },
    addressNumber: { type: String, trim: true },
    addressNeighborhood: { type: String, trim: true },
    addressCity: { type: String, trim: true },
    addressState: { type: String, trim: true },
    addressZip: { type: String, trim: true },
    capturedAt: { type: Date },
    capturedBy: { type: String, trim: true },
    status: { 
      type: String, 
      enum: ["pending", "captured", "expired"],
      default: "pending"
    },
    expiresAt: { type: Date }
  },
  { timestamps: true }
);

// Index for cleanup of expired tokens
LocationCaptureSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LocationCaptureModel =
  (models.LocationCapture as Model<LocationCapture>) ||
  model<LocationCapture>("LocationCapture", LocationCaptureSchema);

export default LocationCaptureModel;

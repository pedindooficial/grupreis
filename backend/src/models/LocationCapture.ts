import { Model, Schema, model, models } from "mongoose";

export interface LocationCapture {
  token: string;
  clientId: string;
  addressIndex?: number; // Índice do endereço no array de endereços do cliente, ou undefined se for novo
  latitude?: number;
  longitude?: number;
  // Dados do endereço obtidos via geocoding reverso
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  address?: string; // Endereço completo formatado
  capturedAt?: Date;
  expiresAt: Date;
  createdAt?: Date;
}

const LocationCaptureSchema = new Schema<LocationCapture>(
  {
    token: { type: String, required: true, unique: true },
    clientId: { type: String, required: true, index: true },
    addressIndex: { type: Number },
    latitude: { type: Number },
    longitude: { type: Number },
    addressStreet: { type: String },
    addressNumber: { type: String },
    addressNeighborhood: { type: String },
    addressCity: { type: String },
    addressState: { type: String },
    addressZip: { type: String },
    address: { type: String },
    capturedAt: { type: Date },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// Índice TTL para expiração automática após a data expiresAt
LocationCaptureSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LocationCaptureModel =
  (models.LocationCapture as Model<LocationCapture>) ||
  model<LocationCapture>("LocationCapture", LocationCaptureSchema);

export default LocationCaptureModel;


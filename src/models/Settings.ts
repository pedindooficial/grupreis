import { Model, Schema, model, models } from "mongoose";

export interface Settings {
  companyName?: string;
  headquartersAddress?: string;
  headquartersStreet?: string;
  headquartersNumber?: string;
  headquartersNeighborhood?: string;
  headquartersCity?: string;
  headquartersState?: string;
  headquartersZip?: string;
  phone?: string;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SettingsSchema = new Schema<Settings>(
  {
    companyName: { type: String, trim: true },
    headquartersAddress: { type: String, trim: true },
    headquartersStreet: { type: String, trim: true },
    headquartersNumber: { type: String, trim: true },
    headquartersNeighborhood: { type: String, trim: true },
    headquartersCity: { type: String, trim: true },
    headquartersState: { type: String, trim: true },
    headquartersZip: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true }
  },
  { timestamps: true }
);

// Garantir que só existe um documento de configurações
SettingsSchema.index({}, { unique: true });

const SettingsModel = (models.Settings as Model<Settings>) || model<Settings>("Settings", SettingsSchema);

export default SettingsModel;


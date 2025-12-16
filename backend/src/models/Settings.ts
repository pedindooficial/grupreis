import { Model, Schema, model, models } from "mongoose";
import type { Settings } from "../../../../src/models/Settings";

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
    email: { type: String, trim: true, lowercase: true },
    companySignature: { type: String } // Base64 encoded signature image
  },
  { timestamps: true }
);

// Garantir que só existe um documento de configurações
SettingsSchema.index({}, { unique: true });

const SettingsModel =
  (models.Settings as Model<Settings>) ||
  model<Settings>("Settings", SettingsSchema);

export default SettingsModel;



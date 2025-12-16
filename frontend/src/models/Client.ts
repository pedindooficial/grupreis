import { Model, Schema, model, models } from "mongoose";

export interface Client {
  name: string;
  personType?: "cpf" | "cnpj";
  docNumber?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientSchema = new Schema<Client>(
  {
    name: { type: String, required: true, trim: true },
    personType: { type: String, enum: ["cpf", "cnpj"], default: "cpf" },
    docNumber: { type: String, trim: true },
    contact: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    addressStreet: { type: String, trim: true },
    addressNumber: { type: String, trim: true },
    addressNeighborhood: { type: String, trim: true },
    addressCity: { type: String, trim: true },
    addressState: { type: String, trim: true },
    addressZip: { type: String, trim: true }
  },
  { timestamps: true }
);

ClientSchema.index({ docNumber: 1 }, { unique: false, sparse: true });
ClientSchema.index(
  { personType: 1, docNumber: 1 },
  { unique: true, sparse: true }
);

const ClientModel =
  (models.Client as Model<Client>) || model<Client>("Client", ClientSchema);

export default ClientModel;


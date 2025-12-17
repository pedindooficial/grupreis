import { Model, Schema, model, models } from "mongoose";

export interface ClientAddress {
  _id?: string;
  label?: string; // Nome/etiqueta do endereço (ex: "Casa", "Escritório", "Obra 1")
  address?: string; // Endereço completo formatado
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  latitude?: number; // Latitude do endereço
  longitude?: number; // Longitude do endereço
}

export interface Client {
  name: string;
  personType?: "cpf" | "cnpj";
  docNumber?: string;
  contact?: string;
  phone?: string;
  email?: string;
  // Campos legados para compatibilidade
  address?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  // Novo campo: array de endereços
  addresses?: ClientAddress[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientAddressSchema = new Schema<ClientAddress>(
  {
    label: { type: String, trim: true }, // Nome/etiqueta do endereço (ex: "Casa", "Escritório", "Obra 1")
    address: { type: String, trim: true }, // Endereço completo formatado
    addressStreet: { type: String, trim: true },
    addressNumber: { type: String, trim: true },
    addressNeighborhood: { type: String, trim: true },
    addressCity: { type: String, trim: true },
    addressState: { type: String, trim: true },
    addressZip: { type: String, trim: true },
    latitude: { type: Number }, // Latitude do endereço
    longitude: { type: Number } // Longitude do endereço
  },
  { _id: true }
);

const ClientSchema = new Schema<Client>(
  {
    name: { type: String, required: true, trim: true },
    personType: { type: String, enum: ["cpf", "cnpj"], default: "cpf" },
    docNumber: { type: String, trim: true },
    contact: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    // Manter campos legados para compatibilidade durante migração
    address: { type: String, trim: true },
    addressStreet: { type: String, trim: true },
    addressNumber: { type: String, trim: true },
    addressNeighborhood: { type: String, trim: true },
    addressCity: { type: String, trim: true },
    addressState: { type: String, trim: true },
    addressZip: { type: String, trim: true },
    // Novo campo: array de endereços
    addresses: { type: [ClientAddressSchema], default: [] }
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

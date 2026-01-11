import { Model, Schema, model, models } from "mongoose";
import bcrypt from "bcryptjs";

// Tipos para endereço de cliente
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

// Tipo para cliente
export interface Client {
  name: string;
  personType?: "cpf" | "cnpj";
  docNumber?: string;
  contact?: string;
  phone?: string;
  email?: string;
  password?: string; // Password for client login
  passwordResetToken?: string; // Token for password reset
  passwordResetExpires?: Date; // Expiration date for password reset token
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
    password: { type: String, select: false }, // Don't include password in queries by default
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
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

// Hash password before saving
ClientSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (!this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
  next();
});

// Method to compare password
ClientSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password as string);
};

ClientSchema.index({ docNumber: 1 }, { unique: false, sparse: true });
ClientSchema.index(
  { personType: 1, docNumber: 1 },
  { unique: true, sparse: true }
);
ClientSchema.index({ email: 1 }, { unique: false, sparse: true });
ClientSchema.index({ passwordResetToken: 1 });

const ClientModel =
  (models.Client as Model<Client>) || model<Client>("Client", ClientSchema);

export default ClientModel;



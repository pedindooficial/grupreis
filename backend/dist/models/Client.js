"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ClientAddressSchema = new mongoose_1.Schema({
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
}, { _id: true });
const ClientSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
// Hash password before saving
ClientSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    if (!this.password)
        return next();
    const salt = await bcryptjs_1.default.genSalt(10);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
    next();
});
// Method to compare password
ClientSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
ClientSchema.index({ docNumber: 1 }, { unique: false, sparse: true });
ClientSchema.index({ personType: 1, docNumber: 1 }, { unique: true, sparse: true });
ClientSchema.index({ email: 1 }, { unique: false, sparse: true });
ClientSchema.index({ passwordResetToken: 1 });
const ClientModel = mongoose_1.models.Client || (0, mongoose_1.model)("Client", ClientSchema);
exports.default = ClientModel;

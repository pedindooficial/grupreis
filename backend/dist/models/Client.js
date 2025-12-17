"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
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
ClientSchema.index({ docNumber: 1 }, { unique: false, sparse: true });
ClientSchema.index({ personType: 1, docNumber: 1 }, { unique: true, sparse: true });
const ClientModel = mongoose_1.models.Client || (0, mongoose_1.model)("Client", ClientSchema);
exports.default = ClientModel;

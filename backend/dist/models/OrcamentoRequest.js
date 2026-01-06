"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const OrcamentoRequestServiceSchema = new mongoose_1.Schema({
    serviceType: { type: String, required: true, trim: true },
    serviceTypeOther: { type: String, trim: true },
    serviceId: { type: String, trim: true }, // Catalog service ID
    serviceName: { type: String, trim: true }, // Catalog service name
    diameter: { type: String, trim: true },
    depth: { type: String, trim: true },
    depthOther: { type: String, trim: true },
    quantity: { type: String, trim: true },
    quantityOther: { type: String, trim: true }
}, { _id: false });
const OrcamentoRequestSchema = new mongoose_1.Schema({
    seq: { type: Number },
    // Client data
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    latitude: { type: Number }, // Latitude for precise location
    longitude: { type: Number }, // Longitude for precise location
    locationType: { type: String, trim: true },
    soilType: { type: String, trim: true },
    access: { type: String, trim: true },
    deadline: { type: String, trim: true },
    sptDiagnostic: { type: String, trim: true },
    // Services
    services: { type: [OrcamentoRequestServiceSchema], required: true, default: [] },
    // Status and metadata
    status: {
        type: String,
        enum: ["pendente", "em_contato", "convertido", "descartado"],
        default: "pendente"
    },
    notes: { type: String, trim: true },
    // Conversion tracking
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Client", default: null },
    budgetId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Budget", default: null },
    jobId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Job", default: null },
    // Source tracking
    source: { type: String, trim: true, default: "website" }
}, { timestamps: true });
OrcamentoRequestSchema.index({ seq: 1 });
OrcamentoRequestSchema.index({ status: 1 });
OrcamentoRequestSchema.index({ createdAt: -1 });
OrcamentoRequestSchema.index({ phone: 1 });
OrcamentoRequestSchema.index({ email: 1 });
// Geospatial index for location queries (2dsphere index for lat/lng)
OrcamentoRequestSchema.index({ longitude: 1, latitude: 1 });
const OrcamentoRequestModel = mongoose_1.models.OrcamentoRequest ||
    (0, mongoose_1.model)("OrcamentoRequest", OrcamentoRequestSchema);
exports.default = OrcamentoRequestModel;

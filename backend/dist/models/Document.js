"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const DocumentSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ["contrato", "proposta", "nota_fiscal", "recibo", "outro"],
        required: true
    },
    status: {
        type: String,
        enum: ["pendente", "assinado", "cancelado", "arquivado"],
        default: "pendente"
    },
    description: { type: String, trim: true },
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Client" },
    clientName: { type: String, trim: true },
    jobId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Job" },
    jobTitle: { type: String, trim: true },
    fileKey: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    fileType: { type: String, required: true, trim: true },
    signedAt: { type: Date },
    expiresAt: { type: Date },
    notes: { type: String, trim: true }
}, { timestamps: true });
DocumentSchema.index({ clientId: 1 });
DocumentSchema.index({ jobId: 1 });
DocumentSchema.index({ type: 1, status: 1 });
DocumentSchema.index({ createdAt: -1 });
const DocumentModel = mongoose_1.models.Document || (0, mongoose_1.model)("Document", DocumentSchema);
exports.default = DocumentModel;

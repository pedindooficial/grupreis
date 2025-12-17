"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const AuditSchema = new mongoose_1.Schema({
    action: {
        type: String,
        enum: ["create", "update", "delete", "view", "download", "login", "logout", "upload", "other"],
        required: true
    },
    resource: {
        type: String,
        enum: ["document", "user", "client", "job", "employee", "team", "machine", "equipment", "transaction", "cashier", "file", "other"],
        required: true
    },
    resourceId: { type: String, trim: true },
    resourceName: { type: String, trim: true },
    userId: { type: String, trim: true },
    userEmail: { type: String, trim: true },
    userName: { type: String, trim: true },
    details: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    metadata: { type: mongoose_1.Schema.Types.Mixed }
}, { timestamps: true });
AuditSchema.index({ createdAt: -1 });
AuditSchema.index({ userId: 1, createdAt: -1 });
AuditSchema.index({ resource: 1, resourceId: 1 });
AuditSchema.index({ action: 1, createdAt: -1 });
const AuditModel = mongoose_1.models.Audit || (0, mongoose_1.model)("Audit", AuditSchema);
exports.default = AuditModel;

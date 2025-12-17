"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const LocationCaptureSchema = new mongoose_1.Schema({
    token: { type: String, required: true, unique: true, index: true },
    description: { type: String, trim: true },
    resourceType: {
        type: String,
        enum: ["job", "client", "team", "other"],
        default: "other"
    },
    resourceId: { type: mongoose_1.Schema.Types.ObjectId },
    addressId: { type: String, trim: true }, // ID of the specific address in client's addresses array
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, trim: true },
    // Detailed address components
    addressStreet: { type: String, trim: true },
    addressNumber: { type: String, trim: true },
    addressNeighborhood: { type: String, trim: true },
    addressCity: { type: String, trim: true },
    addressState: { type: String, trim: true },
    addressZip: { type: String, trim: true },
    capturedAt: { type: Date },
    capturedBy: { type: String, trim: true },
    status: {
        type: String,
        enum: ["pending", "captured", "expired"],
        default: "pending"
    },
    expiresAt: { type: Date }
}, { timestamps: true });
// Index for cleanup of expired tokens
LocationCaptureSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const LocationCaptureModel = mongoose_1.models.LocationCapture ||
    (0, mongoose_1.model)("LocationCapture", LocationCaptureSchema);
exports.default = LocationCaptureModel;

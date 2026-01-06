"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const TravelPricingSchema = new mongoose_1.Schema({
    upToKm: { type: Number, min: 0 },
    pricePerKm: { type: Number, min: 0 },
    fixedPrice: { type: Number, min: 0 },
    type: { type: String, enum: ["per_km", "fixed"], required: true },
    description: { type: String, required: true, trim: true },
    roundTrip: { type: Boolean, required: true, default: true },
    order: { type: Number, required: true, default: 0 },
    isDefault: { type: Boolean, required: true, default: false }
}, { timestamps: true });
TravelPricingSchema.index({ order: 1 });
const TravelPricingModel = mongoose_1.models.TravelPricing ||
    (0, mongoose_1.model)("TravelPricing", TravelPricingSchema);
exports.default = TravelPricingModel;

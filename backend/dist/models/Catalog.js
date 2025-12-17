"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const PriceVariationSchema = new mongoose_1.Schema({
    diameter: { type: Number, required: true, min: 0 },
    soilType: {
        type: String,
        enum: ["argiloso", "arenoso", "rochoso", "misturado", "outro"],
        required: true
    },
    access: {
        type: String,
        enum: ["livre", "limitado", "restrito"],
        required: true
    },
    price: { type: Number, required: true, min: 0 },
    executionTime: { type: Number, min: 0 } // minutes per meter
}, { _id: false });
const CatalogSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    photos: [{ type: String, trim: true }],
    priceVariations: {
        type: [PriceVariationSchema],
        required: true,
        validate: {
            validator: (variations) => variations.length > 0,
            message: "Pelo menos uma variação de preço é obrigatória"
        }
    },
    active: { type: Boolean, default: true }
}, { timestamps: true });
// Index for searching
CatalogSchema.index({ name: "text", description: "text", category: "text" });
CatalogSchema.index({ active: 1 });
CatalogSchema.index({ category: 1 });
const CatalogModel = mongoose_1.models.Catalog || (0, mongoose_1.model)("Catalog", CatalogSchema);
exports.default = CatalogModel;

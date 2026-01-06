"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SocialMediaSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ["image", "video"],
        required: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    order: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
SocialMediaSchema.index({ order: 1, active: 1 });
SocialMediaSchema.index({ type: 1 });
const SocialMediaModel = mongoose_1.models.SocialMedia ||
    (0, mongoose_1.model)("SocialMedia", SocialMediaSchema);
exports.default = SocialMediaModel;

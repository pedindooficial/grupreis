"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const LocationCapture_1 = __importDefault(require("../models/LocationCapture"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Validation schemas
const createTokenSchema = zod_1.z.object({
    description: zod_1.z.string().optional(),
    resourceType: zod_1.z.enum(["job", "client", "team", "other"]).optional(),
    resourceId: zod_1.z.string().optional(),
    addressId: zod_1.z.string().optional(), // ID of the specific address in client's addresses array
    expiresInHours: zod_1.z.number().min(1).max(720).optional().default(24) // Default 24h
});
const saveLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    address: zod_1.z.string().optional(),
    addressStreet: zod_1.z.string().optional(),
    addressNumber: zod_1.z.string().optional(),
    addressNeighborhood: zod_1.z.string().optional(),
    addressCity: zod_1.z.string().optional(),
    addressState: zod_1.z.string().optional(),
    addressZip: zod_1.z.string().optional()
});
// Generate a new location capture token
router.post("/create", async (req, res) => {
    try {
        const parsed = createTokenSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Dados inválidos",
                issues: parsed.error.flatten()
            });
        }
        await (0, db_1.connectDB)();
        // Generate unique token
        const token = crypto_1.default.randomBytes(32).toString("hex");
        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + parsed.data.expiresInHours);
        const locationCapture = await LocationCapture_1.default.create({
            token,
            description: parsed.data.description,
            resourceType: parsed.data.resourceType || "other",
            resourceId: parsed.data.resourceId,
            addressId: parsed.data.addressId,
            status: "pending",
            expiresAt
        });
        res.status(201).json({
            data: {
                _id: locationCapture._id,
                token: locationCapture.token,
                url: `/location-capture/${locationCapture.token}`,
                expiresAt: locationCapture.expiresAt
            }
        });
    }
    catch (error) {
        console.error("POST /api/location-capture/create error", error);
        res.status(500).json({ error: "Falha ao criar token de captura" });
    }
});
// Validate token and get info
router.get("/validate/:token", async (req, res) => {
    try {
        const { token } = req.params;
        await (0, db_1.connectDB)();
        const locationCapture = await LocationCapture_1.default.findOne({ token }).lean();
        if (!locationCapture) {
            return res.status(404).json({ error: "Token não encontrado" });
        }
        // Check if expired
        if (locationCapture.expiresAt && new Date() > new Date(locationCapture.expiresAt)) {
            await LocationCapture_1.default.updateOne({ token }, { status: "expired" });
            return res.status(400).json({ error: "Token expirado" });
        }
        // Check if already captured
        if (locationCapture.status === "captured") {
            return res.status(400).json({
                error: "Este link já foi usado",
                capturedAt: locationCapture.capturedAt
            });
        }
        res.json({
            data: {
                description: locationCapture.description,
                resourceType: locationCapture.resourceType,
                status: locationCapture.status,
                expiresAt: locationCapture.expiresAt
            }
        });
    }
    catch (error) {
        console.error(`GET /api/location-capture/validate/${req.params.token} error`, error);
        res.status(500).json({ error: "Falha ao validar token" });
    }
});
// Parse Google Maps address components
function parseAddressComponents(addressComponents) {
    const parsed = {};
    for (const component of addressComponents) {
        const types = component.types;
        if (types.includes("route")) {
            parsed.street = component.long_name;
        }
        else if (types.includes("street_number")) {
            parsed.number = component.long_name;
        }
        else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
            parsed.neighborhood = component.long_name;
        }
        else if (types.includes("administrative_area_level_2")) {
            parsed.city = component.long_name;
        }
        else if (types.includes("administrative_area_level_1")) {
            parsed.state = component.short_name;
        }
        else if (types.includes("postal_code")) {
            parsed.zip = component.long_name;
        }
    }
    return parsed;
}
// GET /:token - Alias for /validate/:token (for frontend compatibility)
router.get("/:token", async (req, res) => {
    try {
        const { token } = req.params;
        await (0, db_1.connectDB)();
        const locationCapture = await LocationCapture_1.default.findOne({ token }).lean();
        if (!locationCapture) {
            return res.status(404).json({ error: "Token não encontrado", status: "invalid" });
        }
        // Check if expired
        if (locationCapture.expiresAt && new Date() > new Date(locationCapture.expiresAt)) {
            await LocationCapture_1.default.updateOne({ token }, { status: "expired" });
            return res.status(400).json({ error: "Token expirado", status: "expired" });
        }
        // Check if already captured
        if (locationCapture.status === "captured") {
            return res.status(400).json({
                error: "Este link já foi usado",
                status: "captured",
                capturedAt: locationCapture.capturedAt
            });
        }
        res.json({ data: locationCapture });
    }
    catch (error) {
        console.error(`GET /api/location-capture/${req.params.token} error`, error);
        res.status(500).json({ error: "Falha ao buscar token" });
    }
});
// Save captured location
router.post("/:token/capture", async (req, res) => {
    try {
        const { token } = req.params;
        const parsed = saveLocationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Dados inválidos",
                issues: parsed.error.flatten()
            });
        }
        await (0, db_1.connectDB)();
        const locationCapture = await LocationCapture_1.default.findOne({ token });
        if (!locationCapture) {
            return res.status(404).json({ error: "Token não encontrado" });
        }
        // Check if expired
        if (locationCapture.expiresAt && new Date() > new Date(locationCapture.expiresAt)) {
            locationCapture.status = "expired";
            await locationCapture.save();
            return res.status(400).json({ error: "Token expirado", status: "expired" });
        }
        // Check if already captured
        if (locationCapture.status === "captured") {
            return res.status(400).json({
                error: "Este link já foi usado",
                status: "captured",
                capturedAt: locationCapture.capturedAt
            });
        }
        // Update with captured location
        locationCapture.latitude = parsed.data.latitude;
        locationCapture.longitude = parsed.data.longitude;
        locationCapture.address = parsed.data.address;
        locationCapture.addressStreet = parsed.data.addressStreet;
        locationCapture.addressNumber = parsed.data.addressNumber;
        locationCapture.addressNeighborhood = parsed.data.addressNeighborhood;
        locationCapture.addressCity = parsed.data.addressCity;
        locationCapture.addressState = parsed.data.addressState;
        locationCapture.addressZip = parsed.data.addressZip;
        locationCapture.status = "captured";
        locationCapture.capturedAt = new Date();
        locationCapture.capturedBy = req.ip || req.headers["x-forwarded-for"] || "unknown";
        await locationCapture.save();
        // If linked to a client, update client address
        if (locationCapture.resourceType === "client" && locationCapture.resourceId) {
            try {
                const ClientModel = (await Promise.resolve().then(() => __importStar(require("../models/Client")))).default;
                const client = await ClientModel.findById(locationCapture.resourceId);
                if (client) {
                    // Build full address string
                    const fullAddress = [
                        parsed.data.addressStreet,
                        parsed.data.addressNumber,
                        parsed.data.addressNeighborhood,
                        parsed.data.addressCity,
                        parsed.data.addressState,
                        parsed.data.addressZip
                    ].filter(Boolean).join(", ");
                    // If addressId is provided, update specific address in array
                    if (locationCapture.addressId && client.addresses && Array.isArray(client.addresses)) {
                        const addressIndex = client.addresses.findIndex((addr) => addr._id && addr._id.toString() === locationCapture.addressId);
                        if (addressIndex !== -1) {
                            // Update the specific address
                            client.addresses[addressIndex] = {
                                ...client.addresses[addressIndex],
                                address: fullAddress || parsed.data.address || "",
                                addressStreet: parsed.data.addressStreet,
                                addressNumber: parsed.data.addressNumber,
                                addressNeighborhood: parsed.data.addressNeighborhood,
                                addressCity: parsed.data.addressCity,
                                addressState: parsed.data.addressState,
                                addressZip: parsed.data.addressZip,
                                latitude: parsed.data.latitude,
                                longitude: parsed.data.longitude,
                            };
                            console.log(`✅ Client ${client._id} address ${locationCapture.addressId} updated via location capture`);
                        }
                        else {
                            console.warn(`⚠️ Address ${locationCapture.addressId} not found in client ${client._id}`);
                        }
                    }
                    else {
                        // No addressId provided: CREATE a new address in the addresses array
                        const newAddress = {
                            label: `Endereço ${(client.addresses?.length || 0) + 1}`,
                            address: fullAddress || parsed.data.address || "",
                            addressStreet: parsed.data.addressStreet,
                            addressNumber: parsed.data.addressNumber,
                            addressNeighborhood: parsed.data.addressNeighborhood,
                            addressCity: parsed.data.addressCity,
                            addressState: parsed.data.addressState,
                            addressZip: parsed.data.addressZip,
                            latitude: parsed.data.latitude,
                            longitude: parsed.data.longitude,
                        };
                        // Initialize addresses array if it doesn't exist
                        if (!client.addresses) {
                            client.addresses = [];
                        }
                        // Add the new address
                        client.addresses.push(newAddress);
                        console.log(`✅ Client ${client._id} NEW address added via location capture`);
                        console.log(`📍 Total addresses: ${client.addresses.length}`);
                    }
                    await client.save();
                }
            }
            catch (clientError) {
                console.error("Error updating client address:", clientError);
                // Don't fail the whole request if client update fails
            }
        }
        res.json({
            data: {
                message: "Localização salva com sucesso",
                latitude: locationCapture.latitude,
                longitude: locationCapture.longitude,
                address: locationCapture.address,
                capturedAt: locationCapture.capturedAt,
                resourceType: locationCapture.resourceType,
                resourceId: locationCapture.resourceId
            }
        });
    }
    catch (error) {
        console.error(`POST /api/location-capture/${req.params.token}/capture error`, error);
        res.status(500).json({ error: "Falha ao salvar localização", detail: error.message });
    }
});
// Get all location captures (admin)
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const captures = await LocationCapture_1.default.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json({ data: captures });
    }
    catch (error) {
        console.error("GET /api/location-capture error", error);
        res.status(500).json({ error: "Falha ao buscar capturas" });
    }
});
// Delete location capture (admin)
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await (0, db_1.connectDB)();
        const capture = await LocationCapture_1.default.findByIdAndDelete(id);
        if (!capture) {
            return res.status(404).json({ error: "Captura não encontrada" });
        }
        res.json({ data: { message: "Captura excluída com sucesso" } });
    }
    catch (error) {
        console.error(`DELETE /api/location-capture/${req.params.id} error`, error);
        res.status(500).json({ error: "Falha ao excluir captura" });
    }
});
exports.default = router;

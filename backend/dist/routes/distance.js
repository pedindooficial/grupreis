"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Settings_1 = __importDefault(require("../models/Settings"));
const TravelPricing_1 = __importDefault(require("../models/TravelPricing"));
const router = (0, express_1.Router)();
const calculateDistanceSchema = zod_1.z.object({
    clientAddress: zod_1.z.string().min(1, "Endereço do cliente é obrigatório")
});
// Helper to normalize address format for Google Maps
function normalizeAddress(address) {
    if (!address)
        return "";
    // Replace " | " with ", " for better Google Maps compatibility
    let normalized = address.replace(/\s*\|\s*/g, ", ");
    // Remove multiple consecutive commas
    normalized = normalized.replace(/,+/g, ",");
    // Remove leading/trailing commas and spaces
    normalized = normalized.replace(/^[,\s]+|[,\s]+$/g, "");
    return normalized;
}
// Calculate distance and travel price
router.post("/calculate", async (req, res) => {
    try {
        console.log("Recebido body:", req.body);
        const parsed = calculateDistanceSchema.safeParse(req.body);
        if (!parsed.success) {
            console.error("Erro de validação:", parsed.error.flatten());
            return res.status(400).json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Get company address from settings
        const settings = await Settings_1.default.findOne().lean();
        console.log("Settings encontrado:", settings ? "Sim" : "Não");
        if (!settings || !settings.headquartersAddress) {
            return res.status(400).json({
                error: "Endereço da empresa não configurado. Configure em Configurações."
            });
        }
        // Normalize addresses for better Google Maps compatibility
        const companyAddress = normalizeAddress(settings.headquartersAddress);
        const clientAddress = normalizeAddress(parsed.data.clientAddress);
        console.log("Endereço da empresa (normalizado):", companyAddress);
        console.log("Endereço do cliente (normalizado):", clientAddress);
        console.log("Endereço empresa:", companyAddress);
        console.log("Endereço cliente:", clientAddress);
        // Use Google Maps Distance Matrix API
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: "Google Maps API Key não configurada no servidor"
            });
        }
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(companyAddress)}&destinations=${encodeURIComponent(clientAddress)}&mode=driving&language=pt-BR&key=${apiKey}`;
        console.log("URL Google Maps:", url);
        const response = await fetch(url);
        const data = await response.json();
        console.log("Resposta Google Maps:", JSON.stringify(data, null, 2));
        if (data.status !== "OK") {
            console.error("Erro Google Maps status:", data.status, data.error_message);
            // Check for specific API not enabled error
            if (data.error_message && data.error_message.includes("LegacyApiNotActivatedMapError")) {
                return res.status(400).json({
                    error: "Distance Matrix API não está ativada",
                    detail: "Ative a Distance Matrix API no Google Cloud Console: https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com"
                });
            }
            return res.status(400).json({
                error: "Não foi possível calcular a distância",
                detail: data.error_message || data.status
            });
        }
        const element = data.rows?.[0]?.elements?.[0];
        console.log("Elemento da rota:", element);
        if (!element || element.status !== "OK") {
            console.error("Erro no elemento da rota:", element?.status);
            let errorMessage = "Não foi possível calcular a rota";
            let errorDetail = element?.status || "Rota não encontrada";
            if (element?.status === "NOT_FOUND") {
                errorMessage = "Endereço não encontrado";
                errorDetail = `O Google Maps não conseguiu localizar um dos endereços:\n\n` +
                    `📍 Empresa: ${companyAddress}\n\n` +
                    `📍 Cliente: ${clientAddress}\n\n` +
                    `Verifique se os endereços estão completos e corretos.`;
            }
            else if (element?.status === "ZERO_RESULTS") {
                errorMessage = "Nenhuma rota encontrada";
                errorDetail = `Não foi possível encontrar uma rota entre os endereços informados.`;
            }
            return res.status(400).json({
                error: errorMessage,
                detail: errorDetail,
                companyAddress,
                clientAddress
            });
        }
        // Distance in meters, convert to km
        if (!element.distance || !element.duration) {
            return res.status(400).json({
                error: "Não foi possível calcular a distância",
                detail: "Dados incompletos da API do Google Maps"
            });
        }
        const distanceMeters = element.distance.value;
        const distanceKm = Math.round(distanceMeters / 1000); // Round to nearest km
        const durationSeconds = element.duration.value;
        const durationText = element.duration.text;
        // Get travel pricing rules
        const pricingRules = await TravelPricing_1.default.find().sort({ order: 1 }).lean();
        let selectedRule = null;
        let travelPrice = 0;
        let travelDescription = "";
        // Find matching rule
        let defaultRule = null;
        for (const rule of pricingRules) {
            // Track default rule for fallback
            if (rule.isDefault) {
                defaultRule = rule;
            }
            if (rule.upToKm === null || rule.upToKm === undefined) {
                // Rule applies to any distance (but not if it's the default - we want specific rules first)
                if (!rule.isDefault) {
                    selectedRule = rule;
                    break;
                }
            }
            else if (distanceKm <= rule.upToKm) {
                selectedRule = rule;
                break;
            }
        }
        // If no specific rule found, use default rule
        if (!selectedRule && defaultRule) {
            selectedRule = defaultRule;
        }
        if (selectedRule) {
            if (selectedRule.type === "per_km") {
                const basePrice = distanceKm * (selectedRule.pricePerKm || 0);
                // Multiply by 2 for round trip (ida e volta)
                travelPrice = selectedRule.roundTrip ? basePrice * 2 : basePrice;
                travelDescription = `${distanceKm}km × R$ ${selectedRule.pricePerKm?.toFixed(2)}/km${selectedRule.roundTrip ? " × 2 (ida e volta)" : ""}${selectedRule.isDefault ? " (padrão)" : ""}`;
            }
            else if (selectedRule.type === "fixed") {
                const basePrice = selectedRule.fixedPrice || 0;
                // Multiply by 2 for round trip (ida e volta) if applicable
                travelPrice = selectedRule.roundTrip ? basePrice * 2 : basePrice;
                travelDescription = `${selectedRule.description}${selectedRule.roundTrip ? " × 2 (ida e volta)" : ""}${selectedRule.isDefault ? " (padrão)" : ""}`;
            }
        }
        else {
            // No rule found, return 0
            travelPrice = 0;
            travelDescription = `${distanceKm}km (sem regra de preço configurada)`;
        }
        console.log("Resultado final:", {
            distanceKm,
            travelPrice,
            travelDescription
        });
        res.json({
            data: {
                distanceKm,
                distanceText: element.distance?.text || `${distanceKm} km`,
                durationSeconds,
                durationText,
                travelPrice,
                travelDescription,
                companyAddress,
                clientAddress
            }
        });
    }
    catch (error) {
        console.error("POST /api/distance/calculate error", error);
        res.status(500).json({ error: "Falha ao calcular distância", detail: error.message });
    }
});
// Reverse geocoding: convert lat/lng to address
const geocodeSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180)
});
router.post("/geocode", async (req, res) => {
    try {
        console.log("Reverse geocoding:", req.body);
        const parsed = geocodeSchema.safeParse(req.body);
        if (!parsed.success) {
            console.error("Validation error:", parsed.error.flatten());
            return res.status(400).json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        const { lat, lng } = parsed.data;
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: "Google Maps API Key não configurada no servidor"
            });
        }
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${apiKey}`;
        console.log("Calling Google Geocoding API:", url);
        const response = await fetch(url);
        const data = await response.json();
        console.log("Google Geocoding response status:", data.status);
        if (data.status !== "OK" || !data.results || data.results.length === 0) {
            console.error("Geocoding error:", data.status, data.error_message);
            return res.status(400).json({
                error: "Não foi possível obter o endereço para as coordenadas fornecidas",
                detail: data.error_message || data.status
            });
        }
        const result = data.results[0];
        const addressComponents = result.address_components;
        const formattedAddress = result.formatted_address;
        // Parse address components
        let street = "";
        let number = "";
        let neighborhood = "";
        let city = "";
        let state = "";
        let zip = "";
        for (const component of addressComponents) {
            const types = component.types;
            if (types.includes("route")) {
                street = component.long_name;
            }
            else if (types.includes("street_number")) {
                number = component.long_name;
            }
            else if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
                neighborhood = component.long_name;
            }
            else if (types.includes("administrative_area_level_2")) {
                city = component.long_name;
            }
            else if (types.includes("administrative_area_level_1")) {
                state = component.short_name;
            }
            else if (types.includes("postal_code")) {
                zip = component.long_name;
            }
        }
        // If street not found in route, try to extract from formatted_address
        if (!street && formattedAddress) {
            const parts = formattedAddress.split(",");
            if (parts.length > 0) {
                const firstPart = parts[0].trim();
                // Try to extract street name and number
                const match = firstPart.match(/^(.+?)\s*,?\s*(\d+)?$/);
                if (match) {
                    street = match[1].trim();
                    if (!number && match[2]) {
                        number = match[2].trim();
                    }
                }
                else {
                    street = firstPart;
                }
            }
        }
        console.log("Parsed address:", { street, number, neighborhood, city, state, zip });
        res.json({
            data: {
                formattedAddress,
                street,
                number,
                neighborhood,
                city,
                state,
                zip,
                latitude: lat,
                longitude: lng
            }
        });
    }
    catch (error) {
        console.error("POST /api/distance/geocode error", error);
        res.status(500).json({ error: "Falha ao obter endereço", detail: error.message });
    }
});
exports.default = router;

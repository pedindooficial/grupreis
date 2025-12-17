import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import SettingsModel from "../models/Settings";
import TravelPricingModel from "../models/TravelPricing";

const router = Router();

const calculateDistanceSchema = z.object({
  clientAddress: z.string().min(1, "Endereço do cliente é obrigatório")
});

// Calculate distance and travel price
router.post("/calculate", async (req, res) => {
  try {
    const parsed = calculateDistanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    // Get company address from settings
    const settings = await SettingsModel.findOne().lean();
    if (!settings || !settings.headquartersAddress) {
      return res.status(400).json({ 
        error: "Endereço da empresa não configurado. Configure em Configurações." 
      });
    }

    const companyAddress = settings.headquartersAddress;
    const clientAddress = parsed.data.clientAddress;

    // Use Google Maps Distance Matrix API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyAUoyCSevBWa4CkeDcBuYd-R0mbR2NtpIs";
    if (!apiKey) {
      return res.status(500).json({ 
        error: "Google Maps API Key não configurada no servidor" 
      });
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      companyAddress
    )}&destinations=${encodeURIComponent(
      clientAddress
    )}&mode=driving&language=pt-BR&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(400).json({ 
        error: "Não foi possível calcular a distância",
        detail: data.error_message || data.status
      });
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== "OK") {
      return res.status(400).json({ 
        error: "Não foi possível calcular a rota",
        detail: element?.status || "Rota não encontrada"
      });
    }

    // Distance in meters, convert to km
    const distanceMeters = element.distance.value;
    const distanceKm = Math.round(distanceMeters / 1000); // Round to nearest km
    const durationSeconds = element.duration.value;
    const durationText = element.duration.text;

    // Get travel pricing rules
    const pricingRules = await TravelPricingModel.find().sort({ order: 1 }).lean();

    let selectedRule = null;
    let travelPrice = 0;
    let travelDescription = "";

    // Find matching rule
    for (const rule of pricingRules) {
      if (rule.upToKm === null || rule.upToKm === undefined) {
        // Rule applies to any distance
        selectedRule = rule;
        break;
      } else if (distanceKm <= rule.upToKm) {
        selectedRule = rule;
        break;
      }
    }

    if (selectedRule) {
      if (selectedRule.type === "per_km") {
        travelPrice = distanceKm * (selectedRule.pricePerKm || 0);
        travelDescription = `${distanceKm}km × R$ ${selectedRule.pricePerKm?.toFixed(2)}/km${
          selectedRule.roundTrip ? " (ida e volta)" : ""
        }`;
      } else if (selectedRule.type === "fixed") {
        travelPrice = selectedRule.fixedPrice || 0;
        travelDescription = `${selectedRule.description}${
          selectedRule.roundTrip ? " (ida e volta)" : ""
        }`;
      }
    } else {
      // No rule found, return 0
      travelPrice = 0;
      travelDescription = `${distanceKm}km (sem regra de preço configurada)`;
    }

    res.json({
      data: {
        distanceKm,
        distanceText: element.distance.text,
        durationSeconds,
        durationText,
        travelPrice,
        travelDescription,
        companyAddress,
        clientAddress
      }
    });
  } catch (error: any) {
    console.error("POST /api/distance/calculate error", error);
    res.status(500).json({ error: "Falha ao calcular distância", detail: error.message });
  }
});

export default router;


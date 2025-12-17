import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import SettingsModel from "../models/Settings";
import TravelPricingModel from "../models/TravelPricing";

const router = Router();

const calculateDistanceSchema = z.object({
  clientAddress: z.string().min(1, "Endereço do cliente é obrigatório")
});

// Helper to normalize address format for Google Maps
function normalizeAddress(address: string): string {
  if (!address) return "";
  
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

    await connectDB();

    // Get company address from settings
    const settings = await SettingsModel.findOne().lean();
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

    const element = data.rows[0]?.elements[0];
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
      } else if (element?.status === "ZERO_RESULTS") {
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
        const basePrice = distanceKm * (selectedRule.pricePerKm || 0);
        // Multiply by 2 for round trip (ida e volta)
        travelPrice = selectedRule.roundTrip ? basePrice * 2 : basePrice;
        travelDescription = `${distanceKm}km × R$ ${selectedRule.pricePerKm?.toFixed(2)}/km${
          selectedRule.roundTrip ? " × 2 (ida e volta)" : ""
        }`;
      } else if (selectedRule.type === "fixed") {
        const basePrice = selectedRule.fixedPrice || 0;
        // Multiply by 2 for round trip (ida e volta) if applicable
        travelPrice = selectedRule.roundTrip ? basePrice * 2 : basePrice;
        travelDescription = `${selectedRule.description}${
          selectedRule.roundTrip ? " × 2 (ida e volta)" : ""
        }`;
      }
    } else {
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


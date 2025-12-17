import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import LocationCaptureModel from "../models/LocationCapture";
import ClientModel from "../models/Client";
import crypto from "crypto";

const router = Router();

// Gerar token único para captura de localização
router.post("/generate", async (req, res) => {
  try {
    await connectDB();
    
    const schema = z.object({
      clientId: z.string().min(1, "ID do cliente é obrigatório"),
      addressIndex: z.number().optional() // Índice do endereço (-1 para novo endereço)
    });
    
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    
    // Verificar se o cliente existe
    const client = await ClientModel.findById(parsed.data.clientId);
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }
    
    // Gerar token único
    const token = crypto.randomBytes(32).toString("hex");
    
    // Criar registro de captura (expira em 24 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const capture = await LocationCaptureModel.create({
      token,
      clientId: parsed.data.clientId,
      addressIndex: parsed.data.addressIndex,
      expiresAt
    });
    
    res.status(201).json({ 
      data: {
        token: capture.token,
        link: `${process.env.FRONTEND_URL || "http://localhost:3000"}/location-capture/${token}`
      }
    });
  } catch (error: any) {
    console.error("Erro ao gerar token de captura:", error);
    res.status(500).json({ error: error?.message || "Erro ao gerar token" });
  }
});

// Função para fazer geocoding reverso (coordenadas -> endereço)
async function reverseGeocode(lat: number, lon: number): Promise<any> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=pt-BR`,
      {
        headers: {
          "User-Agent": "Grupreis/1.0"
        }
      }
    );
    
    const data = await response.json();
    
    if (!data || !data.address) {
      return null;
    }
    
    const addr = data.address;
    
    // Mapear campos do Nominatim para nosso formato
    return {
      addressStreet: addr.road || addr.street || addr.pedestrian || "",
      addressNumber: addr.house_number || "",
      addressNeighborhood: addr.neighbourhood || addr.suburb || addr.quarter || "",
      addressCity: addr.city || addr.town || addr.village || addr.municipality || "",
      addressState: addr.state || "",
      addressZip: addr.postcode || "",
      address: data.display_name || ""
    };
  } catch (error) {
    console.error("Erro no geocoding reverso:", error);
    return null;
  }
}

// Receber coordenadas capturadas
router.post("/capture/:token", async (req, res) => {
  try {
    await connectDB();
    
    const schema = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    });
    
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    
    const { token } = req.params;
    
    // Buscar registro de captura
    const capture = await LocationCaptureModel.findOne({ 
      token,
      expiresAt: { $gt: new Date() }
    });
    
    if (!capture) {
      return res.status(404).json({ error: "Token inválido ou expirado" });
    }
    
    // Fazer geocoding reverso para obter endereço completo
    const addressData = await reverseGeocode(parsed.data.latitude, parsed.data.longitude);
    
    // Atualizar com coordenadas e dados do endereço
    capture.latitude = parsed.data.latitude;
    capture.longitude = parsed.data.longitude;
    capture.capturedAt = new Date();
    
    if (addressData) {
      capture.addressStreet = addressData.addressStreet;
      capture.addressNumber = addressData.addressNumber;
      capture.addressNeighborhood = addressData.addressNeighborhood;
      capture.addressCity = addressData.addressCity;
      capture.addressState = addressData.addressState;
      capture.addressZip = addressData.addressZip;
      capture.address = addressData.address;
    }
    
    await capture.save();
    
    // Atualizar endereço do cliente se for endereço existente
    const client = await ClientModel.findById(capture.clientId);
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }
    
    if (capture.addressIndex !== undefined && capture.addressIndex >= 0) {
      // Atualizar endereço existente
      if (client.addresses && client.addresses[capture.addressIndex]) {
        client.addresses[capture.addressIndex].latitude = parsed.data.latitude;
        client.addresses[capture.addressIndex].longitude = parsed.data.longitude;
        if (addressData) {
          client.addresses[capture.addressIndex].addressStreet = addressData.addressStreet;
          client.addresses[capture.addressIndex].addressNumber = addressData.addressNumber;
          client.addresses[capture.addressIndex].addressNeighborhood = addressData.addressNeighborhood;
          client.addresses[capture.addressIndex].addressCity = addressData.addressCity;
          client.addresses[capture.addressIndex].addressState = addressData.addressState;
          client.addresses[capture.addressIndex].addressZip = addressData.addressZip;
        }
        await client.save();
      }
    }
    
    res.status(200).json({ 
      data: { 
        success: true,
        message: "Localização capturada com sucesso!",
        address: addressData
      }
    });
  } catch (error: any) {
    console.error("Erro ao capturar localização:", error);
    res.status(500).json({ error: error?.message || "Erro ao capturar localização" });
  }
});

// Verificar status do token
router.get("/status/:token", async (req, res) => {
  try {
    await connectDB();
    
    const { token } = req.params;
    
    const capture = await LocationCaptureModel.findOne({ token });
    
    if (!capture) {
      return res.status(404).json({ error: "Token não encontrado" });
    }
    
    if (capture.expiresAt < new Date()) {
      return res.status(400).json({ error: "Token expirado" });
    }
    
    res.status(200).json({
      data: {
        captured: !!capture.capturedAt,
        latitude: capture.latitude,
        longitude: capture.longitude,
        addressStreet: capture.addressStreet,
        addressNumber: capture.addressNumber,
        addressNeighborhood: capture.addressNeighborhood,
        addressCity: capture.addressCity,
        addressState: capture.addressState,
        addressZip: capture.addressZip,
        address: capture.address,
        capturedAt: capture.capturedAt
      }
    });
  } catch (error: any) {
    console.error("Erro ao verificar status:", error);
    res.status(500).json({ error: error?.message || "Erro ao verificar status" });
  }
});

export default router;


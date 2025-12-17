import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import LocationCaptureModel from "../models/LocationCapture";
import crypto from "crypto";

const router = Router();

// Validation schemas
const createTokenSchema = z.object({
  description: z.string().optional(),
  resourceType: z.enum(["job", "client", "team", "other"]).optional(),
  resourceId: z.string().optional(),
  addressId: z.string().optional(), // ID of the specific address in client's addresses array
  expiresInHours: z.number().min(1).max(720).optional().default(24) // Default 24h
});

const saveLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional()
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

    await connectDB();

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parsed.data.expiresInHours);

    const locationCapture = await LocationCaptureModel.create({
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
  } catch (error: any) {
    console.error("POST /api/location-capture/create error", error);
    res.status(500).json({ error: "Falha ao criar token de captura" });
  }
});

// Validate token and get info
router.get("/validate/:token", async (req, res) => {
  try {
    const { token } = req.params;

    await connectDB();

    const locationCapture = await LocationCaptureModel.findOne({ token }).lean();

    if (!locationCapture) {
      return res.status(404).json({ error: "Token não encontrado" });
    }

    // Check if expired
    if (locationCapture.expiresAt && new Date() > new Date(locationCapture.expiresAt)) {
      await LocationCaptureModel.updateOne({ token }, { status: "expired" });
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
  } catch (error: any) {
    console.error(`GET /api/location-capture/validate/${req.params.token} error`, error);
    res.status(500).json({ error: "Falha ao validar token" });
  }
});

// Parse Google Maps address components
function parseAddressComponents(addressComponents: any[]): {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
} {
  const parsed: any = {};
  
  for (const component of addressComponents) {
    const types = component.types;
    
    if (types.includes("route")) {
      parsed.street = component.long_name;
    } else if (types.includes("street_number")) {
      parsed.number = component.long_name;
    } else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
      parsed.neighborhood = component.long_name;
    } else if (types.includes("administrative_area_level_2")) {
      parsed.city = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      parsed.state = component.short_name;
    } else if (types.includes("postal_code")) {
      parsed.zip = component.long_name;
    }
  }
  
  return parsed;
}

// GET /:token - Alias for /validate/:token (for frontend compatibility)
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;

    await connectDB();

    const locationCapture = await LocationCaptureModel.findOne({ token }).lean();

    if (!locationCapture) {
      return res.status(404).json({ error: "Token não encontrado", status: "invalid" });
    }

    // Check if expired
    if (locationCapture.expiresAt && new Date() > new Date(locationCapture.expiresAt)) {
      await LocationCaptureModel.updateOne({ token }, { status: "expired" });
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
  } catch (error: any) {
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

    await connectDB();

    const locationCapture = await LocationCaptureModel.findOne({ token });

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
    locationCapture.capturedBy = req.ip || req.headers["x-forwarded-for"] as string || "unknown";

    await locationCapture.save();

    // If linked to a client, update client address
    if (locationCapture.resourceType === "client" && locationCapture.resourceId) {
      try {
        const ClientModel = (await import("../models/Client")).default;
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
            const addressIndex = client.addresses.findIndex((addr: any) => 
              addr._id && addr._id.toString() === locationCapture.addressId
            );
            
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
            } else {
              console.warn(`⚠️ Address ${locationCapture.addressId} not found in client ${client._id}`);
            }
          } else {
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
      } catch (clientError) {
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
  } catch (error: any) {
    console.error(`POST /api/location-capture/${req.params.token}/capture error`, error);
    res.status(500).json({ error: "Falha ao salvar localização", detail: error.message });
  }
});

// Get all location captures (admin)
router.get("/", async (req, res) => {
  try {
    await connectDB();

    const captures = await LocationCaptureModel.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ data: captures });
  } catch (error: any) {
    console.error("GET /api/location-capture error", error);
    res.status(500).json({ error: "Falha ao buscar capturas" });
  }
});

// Delete location capture (admin)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await connectDB();

    const capture = await LocationCaptureModel.findByIdAndDelete(id);

    if (!capture) {
      return res.status(404).json({ error: "Captura não encontrada" });
    }

    res.json({ data: { message: "Captura excluída com sucesso" } });
  } catch (error: any) {
    console.error(`DELETE /api/location-capture/${req.params.id} error`, error);
    res.status(500).json({ error: "Falha ao excluir captura" });
  }
});

export default router;

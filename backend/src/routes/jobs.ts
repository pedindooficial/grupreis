import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { connectDB } from "../db";
import JobModel from "../models/Job";
import ClientModel from "../models/Client";
import CashierModel from "../models/Cashier";
import CashTransactionModel from "../models/CashTransaction";
import SettingsModel from "../models/Settings";
import TeamModel from "../models/Team";

const router = Router();

const serviceSchema = z.object({
  catalogId: z.string().optional(),
  service: z.string().min(1, "Selecione o serviço"),
  localType: z.string().optional(),
  soilType: z.string().optional(),
  access: z.string().optional(),
  sptInfo: z.string().optional(),
  sptFileName: z.string().optional(),
  categories: z.array(z.string()).optional(),
  diametro: z.string().optional(),
  profundidade: z.string().optional(),
  quantidade: z.string().optional(),
  observacoes: z.string().optional(),
  value: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountValue: z.number().min(0).optional(),
  finalValue: z.number().min(0).optional(),
  executionTime: z.number().min(0).optional()
});

const jobSchema = z.object({
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional(),
  site: z.string().optional(),
  team: z.string().optional(), // Team name (kept for backward compatibility)
  teamId: z.string().optional(), // Team ID (preferred)
  status: z.enum(["pendente", "em_execucao", "concluida", "cancelada"]).optional(),
  plannedDate: z.string().optional(),
  estimatedDuration: z.number().min(0).optional(), // Total estimated duration in minutes
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  notes: z.string().optional(),
  value: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountValue: z.number().min(0).optional(),
  finalValue: z.number().min(0).optional(),
  services: z.array(serviceSchema).min(1, "Adicione pelo menos um serviço"),
  // Travel/Displacement fields
  selectedAddress: z.string().optional(),
  travelDistanceKm: z.number().min(0).optional(),
  travelPrice: z.number().min(0).optional(),
  travelDescription: z.string().optional()
});

// Availability check endpoint - MUST be before router.get("/") to avoid route conflicts
router.get("/availability", async (req, res) => {
  try {
    const { team, date, services } = req.query;
    
    if (!team || !date) {
      return res.status(400).json({
        error: "Parâmetros obrigatórios: team e date"
      });
    }

    await connectDB();

    // Parse date and get start/end of day
    const selectedDate = new Date(date as string);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        error: "Data inválida"
      });
    }

    // Calculate total execution time for the new job
    let newJobDuration = 120; // Default 2 hours if no services provided
    if (services) {
      try {
        const parsedServices = JSON.parse(services as string);
        let totalMinutes = 0;
        
        for (const service of parsedServices) {
          if (service.executionTime && service.quantidade) {
            const quantidade = parseInt(service.quantidade, 10) || 1;
            const profundidade = parseFloat(service.profundidade) || 1;
            // executionTime is per meter, so: time * quantity * depth
            totalMinutes += service.executionTime * quantidade * profundidade;
          }
        }
        
        // Add 30 minutes gap for moving between service sites
        if (totalMinutes > 0) {
          newJobDuration = totalMinutes + 30;
        }
      } catch (err) {
        console.error("Error parsing services:", err);
      }
    }

    // Normalize to start of day for comparison
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all jobs for this team on this date with their estimated duration
    // Exclude cancelled and completed jobs - they don't block availability
    const existingJobs = await JobModel.find({
      team: team as string,
      status: { $nin: ["cancelada", "concluida"] } // Don't count cancelled or completed jobs
    })
      .select("plannedDate estimatedDuration services status")
      .lean();

    // Filter jobs that fall on the selected date and get their durations
    const jobsOnDate = existingJobs
      .filter((job: any) => {
        if (!job.plannedDate) return false;
        try {
          const jobDate = new Date(job.plannedDate);
          if (isNaN(jobDate.getTime())) return false;
          
          const jobDateOnly = new Date(jobDate);
          jobDateOnly.setHours(0, 0, 0, 0);
          
          return jobDateOnly.getTime() === startOfDay.getTime();
        } catch {
          return false;
        }
      })
      .map((job: any) => {
        // Use saved estimatedDuration if available
        let duration = job.estimatedDuration || 120; // Default 2 hours if not saved
        
        // If no estimatedDuration, calculate from services (for old jobs)
        if (!job.estimatedDuration && job.services && Array.isArray(job.services)) {
          let totalMinutes = 0;
          for (const service of job.services) {
            if (service.executionTime && service.quantidade) {
              const quantidade = parseInt(service.quantidade, 10) || 1;
              const profundidade = parseFloat(service.profundidade) || 1;
              totalMinutes += service.executionTime * quantidade * profundidade;
            }
          }
          if (totalMinutes > 0) {
            duration = totalMinutes + 30; // Add 30 minutes gap
          }
        }
        
        const jobDate = new Date(job.plannedDate);
        const jobEnd = new Date(jobDate.getTime() + duration * 60 * 1000);
        
        console.log(`📅 Job agendado: ${jobDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${jobEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (${duration} min)`);
        
        return {
          plannedDate: job.plannedDate,
          duration: duration
        };
      });
    
    console.log(`\n🔍 Verificando disponibilidade para equipe ${team} em ${date}`);
    console.log(`⏱️ Nova OS terá duração de ${newJobDuration} min`);
    console.log(`📊 Total de jobs neste dia: ${jobsOnDate.length}\n`);

    // Generate available time slots (every 30 minutes from 6:00 to 19:30)
    const availableSlots: string[] = [];
    const bookedSlots: string[] = [];

    for (let hour = 6; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // Check if this slot + new job duration fits within working hours
        const slotStart = slotTime.getTime();
        const slotEnd = slotStart + newJobDuration * 60 * 1000;
        
        // Check if job would end after 19:30 (end of working day)
        const endOfWorkDay = new Date(selectedDate);
        endOfWorkDay.setHours(19, 30, 0, 0);
        
        if (slotEnd > endOfWorkDay.getTime()) {
          // Job would run past working hours
          continue;
        }
        
        // Check if this slot conflicts with existing jobs
        const hasConflict = jobsOnDate.some((job: any) => {
          if (!job.plannedDate) return false;
          try {
            const jobDate = new Date(job.plannedDate);
            if (isNaN(jobDate.getTime())) return false;
            
            const jobStart = jobDate.getTime();
            const jobEnd = jobStart + job.duration * 60 * 1000;
            
            // Check for overlap
            return (slotStart < jobEnd && slotEnd > jobStart);
          } catch {
            return false;
          }
        });

        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        
        if (hasConflict) {
          bookedSlots.push(timeString);
        } else {
          availableSlots.push(timeString);
        }
      }
    }

    // Calculate estimated duration for display
    const hours = Math.floor(newJobDuration / 60);
    const minutes = newJobDuration % 60;
    const durationText = hours > 0 
      ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`
      : `${minutes}min`;

    console.log(`\n📊 Resultado:`);
    console.log(`✅ Horários disponíveis: ${availableSlots.length} (${availableSlots.slice(0, 5).join(", ")}${availableSlots.length > 5 ? "..." : ""})`);
    console.log(`❌ Horários ocupados: ${bookedSlots.length} (${bookedSlots.slice(0, 5).join(", ")}${bookedSlots.length > 5 ? "..." : ""})\n`);

    res.json({
      data: {
        available: availableSlots,
        booked: bookedSlots,
        date: date,
        estimatedDuration: newJobDuration,
        durationText: durationText
      }
    });
  } catch (error: any) {
    console.error("GET /api/jobs/availability error", error);
    res.status(500).json({
      error: "Falha ao verificar disponibilidade",
      detail: error?.message || "Erro interno"
    });
  }
});

router.get("/", async (_req, res) => {
  try {
    await connectDB();

    // Agregação para listar OS com campos essenciais para
    // tabela e mapa, evitando trafegar payload muito grande.
    const jobs = await JobModel.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $project: {
          title: 1,
          seq: 1,
          clientId: 1,
          clientName: 1,
          site: 1,
          team: 1,
          status: 1,
          plannedDate: 1,
          estimatedDuration: 1,
          value: 1,
          discountPercent: 1,
          discountValue: 1,
          finalValue: 1,
          received: 1,
          receivedAt: 1,
          receipt: 1,
          receiptFileKey: 1,
          startedAt: 1,
          finishedAt: 1,
          clientSignature: 1,
          clientSignedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          // Travel/Displacement fields
          selectedAddress: 1,
          travelDistanceKm: 1,
          travelPrice: 1,
          travelDescription: 1,
          // Apenas serviços resumidos para exibição
          services: {
            $map: {
              input: "$services",
              as: "s",
              in: {
                catalogId: "$$s.catalogId",
                service: "$$s.service",
                localType: "$$s.localType",
                soilType: "$$s.soilType",
                access: "$$s.access",
                sptInfo: "$$s.sptInfo",
                sptFileName: "$$s.sptFileName",
                categories: "$$s.categories",
                diametro: "$$s.diametro",
                profundidade: "$$s.profundidade",
                quantidade: "$$s.quantidade",
                observacoes: "$$s.observacoes",
                executionTime: "$$s.executionTime",
                value: "$$s.value",
                discountPercent: "$$s.discountPercent",
                discountValue: "$$s.discountValue",
                finalValue: "$$s.finalValue"
              }
            }
          }
        }
      }
    ]);

    res.json({ data: jobs });
  } catch (error: any) {
    console.error("GET /api/jobs error", error);
    res.status(500).json({
      error: "Falha ao carregar OS",
      detail: error?.message || "Erro interno"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = jobSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    let clientName = parsed.data.clientName?.trim();
    let site = parsed.data.site?.trim() || "";
    let siteLatitude: number | undefined;
    let siteLongitude: number | undefined;
    let clientId: string | null = parsed.data.clientId || null;

    if (clientId) {
      const client = await ClientModel.findById(clientId).lean();
      if (client) {
        clientName = client.name || clientName;
        if (!site) site = client.address || "";
        
        // Try to find coordinates from client's addresses
        if (client.addresses && Array.isArray(client.addresses) && client.addresses.length > 0) {
          // Find the address that matches the site
          const matchingAddress = client.addresses.find((addr: any) => 
            addr.address === site || addr.address === parsed.data.site
          );
          if (matchingAddress && matchingAddress.latitude && matchingAddress.longitude) {
            siteLatitude = matchingAddress.latitude;
            siteLongitude = matchingAddress.longitude;
          }
        }
      }
    }

    const total = await JobModel.countDocuments();
    const seq = total + 1;
    const seqLabel = String(seq).padStart(6, "0");
    
    // Format plannedDate for title if it exists
    let dateLabel = "sem-data";
    if (parsed.data.plannedDate && parsed.data.plannedDate.trim() !== "") {
      try {
        // Parse date string directly to avoid timezone conversion
        // Format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ssZ
        const dateStr = parsed.data.plannedDate.trim();
        const dateTimeMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        
        if (dateTimeMatch) {
          const [, year, month, day, hours, minutes] = dateTimeMatch;
          // Format as DD/MM/YYYY HH:mm (preserving the exact time entered)
          dateLabel = `${day}/${month}/${year} ${hours}:${minutes}`;
        } else {
          // Fallback to Date object if format is unexpected
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, "0");
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, "0");
            const minutes = date.getMinutes().toString().padStart(2, "0");
            dateLabel = `${day}/${month}/${year} ${hours}:${minutes}`;
          }
        }
      } catch {
        // If parsing fails, use the string as-is if it's not empty
        dateLabel = parsed.data.plannedDate;
      }
    }
    
    const title = `${clientName || "Cliente não informado"} - ${dateLabel} - ${seqLabel}`;

    const processedServices = parsed.data.services.map((service: any) => {
      const serviceData: any = { ...service };
      if (service.value !== undefined && service.value !== null) {
        const value = service.value;
        const discountPercent =
          service.discountPercent !== undefined ? service.discountPercent : 0;
        const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
        const finalValue = value - discountValue;

        serviceData.value = value;
        serviceData.discountPercent = discountPercent;
        serviceData.discountValue = discountValue;
        serviceData.finalValue = finalValue;
      }
      return serviceData;
    });

    const totalFinalValue = processedServices.reduce(
      (sum: number, s: any) => sum + (s.finalValue || s.value || 0),
      0
    );
    const totalServiceValue = processedServices.reduce(
      (sum: number, s: any) => sum + (s.value || 0),
      0
    );
    const totalDiscountValue = processedServices.reduce(
      (sum: number, s: any) => sum + (s.discountValue || 0),
      0
    );
    const totalDiscountPercent =
      totalServiceValue > 0 ? (totalDiscountValue / totalServiceValue) * 100 : 0;

    const createData: any = {
      ...parsed.data,
      services: processedServices,
      clientId: clientId || undefined,
      clientName,
      site,
      siteLatitude,
      siteLongitude,
      status: parsed.data.status || "pendente",
      seq,
      title
    };

    // Add travel price to total if present
    const travelPrice = parsed.data.travelPrice || 0;
    const totalWithTravel = totalFinalValue + travelPrice;
    const totalServiceValueWithTravel = totalServiceValue + travelPrice;

    if (parsed.data.value !== undefined && parsed.data.value !== null) {
      // If value is explicitly provided, use it (it should already include travel if calculated on frontend)
      const value = parsed.data.value;
      const discountPercent =
        parsed.data.discountPercent !== undefined ? parsed.data.discountPercent : 0;
      const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
      const finalValue = value - discountValue;

      createData.value = value;
      createData.discountPercent = discountPercent;
      createData.discountValue = discountValue;
      createData.finalValue = finalValue;
    } else if (totalFinalValue > 0) {
      // Calculate from services + travel
      createData.value = totalServiceValueWithTravel; // Include travel in total
      createData.discountPercent = totalDiscountPercent;
      createData.discountValue = totalDiscountValue;
      createData.finalValue = totalWithTravel; // Include travel in final value
    } else if (travelPrice > 0) {
      // If only travel price, set it as the value
      createData.value = travelPrice;
      createData.finalValue = travelPrice;
    }
    
    // Explicitly include travel fields
    if (parsed.data.selectedAddress) {
      createData.selectedAddress = parsed.data.selectedAddress;
    }
    if (parsed.data.travelDistanceKm !== undefined) {
      createData.travelDistanceKm = parsed.data.travelDistanceKm;
    }
    if (parsed.data.travelPrice !== undefined) {
      createData.travelPrice = parsed.data.travelPrice;
    }
    if (parsed.data.travelDescription) {
      createData.travelDescription = parsed.data.travelDescription;
    }

    // Handle team assignment: if teamId is provided, use it; otherwise, look up by team name
    if (parsed.data.teamId) {
      createData.teamId = parsed.data.teamId;
      // Also store team name for backward compatibility
      const team = await TeamModel.findById(parsed.data.teamId).lean();
      if (team) {
        createData.team = team.name;
      }
    } else if (parsed.data.team) {
      // Look up team by name and store both teamId and team name
      const team = await TeamModel.findOne({ name: parsed.data.team }).lean();
      if (team) {
        createData.teamId = team._id;
        createData.team = team.name;
      } else {
        // Team not found, just store the name (backward compatibility)
        createData.team = parsed.data.team;
      }
    }

    const created = await JobModel.create(createData);
    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /api/jobs error", error);
    res
      .status(500)
      .json({ error: "Falha ao salvar OS", detail: error?.message || "Erro interno" });
  }
});

const updateSchema = z.object({
  status: z.enum(["pendente", "em_execucao", "concluida", "cancelada"]).optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  team: z.string().optional(), // Team name (kept for backward compatibility)
  teamId: z.string().optional(), // Team ID (preferred)
  notes: z.string().optional(),
  value: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountValue: z.number().min(0).optional(),
  finalValue: z.number().min(0).optional(),
  cancellationReason: z.string().optional()
});

// Full update endpoint for editing jobs
router.put("/:id", async (req, res) => {
  try {
    const parsed = jobSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const existingJob = await JobModel.findById(req.params.id).lean();
    if (!existingJob) {
      return res.status(404).json({ error: "OS não encontrada" });
    }

    let clientName = parsed.data.clientName?.trim();
    let site = parsed.data.site?.trim() || "";
    let siteLatitude: number | undefined;
    let siteLongitude: number | undefined;
    let clientId: string | null = parsed.data.clientId || null;

    if (clientId) {
      const client = await ClientModel.findById(clientId).lean();
      if (client) {
        clientName = client.name || clientName;
        if (!site) site = client.address || "";
        
        // Try to find coordinates from client's addresses
        if (client.addresses && Array.isArray(client.addresses) && client.addresses.length > 0) {
          // Find the address that matches the site
          const matchingAddress = client.addresses.find((addr: any) => 
            addr.address === site || addr.address === parsed.data.site
          );
          if (matchingAddress && matchingAddress.latitude && matchingAddress.longitude) {
            siteLatitude = matchingAddress.latitude;
            siteLongitude = matchingAddress.longitude;
          }
        }
      }
    }

    // Format plannedDate for title if it exists
    let dateLabel = "sem-data";
    if (parsed.data.plannedDate && parsed.data.plannedDate.trim() !== "") {
      try {
        // Parse date string directly to avoid timezone conversion
        // Format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ssZ
        const dateStr = parsed.data.plannedDate.trim();
        const dateTimeMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        
        if (dateTimeMatch) {
          const [, year, month, day, hours, minutes] = dateTimeMatch;
          // Format as DD/MM/YYYY HH:mm (preserving the exact time entered)
          dateLabel = `${day}/${month}/${year} ${hours}:${minutes}`;
        } else {
          // Fallback to Date object if format is unexpected
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, "0");
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, "0");
            const minutes = date.getMinutes().toString().padStart(2, "0");
            dateLabel = `${day}/${month}/${year} ${hours}:${minutes}`;
          }
        }
      } catch {
        // If parsing fails, use the string as-is if it's not empty
        dateLabel = parsed.data.plannedDate;
      }
    }

    const seqLabel = String(existingJob.seq || 0).padStart(6, "0");
    const title = `${clientName || "Cliente não informado"} - ${dateLabel} - ${seqLabel}`;

    const processedServices = parsed.data.services.map((service: any) => {
      const serviceData: any = { ...service };
      if (service.value !== undefined && service.value !== null) {
        const value = service.value;
        const discountPercent =
          service.discountPercent !== undefined ? service.discountPercent : 0;
        const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
        const finalValue = value - discountValue;

        serviceData.value = value;
        serviceData.discountPercent = discountPercent;
        serviceData.discountValue = discountValue;
        serviceData.finalValue = finalValue;
      }
      return serviceData;
    });

    const totalFinalValue = processedServices.reduce(
      (sum: number, s: any) => sum + (s.finalValue || s.value || 0),
      0
    );
    const totalServiceValue = processedServices.reduce(
      (sum: number, s: any) => sum + (s.value || 0),
      0
    );
    const totalDiscountValue = processedServices.reduce(
      (sum: number, s: any) => sum + (s.discountValue || 0),
      0
    );
    const totalDiscountPercent =
      totalServiceValue > 0 ? (totalDiscountValue / totalServiceValue) * 100 : 0;

    const updateData: any = {
      ...parsed.data,
      services: processedServices,
      clientId: clientId || undefined,
      clientName,
      site,
      siteLatitude,
      siteLongitude,
      title
    };

    // Add travel price to total if present
    const travelPrice = parsed.data.travelPrice || 0;
    const totalWithTravel = totalFinalValue + travelPrice;
    const totalServiceValueWithTravel = totalServiceValue + travelPrice;

    if (parsed.data.value !== undefined && parsed.data.value !== null) {
      // If value is explicitly provided, use it (it should already include travel if calculated on frontend)
      const value = parsed.data.value;
      const discountPercent =
        parsed.data.discountPercent !== undefined ? parsed.data.discountPercent : 0;
      const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
      const finalValue = value - discountValue;

      updateData.value = value;
      updateData.discountPercent = discountPercent;
      updateData.discountValue = discountValue;
      updateData.finalValue = finalValue;
    } else if (totalFinalValue > 0) {
      // Calculate from services + travel
      updateData.value = totalServiceValueWithTravel; // Include travel in total
      updateData.discountPercent = totalDiscountPercent;
      updateData.discountValue = totalDiscountValue;
      updateData.finalValue = totalWithTravel; // Include travel in final value
    } else if (travelPrice > 0) {
      // If only travel price, set it as the value
      updateData.value = travelPrice;
      updateData.finalValue = travelPrice;
    }
    
    // Explicitly include travel fields
    if (parsed.data.selectedAddress !== undefined) {
      updateData.selectedAddress = parsed.data.selectedAddress;
    }
    if (parsed.data.travelDistanceKm !== undefined) {
      updateData.travelDistanceKm = parsed.data.travelDistanceKm;
    }
    if (parsed.data.travelPrice !== undefined) {
      updateData.travelPrice = parsed.data.travelPrice;
    }
    if (parsed.data.travelDescription !== undefined) {
      updateData.travelDescription = parsed.data.travelDescription;
    }

    // Handle team assignment: if teamId is provided, use it; otherwise, look up by team name
    if (parsed.data.teamId) {
      updateData.teamId = parsed.data.teamId;
      // Also store team name for backward compatibility
      const team = await TeamModel.findById(parsed.data.teamId).lean();
      if (team) {
        updateData.team = team.name;
      }
    } else if (parsed.data.team !== undefined) {
      if (parsed.data.team) {
        // Look up team by name and store both teamId and team name
        const team = await TeamModel.findOne({ name: parsed.data.team }).lean();
        if (team) {
          updateData.teamId = team._id;
          updateData.team = team.name;
        } else {
          // Team not found, just store the name (backward compatibility)
          updateData.team = parsed.data.team;
          // Clear teamId if team name doesn't exist
          updateData.teamId = null;
        }
      } else {
        // Team is being cleared
        updateData.team = null;
        updateData.teamId = null;
      }
    }

    const updated = await JobModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/jobs/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar OS",
      detail: error?.message || "Erro interno"
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    let updateData: any = { ...parsed.data };
    if (updateData.value !== undefined || updateData.discountPercent !== undefined) {
      const existing = await JobModel.findById(req.params.id).lean();
      const value =
        updateData.value !== undefined ? updateData.value : (existing?.value || 0);
      const discountPercent =
        updateData.discountPercent !== undefined
          ? updateData.discountPercent
          : (existing?.discountPercent || 0);
      const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
      const finalValue = value - discountValue;

      updateData.value = value;
      updateData.discountPercent = discountPercent;
      updateData.discountValue = discountValue;
      updateData.finalValue = finalValue;
    }

    // Handle team assignment: if teamId is provided, use it; otherwise, look up by team name
    if (parsed.data.teamId !== undefined) {
      if (parsed.data.teamId) {
        updateData.teamId = parsed.data.teamId;
        // Also store team name for backward compatibility
        const team = await TeamModel.findById(parsed.data.teamId).lean();
        if (team) {
          updateData.team = team.name;
        }
      } else {
        // Team is being cleared
        updateData.teamId = null;
        updateData.team = null;
      }
    } else if (parsed.data.team !== undefined) {
      if (parsed.data.team) {
        // Look up team by name and store both teamId and team name
        const team = await TeamModel.findOne({ name: parsed.data.team }).lean();
        if (team) {
          updateData.teamId = team._id;
          updateData.team = team.name;
        } else {
          // Team not found, just store the name (backward compatibility)
          updateData.team = parsed.data.team;
          // Clear teamId if team name doesn't exist
          updateData.teamId = null;
        }
      } else {
        // Team is being cleared
        updateData.team = null;
        updateData.teamId = null;
      }
    }

    const updated = await JobModel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ error: "OS não encontrada" });
    }
    res.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/jobs/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar OS",
      detail: error?.message || "Erro interno"
    });
  }
});

// Delete job (only cancelled jobs can be deleted)
router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const job = await JobModel.findById(req.params.id).lean();
    if (!job) {
      return res.status(404).json({ error: "OS não encontrada" });
    }

    // Only allow deletion of cancelled jobs
    if (job.status !== "cancelada") {
      return res.status(400).json({
        error: "Apenas OS canceladas podem ser excluídas"
      });
    }

    // Check if job has any transactions
    const hasTransactions = await CashTransactionModel.exists({ jobId: job._id });
    if (hasTransactions) {
      return res.status(400).json({
        error: "Não é possível excluir uma OS com transações financeiras associadas"
      });
    }

    await JobModel.findByIdAndDelete(req.params.id);
    res.json({ message: "OS excluída com sucesso" });
  } catch (error: any) {
    console.error("DELETE /api/jobs/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir OS",
      detail: error?.message || "Erro interno"
    });
  }
});

const markReceivedSchema = z.object({
  paymentMethod: z.enum(["dinheiro", "pix", "transferencia", "cartao", "cheque", "outro"]).optional(),
  receipt: z.string().optional(),
  receiptFileKey: z.string().optional()
});

router.post("/:id/received", async (req, res) => {
  try {
    const parsed = markReceivedSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const job = await JobModel.findById(req.params.id).lean();
    if (!job) {
      return res.status(404).json({ error: "OS não encontrada" });
    }

    if (job.status !== "concluida") {
      return res.status(400).json({
        error: "Apenas OS concluídas podem ser marcadas como recebidas"
      });
    }

    if (job.received) {
      return res.status(400).json({
        error: "Esta OS já foi marcada como recebida"
      });
    }

    if (!job.finalValue || job.finalValue <= 0) {
      return res.status(400).json({
        error: "OS não possui valor final para recebimento"
      });
    }

    // Check if caixa is open, if not open one automatically
    let openCashier = await CashierModel.findOne({ status: "aberto" }).lean();
    if (!openCashier) {
      // Auto-open caixa with 0 balance
      const newCashier = await CashierModel.create({
        status: "aberto",
        openingBalance: 0,
        openedBy: "Sistema (auto-abertura)",
        notes: "Caixa aberto automaticamente ao receber OS",
        openedAt: new Date()
      });
      openCashier = newCashier.toObject();
    }

    // Check if transaction already exists for this job
    const existingTransaction = await CashTransactionModel.findOne({
      jobId: job._id,
      type: "entrada"
    }).lean();

    if (existingTransaction) {
      // Transaction already exists, just mark as received
      const updated = await JobModel.findByIdAndUpdate(
        req.params.id,
        {
          received: true,
          receivedAt: new Date(),
          receipt: parsed.data.receipt || undefined
        },
        { new: true, runValidators: true }
      );
      return res.json({ data: updated, transaction: existingTransaction });
    }

    // Payment method is required when creating a new transaction
    if (!parsed.data.paymentMethod) {
      return res.status(400).json({
        error: "Forma de pagamento é obrigatória"
      });
    }

    // Create transaction for the payment - use database transaction for atomicity
    const session = await mongoose.startSession();

    try {
      let createdTransaction: any;
      let updated: any;

      await session.withTransaction(async () => {
        // Double-check inside transaction to prevent race conditions
        const duplicateCheck = await CashTransactionModel.findOne({
          jobId: job._id,
          type: "entrada"
        })
          .session(session)
          .lean();

        if (duplicateCheck) {
          throw new Error("Uma transação já existe para esta OS");
        }

        // Create transaction
        const [transactionDoc] = await CashTransactionModel.create(
          [
            {
              type: "entrada",
              amount: job.finalValue,
              description: `Pagamento de Serviço - ${job.clientName || "Cliente"} - OS ${job.seq ? String(job.seq).padStart(6, "0") : ""}`,
              date: new Date().toISOString().split("T")[0],
              clientId: job.clientId || undefined,
              clientName: job.clientName || undefined,
              jobId: job._id,
              jobTitle: job.title,
              paymentMethod: parsed.data.paymentMethod,
              category: "Pagamento de Serviço",
              notes: `Recebimento da OS ${job.seq ? String(job.seq).padStart(6, "0") : ""} - ${job.title}`,
              receiptFileKey: parsed.data.receiptFileKey || undefined,
              cashierId: openCashier._id
            }
          ],
          { session }
        );

        createdTransaction = transactionDoc;

        // Only mark job as received if transaction was created successfully
        updated = await JobModel.findByIdAndUpdate(
          req.params.id,
          {
            received: true,
            receivedAt: new Date(),
            receipt: parsed.data.receipt || undefined,
            receiptFileKey: parsed.data.receiptFileKey || undefined
          },
          { new: true, runValidators: true, session }
        );

        if (!updated) {
          throw new Error("Falha ao atualizar OS");
        }
      });

      // Transaction committed successfully - verify transaction exists
      const verifyTransaction = await CashTransactionModel.findOne({
        jobId: job._id,
        type: "entrada"
      }).lean();

      if (!verifyTransaction) {
        return res.status(500).json({
          error: "Transação não foi criada corretamente",
          detail: "A transação não foi encontrada após a criação"
        });
      }

      res.json({ data: updated, transaction: verifyTransaction });
    } catch (error: any) {
      console.error("Error in transaction:", error);
      
      // Check if error is due to duplicate transaction
      if (error?.message?.includes("já existe") || error?.code === 11000) {
        return res.status(409).json({
          error: "Uma transação já existe para esta OS",
          detail: "Esta Order de Serviço já possui uma transação de recebimento registrada"
        });
      }

      res.status(500).json({
        error: "Falha ao criar transação e marcar como recebido",
        detail: error?.message || "Erro interno"
      });
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("POST /api/jobs/:id/received error", error);
    res.status(500).json({
      error: "Falha ao marcar OS como recebida",
      detail: error?.message || "Erro interno"
    });
  }
});

const signatureSchema = z.object({
  signature: z.string().min(1, "Assinatura é obrigatória") // Base64 image
});

router.post("/:id/signature", async (req, res) => {
  try {
    const parsed = signatureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const job = await JobModel.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "OS não encontrada" });
    }

    job.clientSignature = parsed.data.signature;
    job.clientSignedAt = new Date();
    await job.save();

    res.json({ data: job });
  } catch (error: any) {
    console.error("POST /api/jobs/:id/signature error", error);
    res.status(500).json({
      error: "Falha ao salvar assinatura",
      detail: error?.message || "Erro interno"
    });
  }
});

// PDF Generation endpoint
router.get("/:id/pdf", async (req, res) => {
  try {
    await connectDB();

    const job = await JobModel.findById(req.params.id).lean();
    if (!job) {
      return res.status(404).json({ error: "OS não encontrada" });
    }

    // Create PDF
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="OS-${job.seq ? String(job.seq).padStart(6, "0") : "N/A"}.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Helper function to format currency
    const formatCurrency = (value: number | undefined) => {
      if (!value) return "R$ 0,00";
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
      }).format(value);
    };

    // Helper function to format date
    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return "-";
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } catch {
        return dateString;
      }
    };

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("ORDEM DE SERVIÇO", { align: "center" });
    doc.moveDown();

    // Job Info
    doc.fontSize(12).font("Helvetica");
    doc.text(`OS Nº: ${job.seq ? String(job.seq).padStart(6, "0") : "N/A"}`, { align: "left" });
    doc.text(`Cliente: ${job.clientName || "-"}`, { align: "left" });
    doc.text(`Obra: ${job.site || "-"}`, { align: "left" });
    if (job.team) {
      doc.text(`Equipe: ${job.team}`, { align: "left" });
    }
    doc.text(`Data Agendada: ${formatDate(job.plannedDate)}`, { align: "left" });
    doc.text(`Status: ${job.status === "pendente" ? "Pendente" : job.status === "em_execucao" ? "Em Execução" : job.status === "concluida" ? "Concluída" : "Cancelada"}`, { align: "left" });
    doc.moveDown();

    // Services Section
    doc.fontSize(14).font("Helvetica-Bold").text("SERVIÇOS", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");

    job.services.forEach((service: any, index: number) => {
      doc.text(`${index + 1}. ${service.service}`, { align: "left" });
      
      if (service.diametro) {
        doc.text(`   Diâmetro: ${service.diametro}`, { align: "left", indent: 20 });
      }
      if (service.profundidade) {
        doc.text(`   Profundidade: ${service.profundidade}`, { align: "left", indent: 20 });
      }
      if (service.quantidade) {
        doc.text(`   Quantidade: ${service.quantidade}`, { align: "left", indent: 20 });
      }
      if (service.soilType) {
        doc.text(`   Tipo de Solo: ${service.soilType}`, { align: "left", indent: 20 });
      }
      if (service.access) {
        doc.text(`   Acesso: ${service.access}`, { align: "left", indent: 20 });
      }
      if (service.observacoes) {
        doc.text(`   Observações: ${service.observacoes}`, { align: "left", indent: 20 });
      }
      if (service.finalValue || service.value) {
        doc.text(`   Valor: ${formatCurrency(service.finalValue || service.value)}`, { align: "left", indent: 20 });
      }
      doc.moveDown(0.5);
    });

    doc.moveDown();

    // Financial Summary
    doc.fontSize(14).font("Helvetica-Bold").text("RESUMO FINANCEIRO", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    
    // Services subtotal
    const servicesSubtotal = job.services?.reduce((sum: number, s: any) => {
      return sum + (s.finalValue || s.value || 0);
    }, 0) || 0;
    
    if (servicesSubtotal > 0) {
      doc.text(`Subtotal dos Serviços: ${formatCurrency(servicesSubtotal)}`, { align: "left" });
    }
    
    // Displacement/Travel cost
    if (job.travelPrice && job.travelPrice > 0) {
      const travelInfo = job.travelDistanceKm 
        ? `Deslocamento (${job.travelDistanceKm} km): ${formatCurrency(job.travelPrice)}`
        : `Deslocamento: ${formatCurrency(job.travelPrice)}`;
      doc.text(travelInfo, { align: "left" });
      
      if (job.travelDescription) {
        doc.fontSize(9).font("Helvetica");
        doc.text(`   ${job.travelDescription}`, { align: "left", indent: 20 });
        doc.fontSize(10).font("Helvetica");
      }
    }
    
    // Total value (services + travel)
    if (job.value) {
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text(`Valor Total: ${formatCurrency(job.value)}`, { align: "left" });
      doc.fontSize(10).font("Helvetica");
    }
    
    if (job.discountPercent && job.discountPercent > 0) {
      doc.text(`Desconto (${job.discountPercent}%): ${formatCurrency(job.discountValue || 0)}`, { align: "left" });
    }
    if (job.finalValue) {
      doc.fontSize(12).font("Helvetica-Bold");
      doc.text(`Valor Final: ${formatCurrency(job.finalValue)}`, { align: "left" });
      doc.fontSize(10).font("Helvetica");
    }

    doc.moveDown(2);

    // Notes
    if (job.notes) {
      doc.fontSize(12).font("Helvetica-Bold").text("OBSERVAÇÕES", { align: "left" });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text(job.notes, { align: "left" });
      doc.moveDown(2);
    }

    // Signature Section
    doc.moveDown(2);
    doc.fontSize(12).font("Helvetica-Bold").text("ASSINATURAS", { align: "left" });
    doc.moveDown(1);

    // Client signature area - save Y position before drawing
    const clientSignatureY = doc.y;
    const signatureBoxWidth = 200;
    const signatureBoxHeight = 80;
    const signatureBoxX = 50;
    
    // Draw client signature box
    doc.rect(signatureBoxX, clientSignatureY, signatureBoxWidth, signatureBoxHeight).stroke();
    doc.fontSize(10).font("Helvetica");
    doc.text("Assinatura do Cliente", signatureBoxX + 5, clientSignatureY + 5);
    
    // If signature exists, embed it inside the box
    if (job.clientSignature) {
      try {
        const signatureBuffer = Buffer.from(job.clientSignature.split(",")[1] || job.clientSignature, "base64");
        // Position signature inside the box (with padding)
        const signatureX = signatureBoxX + 5;
        const signatureY = clientSignatureY + 20; // Below the label
        const signatureWidth = signatureBoxWidth - 10; // Padding on both sides
        const signatureHeight = signatureBoxHeight - 25; // Space for label
        
        doc.image(signatureBuffer, signatureX, signatureY, { 
          width: signatureWidth, 
          height: signatureHeight, 
          fit: [signatureWidth, signatureHeight] 
        });
      } catch (error) {
        console.error("Error embedding signature:", error);
      }
    }

    // Move down after client signature box
    doc.y = clientSignatureY + signatureBoxHeight + 20;

    // Company signature area
    const companySignatureY = doc.y;
    doc.rect(signatureBoxX, companySignatureY, signatureBoxWidth, signatureBoxHeight).stroke();
    doc.fontSize(10).font("Helvetica");
    doc.text("Assinatura da Empresa", signatureBoxX + 5, companySignatureY + 5);
    
    // Load company signature from settings
    const settings = await SettingsModel.findOne().lean();
    if (settings?.companySignature) {
      try {
        const signatureBuffer = Buffer.from(settings.companySignature.split(",")[1] || settings.companySignature, "base64");
        // Position signature inside the box (with padding)
        const signatureX = signatureBoxX + 5;
        const signatureY = companySignatureY + 20; // Below the label
        const signatureWidth = signatureBoxWidth - 10; // Padding on both sides
        const signatureHeight = signatureBoxHeight - 25; // Space for label
        
        doc.image(signatureBuffer, signatureX, signatureY, { 
          width: signatureWidth, 
          height: signatureHeight, 
          fit: [signatureWidth, signatureHeight] 
        });
      } catch (error) {
        console.error("Error embedding company signature:", error);
      }
    }
    
    // Move down after company signature box
    doc.y = companySignatureY + signatureBoxHeight + 10;

    // Footer
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;
    doc.fontSize(8).font("Helvetica");
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
      pageWidth / 2 - 100,
      pageHeight - 30,
      { width: 200, align: "center" }
    );

    // Finalize PDF
    doc.end();
  } catch (error: any) {
    console.error("GET /api/jobs/:id/pdf error", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Falha ao gerar PDF",
        detail: error?.message || "Erro interno"
      });
    }
  }
});

export default router;

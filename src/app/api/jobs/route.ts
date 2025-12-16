import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import JobModel from "@/models/Job";
import ClientModel from "@/models/Client";

const serviceSchema = z.object({
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
  finalValue: z.number().min(0).optional()
});

const jobSchema = z.object({
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional(),
  site: z.string().optional(),
  team: z.string().optional(),
  status: z.enum(["pendente", "em_execucao", "concluida", "cancelada"]).optional(),
  plannedDate: z.string().optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  notes: z.string().optional(),
  value: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountValue: z.number().min(0).optional(),
  finalValue: z.number().min(0).optional(),
  services: z.array(serviceSchema).min(1, "Adicione pelo menos um serviço")
});

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "Configure MONGODB_URI no .env.local" },
        { status: 500 }
      );
    }
    await connectDB();
    const jobs = await JobModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: jobs });
  } catch (error: any) {
    console.error("GET /api/jobs error", error);
    return NextResponse.json(
        { error: "Falha ao carregar OS", detail: error?.message || "Erro interno" },
        { status: 500 }
      );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = jobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "Configure MONGODB_URI no .env.local" },
        { status: 500 }
      );
    }

    await connectDB();

    let clientName = parsed.data.clientName?.trim();
    let site = parsed.data.site?.trim() || "";
    let clientId: string | null = parsed.data.clientId || null;

    if (clientId) {
      const client = await ClientModel.findById(clientId).lean();
      if (client) {
        clientName = client.name || clientName;
        if (!site) site = client.address || "";
      }
    }

    const total = await JobModel.countDocuments();
    const seq = total + 1;
    const seqLabel = String(seq).padStart(6, "0");
    const title = `${clientName || "Cliente não informado"} - ${
      parsed.data.plannedDate || "sem-data"
    } - ${seqLabel}`;

    // Processar valores individuais dos serviços
    const processedServices = parsed.data.services.map((service: any) => {
      const serviceData: any = { ...service };
      
      // Calcular valores do serviço se value for fornecido
      if (service.value !== undefined && service.value !== null) {
        const value = service.value;
        const discountPercent = service.discountPercent !== undefined ? service.discountPercent : 0;
        const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
        const finalValue = value - discountValue;

        serviceData.value = value;
        serviceData.discountPercent = discountPercent;
        serviceData.discountValue = discountValue;
        serviceData.finalValue = finalValue;
      }
      
      return serviceData;
    });

    // Calcular valor total da OS como soma dos valores finais dos serviços
    const totalFinalValue = processedServices.reduce((sum: number, s: any) => sum + (s.finalValue || s.value || 0), 0);
    const totalServiceValue = processedServices.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
    const totalDiscountValue = processedServices.reduce((sum: number, s: any) => sum + (s.discountValue || 0), 0);
    const totalDiscountPercent = totalServiceValue > 0 ? (totalDiscountValue / totalServiceValue) * 100 : 0;

    // Calcular desconto e valor final apenas se value for fornecido (valor geral da OS)
    const createData: any = {
      ...parsed.data,
      services: processedServices,
      clientId: clientId || undefined,
      clientName,
      site,
      status: parsed.data.status || "pendente",
      seq,
      title
    };

    // Se tem valor geral, usar ele; senão, usar a soma dos serviços
    if (parsed.data.value !== undefined && parsed.data.value !== null) {
      const value = parsed.data.value;
      const discountPercent = parsed.data.discountPercent !== undefined ? parsed.data.discountPercent : 0;
      const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
      const finalValue = value - discountValue;

      createData.value = value;
      createData.discountPercent = discountPercent;
      createData.discountValue = discountValue;
      createData.finalValue = finalValue;
    } else if (totalFinalValue > 0) {
      // Usar soma dos serviços como valor total
      createData.value = totalServiceValue;
      createData.discountPercent = totalDiscountPercent;
      createData.discountValue = totalDiscountValue;
      createData.finalValue = totalFinalValue;
    }

    const created = await JobModel.create(createData);

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/jobs error", error);
    return NextResponse.json(
      { error: "Falha ao salvar OS", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}



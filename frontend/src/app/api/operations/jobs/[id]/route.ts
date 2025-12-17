import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch } from "@/lib/backend-fetch";

const bodySchema = z.object({
  teamId: z.string().min(4).optional(),
  token: z.string().min(4).optional(), // Legacy support
  password: z.string().min(4),
  status: z.enum(["pendente", "em_execucao", "concluida", "cancelada"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional()
}).refine((data) => data.teamId || data.token, {
  message: "Either teamId or token must be provided"
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Call backend API - support both teamId (new) and token (legacy)
    const backendRes = await backendFetch(`/operations/jobs/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamId: parsed.data.teamId,
        token: parsed.data.token,
        password: parsed.data.password,
        status: parsed.data.status,
        startedAt: parsed.data.startedAt,
        finishedAt: parsed.data.finishedAt
      })
    });

    const backendData = await backendRes.json().catch(() => null);

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: backendData?.error || "Falha ao atualizar OS" },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(backendData);
  } catch (error: any) {
    console.error("PATCH /api/operations/jobs/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar OS", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}



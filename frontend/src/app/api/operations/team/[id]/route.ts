import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch } from "@/lib/backend-fetch";

const bodySchema = z.object({
  password: z.string().min(4, "Senha obrigatória")
});

export async function POST(
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

    // Call backend API - new team ID-based route
    const backendRes = await backendFetch(`/operations/team/${params.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: parsed.data.password })
    });

    const backendData = await backendRes.json().catch(() => null);

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: backendData?.error || "Falha ao autenticar" },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(backendData);
  } catch (error: any) {
    console.error("POST /api/operations/team/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao carregar painel", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


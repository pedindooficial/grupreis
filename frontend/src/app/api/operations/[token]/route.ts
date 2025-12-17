import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  password: z.string().min(4, "Senha obrigatória")
});

import { backendFetch } from "@/lib/backend-fetch";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
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

    // Call backend API - legacy token-based route
    const backendRes = await backendFetch(`/operations/${params.token}`, {
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
    console.error("POST /api/operations/[token] error", error);
    return NextResponse.json(
      { error: "Falha ao carregar painel", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}



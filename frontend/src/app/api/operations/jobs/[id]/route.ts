import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(4),
  password: z.string().min(4),
  status: z.enum(["pendente", "em_execucao", "concluida", "cancelada"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional()
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000/api"
    : "https://your-backend-placeholder-url.com/api");

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

    // Call backend API instead of accessing database directly
    const backendUrl = `${API_BASE}/operations/jobs/${params.id}`;
    const backendRes = await fetch(backendUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
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



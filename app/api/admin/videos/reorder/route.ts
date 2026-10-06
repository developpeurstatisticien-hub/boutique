import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) })
  .refine((value) => new Set(value.ids).size === value.ids.length, "Identifiants dupliqués.");

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const body: unknown = await request.json().catch((error: unknown) => {
    if (error instanceof SyntaxError) return null;
    throw error;
  });
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ordre de vidéos invalide." }, { status: 400 });

  try {
    const count = await prisma.landingVideo.count({ where: { id: { in: parsed.data.ids } } });
    if (count !== parsed.data.ids.length) {
      return NextResponse.json({ error: "Une ou plusieurs vidéos sont introuvables." }, { status: 404 });
    }
    await prisma.$transaction(
      parsed.data.ids.map((id, sortOrder) =>
        prisma.landingVideo.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin video reorder failed:", error);
    return NextResponse.json({ error: "Impossible de modifier l’ordre des vidéos." }, { status: 500 });
  }
}

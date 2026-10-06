import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { videoInputSchema } from "@/lib/admin-input";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

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
  const parsed = videoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  try {
    const sortOrder = await prisma.landingVideo.count();
    const video = await prisma.landingVideo.create({
      data: { ...parsed.data, sortOrder },
    });
    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    console.error("Admin video creation failed:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la vidéo." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  mediaUrl: z.string().url().max(2048).optional(),
  objectKey: z.string().min(1).max(512).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: parsed.success ? "Aucune modification indiquée." : "Données invalides." }, { status: 400 });
  }
  const { id } = await params;
  try {
    const video = await prisma.landingVideo.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ video });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }
    console.error("Admin video update failed:", error);
    return NextResponse.json({ error: "Impossible de modifier la vidéo." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.landingVideo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }
    console.error("Admin video deletion failed:", error);
    return NextResponse.json({ error: "Impossible de supprimer la vidéo." }, { status: 500 });
  }
}

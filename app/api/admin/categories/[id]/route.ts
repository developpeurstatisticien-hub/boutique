import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { categoryInputSchema, createSlug } from "@/lib/admin-input";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

type RouteContext = { params: Promise<{ id: string }> };

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
  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }
  const { id } = await params;
  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name: parsed.data.name, slug: createSlug(parsed.data.name), isActive: parsed.data.isActive },
    });
    return NextResponse.json({ category });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Cette catégorie existe déjà." }, { status: 409 });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
    }
    console.error("Admin category update failed:", error);
    return NextResponse.json({ error: "Impossible de modifier la catégorie." }, { status: 500 });
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
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      return NextResponse.json({ error: "Cette catégorie contient des produits. Désactivez-la ou déplacez les produits avant de la supprimer." }, { status: 409 });
    }
    console.error("Admin category deletion failed:", error);
    return NextResponse.json({ error: "Impossible de supprimer la catégorie." }, { status: 500 });
  }
}

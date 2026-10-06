import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { categoryInputSchema, createSlug } from "@/lib/admin-input";
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
  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  try {
    const category = await prisma.category.create({
      data: { name: parsed.data.name, slug: createSlug(parsed.data.name), isActive: parsed.data.isActive },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Cette catégorie existe déjà." }, { status: 409 });
    }
    console.error("Admin category creation failed:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la catégorie." }, { status: 500 });
  }
}

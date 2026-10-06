import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { createSlug, productInputSchema } from "@/lib/admin-input";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

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
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: parsed.data.name,
        slug: createSlug(parsed.data.name),
        description: parsed.data.description,
        price: parsed.data.price,
        promoPrice: parsed.data.promoPrice,
        stock: parsed.data.stock,
        isActive: parsed.data.isActive,
        categoryId: parsed.data.categoryId,
        images: {
          create: [{ objectKey: `external:${parsed.data.imageUrl}`, mediaUrl: parsed.data.imageUrl, altText: parsed.data.name }],
        },
      },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Un produit porte déjà ce nom. Modifiez son nom puis réessayez." }, { status: 409 });
    }
    console.error("Admin product creation failed:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer le produit." }, { status: 500 });
  }
}

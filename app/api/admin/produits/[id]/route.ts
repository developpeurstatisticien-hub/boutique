import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { createSlug, productInputSchema } from "@/lib/admin-input";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

type RouteContext = { params: Promise<{ id: string }> };

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { id } = await params;
  const body: unknown = await request.json().catch((error: unknown) => {
    if (error instanceof SyntaxError) return null;
    throw error;
  });
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  try {
    const existing = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!existing) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    const image = existing.images[0];
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: createSlug(parsed.data.name),
        description: parsed.data.description,
        price: parsed.data.price,
        promoPrice: parsed.data.promoPrice,
        stock: parsed.data.stock,
        isActive: parsed.data.isActive,
        categoryId: parsed.data.categoryId,
        ...(image
          ? { images: { update: { where: { id: image.id }, data: { objectKey: `external:${parsed.data.imageUrl}`, mediaUrl: parsed.data.imageUrl, altText: parsed.data.name } } } }
          : { images: { create: [{ objectKey: `external:${parsed.data.imageUrl}`, mediaUrl: parsed.data.imageUrl, altText: parsed.data.name }] } }),
      },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ product });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Un produit porte déjà ce nom. Modifiez son nom puis réessayez." }, { status: 409 });
    }
    console.error("Admin product update failed:", error);
    return NextResponse.json({ error: "Impossible de modifier le produit." }, { status: 500 });
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
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      return NextResponse.json({ error: "Ce produit figure dans une commande et ne peut pas être supprimé. Désactivez-le à la place." }, { status: 409 });
    }
    console.error("Admin product deletion failed:", error);
    return NextResponse.json({ error: "Impossible de supprimer le produit." }, { status: 500 });
  }
}

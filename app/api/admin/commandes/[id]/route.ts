import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

type RouteContext = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "REJECTED"]),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const body: unknown = await request.json().catch((error: unknown) => {
    if (error instanceof SyntaxError) return null;
    throw error;
  });
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Statut de commande invalide." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const order = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.order.findUnique({
        where: { id },
        select: { status: true, items: { select: { productId: true, quantity: true } } },
      });
      if (!existing) return null;
      if (existing.status !== parsed.data.status && parsed.data.status === "REJECTED") {
        for (const item of existing.items) {
          await transaction.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      } else if (existing.status === "REJECTED" && parsed.data.status !== "REJECTED") {
        for (const item of existing.items) {
          const stockUpdate = await transaction.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (stockUpdate.count !== 1) {
            throw new InsufficientStockError();
          }
        }
      }
      const updated = await transaction.order.update({
        where: { id },
        data: { status: parsed.data.status },
        select: { id: true, orderNumber: true, status: true },
      });
      if (existing.status !== parsed.data.status) {
        await transaction.orderStatusHistory.create({
          data: {
            orderId: id,
            status: parsed.data.status,
            note: parsed.data.note,
            changedById: admin.id,
          },
        });
      }
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "Stock insuffisant pour réactiver cette commande." },
        { status: 409 },
      );
    }
    console.error("Admin order status update failed:", error);
    return NextResponse.json({ error: "Impossible de modifier le statut de la commande." }, { status: 500 });
  }
}

class InsufficientStockError extends Error {}

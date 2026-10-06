import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod, Prisma } from "@prisma/client";
import { z } from "zod";
import { deletePrivateMedia, storePaymentProof } from "@/lib/media-storage";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const orderSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(5).max(32),
  address: z.string().trim().min(1).max(300),
  postalCode: z.string().trim().max(30),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  paymentMethod: z.nativeEnum(PaymentMethod),
  items: z.array(z.object({
    id: z.string().min(1).max(128),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(50).refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    "Chaque produit ne doit apparaître qu’une seule fois.",
  ),
});

const paymentRecipientEnv: Record<PaymentMethod, string> = {
  BANKILY: "PAYMENT_BANKILY_NUMBER",
  MASRVI: "PAYMENT_MASRVI_NUMBER",
  SEDAD: "PAYMENT_SEDAD_NUMBER",
};

function hasValidFileSignature(type: string, bytes: Buffer) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (type === "application/pdf") return bytes.toString("ascii", 0, 5) === "%PDF-";
  return false;
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "La boutique n’est pas encore configurée pour recevoir des commandes." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire de commande invalide." }, { status: 400 });
  }

  const rawOrder = form.get("order");
  if (typeof rawOrder !== "string") {
    return NextResponse.json({ error: "Les informations de commande sont manquantes." }, { status: 400 });
  }
  let orderInput: unknown;
  try {
    orderInput = JSON.parse(rawOrder);
  } catch {
    return NextResponse.json({ error: "Les informations de commande sont invalides." }, { status: 400 });
  }
  const parsed = orderSchema.safeParse(orderInput);
  if (!parsed.success) {
    return NextResponse.json({ error: "Vérifiez les informations de livraison et les produits de la commande." }, { status: 400 });
  }

  const proof = form.get("proof");
  if (!(proof instanceof File) || proof.size <= 0 || proof.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Ajoutez une preuve de paiement de 10 Mo maximum." }, { status: 400 });
  }
  const proofType = proof.type.toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(proofType)) {
    return NextResponse.json({ error: "La preuve doit être une image JPG, PNG, WEBP ou un PDF." }, { status: 415 });
  }
  const proofContent = Buffer.from(await proof.arrayBuffer());
  if (!hasValidFileSignature(proofType, proofContent)) {
    return NextResponse.json({ error: "Le fichier transmis ne correspond pas à son format déclaré." }, { status: 415 });
  }

  const paymentRecipient = process.env[paymentRecipientEnv[parsed.data.paymentMethod]]?.trim();
  if (!paymentRecipient) {
    return NextResponse.json({ error: "Ce moyen de paiement n’est pas encore configuré. Contactez la boutique." }, { status: 503 });
  }

  let storedProof: Awaited<ReturnType<typeof storePaymentProof>>;
  try {
    storedProof = await storePaymentProof(proofContent, proofType);
  } catch (error) {
    console.error("Payment proof storage failed:", error);
    return NextResponse.json({ error: "Le stockage sécurisé des preuves est indisponible." }, { status: 503 });
  }

  try {
    const order = await prisma.$transaction(async (transaction) => {
      const productIds = parsed.data.items.map((item) => item.id);
      const products = await transaction.product.findMany({
        where: { id: { in: productIds }, isActive: true, category: { isActive: true } },
        select: { id: true, name: true, price: true, promoPrice: true },
      });
      if (products.length !== productIds.length) {
        throw new OrderConflictError("Un ou plusieurs produits ne sont plus disponibles.");
      }

      const productById = new Map(products.map((product) => [product.id, product]));
      const lines = parsed.data.items.map((item) => {
        const product = productById.get(item.id);
        if (!product) throw new OrderConflictError("Un produit de la commande n’est plus disponible.");
        const unitPrice = product.promoPrice ?? product.price;
        return {
          productId: product.id,
          productName: product.name,
          unitPrice,
          quantity: item.quantity,
          lineTotal: unitPrice.mul(item.quantity),
        };
      });
      const subtotal = lines.reduce(
        (total, line) => total.add(line.lineTotal),
        new Prisma.Decimal(0),
      );

      for (const item of parsed.data.items) {
        const stockUpdate = await transaction.product.updateMany({
          where: { id: item.id, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (stockUpdate.count !== 1) {
          throw new OrderConflictError("Le stock vient de changer. Actualisez votre panier avant de réessayer.");
        }
      }

      const customerData = {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
      };
      const customer = await transaction.customer.findFirst({
        where: {
          OR: [
            { email: { equals: parsed.data.email, mode: "insensitive" } },
            { phone: parsed.data.phone },
          ],
        },
        select: { id: true },
      });
      const savedCustomer = customer
        ? await transaction.customer.update({ where: { id: customer.id }, data: customerData })
        : await transaction.customer.create({ data: customerData });
      const address = await transaction.customerAddress.create({
        data: {
          customerId: savedCustomer.id,
          line1: parsed.data.address,
          postalCode: parsed.data.postalCode,
          city: parsed.data.city,
          country: parsed.data.country,
        },
      });
      const orderNumber = `NA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(5).toString("hex").toUpperCase()}`;
      const trackingToken = randomBytes(32).toString("base64url");
      const createdOrder = await transaction.order.create({
        data: {
          orderNumber,
          trackingToken,
          customerId: savedCustomer.id,
          addressId: address.id,
          paymentMethod: parsed.data.paymentMethod,
          subtotal,
          total: subtotal,
          currency: "MRU",
          items: { create: lines },
          paymentProofs: {
            create: {
              objectKey: storedProof.objectKey,
              contentType: storedProof.contentType,
              fileSize: storedProof.fileSize,
            },
          },
          statusHistory: { create: { status: "PENDING", note: "Commande reçue avec une preuve de paiement." } },
        },
        select: { orderNumber: true, trackingToken: true, total: true, currency: true },
      });
      return createdOrder;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        total: order.total.toNumber(),
        currency: order.currency,
      },
    }, { status: 201 });
  } catch (error) {
    try {
      await deletePrivateMedia(storedProof.objectKey);
    } catch (cleanupError) {
      console.error("Failed to remove orphaned payment proof:", cleanupError);
    }
    if (error instanceof OrderConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Order creation failed:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la commande pour le moment." }, { status: 500 });
  }
}

class OrderConflictError extends Error {}

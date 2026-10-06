import { z } from "zod";

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  price: z.number().finite().positive().max(100_000_000),
  promoPrice: z.number().finite().positive().max(100_000_000).nullable(),
  stock: z.number().int().min(0).max(1_000_000),
  categoryId: z.string().min(1),
  imageUrl: z.string().trim().max(2048).refine((value) => {
    if (value.startsWith("/api/local-media/")) {
      return /^\/api\/local-media\/images\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(value);
    }
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "L’image doit être une URL HTTP(S) valide ou une photo locale."),
  isActive: z.boolean(),
}).refine((value) => value.promoPrice === null || value.promoPrice < value.price, {
  path: ["promoPrice"],
  message: "Le prix promotionnel doit être inférieur au prix normal.",
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean().default(true),
});

export const videoInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  mediaUrl: z.string().url().max(2048),
  objectKey: z.string().min(1).max(512),
  isActive: z.boolean().default(true),
});

export function createSlug(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || "article";
}

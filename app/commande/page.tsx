import CheckoutForm from "@/components/store/checkout-form";
import { prisma } from "@/lib/db";
import { products as sampleProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function CommandePage() {
  const paymentRecipients = {
    BANKILY: process.env.PAYMENT_BANKILY_NUMBER?.trim() ?? "",
    MASRVI: process.env.PAYMENT_MASRVI_NUMBER?.trim() ?? "",
    SEDAD: process.env.PAYMENT_SEDAD_NUMBER?.trim() ?? "",
  };
  const ordersEnabled = Boolean(
    process.env.DATABASE_URL &&
    (
      process.env.LOCAL_MEDIA_STORAGE === "true" ||
      (
        process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY &&
        process.env.MEDIA_PUBLIC_BASE_URL
      )
    ) &&
    Object.values(paymentRecipients).some(Boolean),
  );
  const commonProps = { paymentRecipients, ordersEnabled };

  if (!process.env.DATABASE_URL) {
    return (
      <CheckoutForm
        {...commonProps}
        products={sampleProducts.map((product) => ({ ...product, categoryId: product.category }))}
      />
    );
  }

  const products = await prisma.product.findMany({
    where: { isActive: true, category: { isActive: true } },
    include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  return (
    <CheckoutForm
      {...commonProps}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category.name,
        categoryId: product.categoryId,
        description: product.description,
        price: product.promoPrice?.toNumber() ?? product.price.toNumber(),
        ...(product.promoPrice ? { previousPrice: product.price.toNumber() } : {}),
        stock: product.stock,
        image: product.images[0]?.mediaUrl ?? "",
        color: product.category.name,
      }))}
    />
  );
}

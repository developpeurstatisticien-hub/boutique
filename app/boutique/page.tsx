import ShopClient from "@/components/store/shop-client";
import { prisma } from "@/lib/db";
import { products as sampleProducts, storeCategories } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function BoutiquePage() {
  if (!process.env.DATABASE_URL) {
    return (
      <ShopClient
        products={sampleProducts.map((product) => ({ ...product, categoryId: product.category }))}
        categories={storeCategories}
      />
    );
  }

  const databaseProducts = await prisma.product.findMany({
    where: { isActive: true, category: { isActive: true } },
    include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  const categories = await prisma.category.findMany({
    where: { isActive: true, products: { some: { isActive: true } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <ShopClient
      products={databaseProducts.map((product) => ({
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
        ...(product.stock === 0 ? { tag: "Bientôt de retour" } : {}),
      }))}
      categories={categories}
    />
  );
}

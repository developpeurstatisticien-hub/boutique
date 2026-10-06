import { redirect } from "next/navigation";
import { AdminNavigation, AdminTopbar } from "@/components/admin/admin-navigation";
import { ProductManager } from "@/components/admin/product-manager";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export default async function AdminProductsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/connexion");

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="admin-shell">
      <AdminNavigation email={admin.email} active="products" />
      <section className="admin-main">
        <AdminTopbar title="Produits & catégories" />
        <div className="admin-content">
          <div className="admin-welcome">
            <div><p className="eyebrow"><span /> CATALOGUE</p><h1>Produits & catégories</h1><p>Gérez les articles visibles dans votre boutique.</p></div>
          </div>
          <ProductManager
            categories={categories.map((category) => ({ id: category.id, name: category.name, slug: category.slug, isActive: category.isActive, productCount: products.filter((product) => product.categoryId === category.id).length }))}
            products={products.map((product) => ({
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price.toNumber(),
              promoPrice: product.promoPrice?.toNumber() ?? null,
              stock: product.stock,
              categoryId: product.categoryId,
              categoryName: product.category.name,
              imageUrl: product.images[0]?.mediaUrl ?? "",
              isActive: product.isActive,
            }))}
          />
        </div>
      </section>
    </main>
  );
}

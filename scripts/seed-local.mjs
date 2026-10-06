import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Mode", slug: "mode" },
  { name: "Maison", slug: "maison" },
  { name: "Accessoires", slug: "accessoires" },
];

const demoProducts = [
  {
    name: "Chemise Lina",
    slug: "chemise-lina",
    description: "Coton doux et coupe ample pour tous les jours.",
    price: 68,
    stock: 14,
    categorySlug: "mode",
    imageUrl:
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Vase Sculptural",
    slug: "vase-sculptural",
    description: "Une silhouette organique façonnée à la main.",
    price: 54,
    stock: 5,
    categorySlug: "maison",
    imageUrl:
      "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Sac Atelier",
    slug: "sac-atelier",
    description: "Cuir grainé, lignes épurées et format juste.",
    price: 89,
    promoPrice: 72,
    stock: 8,
    categorySlug: "accessoires",
    imageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85",
  },
];

try {
  const savedCategories = new Map();
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, isActive: true },
      create: category,
    });
    savedCategories.set(saved.slug, saved);
  }

  for (const product of demoProducts) {
    const category = savedCategories.get(product.categorySlug);
    const data = { ...product };
    const imageUrl = data.imageUrl;
    delete data.categorySlug;
    delete data.imageUrl;
    await prisma.product.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        currency: "MRU",
        categoryId: category.id,
        images: {
          create: {
            objectKey: `external:${imageUrl}`,
            mediaUrl: imageUrl,
            altText: data.name,
          },
        },
      },
    });
  }

  console.log("Catégories et produits de démonstration prêts.");
} finally {
  await prisma.$disconnect();
}

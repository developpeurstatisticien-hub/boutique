export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  previousPrice?: number;
  stock: number;
  image: string;
  color: string;
  tag?: string;
};

export type StoreProduct = Product & { categoryId: string };

export const categories = ["Tout voir", "Mode", "Maison", "Accessoires"];

export const storeCategories = categories.slice(1).map((name) => ({ id: name, name }));

export const products: Product[] = [
  {
    id: "sac-atelier",
    name: "Sac Atelier",
    category: "Accessoires",
    description: "Cuir grainé, lignes épurées et format juste.",
    price: 89,
    previousPrice: 112,
    stock: 8,
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85",
    color: "Sable",
    tag: "Coup de cœur",
  },
  {
    id: "chemise-lina",
    name: "Chemise Lina",
    category: "Mode",
    description: "Coton doux et coupe ample pour tous les jours.",
    price: 68,
    stock: 14,
    image:
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1000&q=85",
    color: "Écru",
    tag: "Nouveau",
  },
  {
    id: "vase-sculptural",
    name: "Vase Sculptural",
    category: "Maison",
    description: "Une silhouette organique façonnée à la main.",
    price: 54,
    stock: 5,
    image:
      "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1000&q=85",
    color: "Argile",
  },
  {
    id: "boucles-naya",
    name: "Boucles Naya",
    category: "Accessoires",
    description: "Laiton doré à l’or fin, légères et lumineuses.",
    price: 36,
    previousPrice: 44,
    stock: 0,
    image:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85",
    color: "Or",
    tag: "Dernières pièces",
  },
  {
    id: "pull-noa",
    name: "Pull Noa",
    category: "Mode",
    description: "Maille souple et toucher doux, à porter longtemps.",
    price: 96,
    stock: 7,
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=85",
    color: "Marron glacé",
  },
  {
    id: "bougie-ambre",
    name: "Bougie Ambre",
    category: "Maison",
    description: "Cire végétale et notes boisées, coulée en petite série.",
    price: 29,
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1000&q=85",
    color: "Ambre",
    tag: "Artisanat",
  },
];

export function formatPrice(price: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MRU",
    maximumFractionDigits: 0,
  }).format(price);
}

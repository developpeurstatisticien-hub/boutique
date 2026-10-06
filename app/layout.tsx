import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noma Atelier — Des pièces qui vous ressemblent",
  description:
    "Une sélection singulière d’essentiels durables, de belles matières et d’objets choisis avec soin.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

import Link from "next/link";
import Image from "next/image";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

type AdminNavigationProps = {
  email: string;
  active: "overview" | "products" | "orders" | "videos" | "customers" | "settings";
};

const links = [
  { id: "overview", href: "/admin", label: "Vue d’ensemble", icon: "⌂" },
  { id: "products", href: "/admin/produits", label: "Produits & catégories", icon: "▦" },
  { id: "orders", href: "/admin/commandes", label: "Commandes", icon: "▤" },
  { id: "videos", href: "/admin/videos", label: "Vidéos d’accueil", icon: "▱" },
  { id: "customers", href: "/admin/clients", label: "Clients", icon: "◷" },
  { id: "settings", href: "/admin/compte", label: "Mon compte", icon: "○" },
] as const;

export function AdminNavigation({ email, active }: AdminNavigationProps) {
  return (
    <aside className="admin-sidebar">
      <Link className="brand" href="/admin">
        <Image className="brand__logo" src="/balkissa-beauty-house.png" alt="" width={768} height={768} />
        <span className="brand__name">NOMA <span>ATELIER</span></span>
      </Link>
      <p className="admin-sidebar__caption">ESPACE ADMINISTRATION</p>
      <nav aria-label="Administration">
        {links.map((link, index) => (
          <span key={link.id}>
            {index === 1 && <span className="admin-nav-label">BOUTIQUE</span>}
            {index === 4 && <span className="admin-nav-label">GESTION</span>}
            <Link
              className={`admin-nav-link${active === link.id ? " admin-nav-link--active" : ""}`}
              href={link.href}
            >
              {link.icon} <span>{link.label}</span>
            </Link>
          </span>
        ))}
      </nav>
      <div className="admin-sidebar__bottom">
        <span className="admin-avatar">{email.slice(0, 1).toUpperCase()}</span>
        <span className="admin-email">{email}</span>
        <AdminLogoutButton />
      </div>
    </aside>
  );
}

export function AdminTopbar({ title }: { title: string }) {
  return (
    <header className="admin-topbar">
      <div><span>Administration</span><span aria-hidden="true"> / </span><strong>{title}</strong></div>
      <Link className="admin-view-store" href="/boutique">Voir la boutique <span aria-hidden="true">↗</span></Link>
    </header>
  );
}

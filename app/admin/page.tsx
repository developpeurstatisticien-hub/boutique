import { redirect } from "next/navigation";
import { AdminNavigation, AdminTopbar } from "@/components/admin/admin-navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

function formatRevenue(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MRU",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/connexion");

  const [orders, pending, paid, rejected, revenue, productCount, outOfStock, customerCount, recentOrders] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.count({ where: { status: "REJECTED" } }),
      prisma.order.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
      prisma.product.count(),
      prisma.product.count({ where: { stock: 0, isActive: true } }),
      prisma.customer.count(),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

  const stats = [
    { label: "Total des commandes", value: orders, detail: "Toutes les commandes reçues" },
    { label: "En attente", value: pending, detail: "À examiner" },
    { label: "Validées", value: paid, detail: "Paiements confirmés" },
    { label: "Refusées", value: rejected, detail: "Paiements refusés" },
    { label: "Chiffre d’affaires", value: formatRevenue(revenue._sum.total?.toNumber() ?? 0), detail: "Commandes validées uniquement" },
    { label: "Produits", value: productCount, detail: `${outOfStock} en rupture de stock` },
    { label: "Clients", value: customerCount, detail: "Clients enregistrés" },
  ];

  return (
    <main className="admin-shell">
      <AdminNavigation email={admin.email} active="overview" />
      <section className="admin-main">
        <AdminTopbar title="Vue d’ensemble" />
        <div className="admin-content">
          <div className="admin-welcome">
            <div><p className="eyebrow"><span /> VOTRE BOUTIQUE EN UN COUP D’ŒIL</p><h1>Bonjour, bienvenue.</h1><p>Voici ce qui se passe chez Noma Atelier.</p></div>
            <span className="admin-date">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date())}</span>
          </div>
          <div className="admin-stats">
            {stats.map((stat) => (
              <article className="admin-stat" key={stat.label}>
                <span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small>
              </article>
            ))}
          </div>
          <section className="admin-panel">
            <div className="admin-panel__heading"><div><p className="eyebrow"><span /> ACTIVITÉ RÉCENTE</p><h2>Dernières commandes</h2></div><span>{orders} au total</span></div>
            {recentOrders.length === 0 ? (
              <div className="admin-empty">Les commandes apparaîtront ici dès que la boutique sera connectée à la base de données.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Commande</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
                  <tbody>{recentOrders.map((order) => (
                    <tr key={order.orderNumber}>
                      <td>{order.orderNumber}</td>
                      <td>{order.customer.firstName} {order.customer.lastName}</td>
                      <td>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(order.createdAt)}</td>
                      <td>{new Intl.NumberFormat("fr-FR", { style: "currency", currency: order.currency }).format(order.total.toNumber())}</td>
                      <td><span className={`admin-status admin-status--${order.status.toLowerCase()}`}>{order.status === "PENDING" ? "En attente" : order.status === "PAID" ? "Validée" : "Refusée"}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <p className="admin-data-note">Les statistiques et commandes récentes sont calculées à partir des données enregistrées dans la base de la boutique.</p>
        </div>
      </section>
    </main>
  );
}

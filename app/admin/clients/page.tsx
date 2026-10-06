import { redirect } from "next/navigation";
import { AdminNavigation, AdminTopbar } from "@/components/admin/admin-navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export default async function AdminCustomersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/connexion");
  const customers = await prisma.customer.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="admin-shell">
      <AdminNavigation email={admin.email} active="customers" />
      <section className="admin-main">
        <AdminTopbar title="Clients" />
        <div className="admin-content">
          <div className="admin-welcome"><div><p className="eyebrow"><span /> RELATION CLIENT</p><h1>Clients</h1><p>Coordonnées des clients ayant passé une commande.</p></div></div>
          <section className="admin-panel">
            <div className="admin-panel__heading"><div><p className="eyebrow"><span /> CLIENTÈLE</p><h2>Liste des clients</h2></div><span>{customers.length} client(s)</span></div>
            {customers.length === 0 ? <p className="admin-empty">Les informations client apparaîtront après la réception de commandes.</p> : (
              <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>Client</th><th>Contact</th><th>Téléphone</th><th>Commandes</th><th>Inscription</th></tr></thead>
                <tbody>{customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.firstName} {customer.lastName}</td>
                    <td><a href={`mailto:${customer.email}`}>{customer.email}</a></td>
                    <td><a href={`tel:${customer.phone}`}>{customer.phone}</a></td>
                    <td>{customer._count.orders}</td>
                    <td>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(customer.createdAt)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

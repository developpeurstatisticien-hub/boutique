import { redirect } from "next/navigation";
import { AdminNavigation, AdminTopbar } from "@/components/admin/admin-navigation";
import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const statusLabels = { PENDING: "En attente", PAID: "Payée / validée", REJECTED: "Refusée" } as const;

export default async function AdminOrdersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/connexion");
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      address: true,
      items: true,
      paymentProofs: { orderBy: { uploadedAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="admin-shell">
      <AdminNavigation email={admin.email} active="orders" />
      <section className="admin-main">
        <AdminTopbar title="Commandes" />
        <div className="admin-content">
          <div className="admin-welcome">
            <div><p className="eyebrow"><span /> SUIVI DES VENTES</p><h1>Commandes</h1><p>Consultez les demandes, leurs preuves de paiement et leur statut.</p></div>
          </div>
          {orders.length === 0 ? (
            <section className="admin-panel"><p className="admin-empty">Aucune commande enregistrée pour le moment.</p></section>
          ) : (
            <div className="admin-order-list">{orders.map((order) => (
              <article className="admin-panel admin-order-card" key={order.id}>
                <div className="admin-order-heading">
                  <div><span className="admin-order-number">{order.orderNumber}</span><span className={`admin-status admin-status--${order.status.toLowerCase()}`}>{statusLabels[order.status]}</span></div>
                  <span>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}</span>
                </div>
                <div className="admin-order-columns">
                  <section><h3>Client & livraison</h3><p><strong>{order.customer.firstName} {order.customer.lastName}</strong></p><p>{order.customer.email}<br />{order.customer.phone}</p><p>{order.address.line1}<br />{order.address.postalCode} {order.address.city}<br />{order.address.country}</p></section>
                  <section><h3>Articles commandés</h3>{order.items.map((item) => <p className="admin-order-item" key={item.id}><span>{item.quantity} × {item.productName}</span><strong>{new Intl.NumberFormat("fr-FR", { style: "currency", currency: order.currency }).format(item.lineTotal.toNumber())}</strong></p>)}<p className="admin-order-total"><span>Total · {order.paymentMethod}</span><strong>{new Intl.NumberFormat("fr-FR", { style: "currency", currency: order.currency }).format(order.total.toNumber())}</strong></p></section>
                  <section><h3>Preuve de paiement</h3>{order.paymentProofs.length === 0 ? <p>Aucune preuve envoyée.</p> : order.paymentProofs.map((proof) => <p key={proof.id}><a className="admin-table-action" href={`/api/admin/preuves/${proof.id}`} target="_blank" rel="noreferrer">Ouvrir la preuve ({proof.contentType}, {Math.ceil(proof.fileSize / 1024)} Ko) ↗</a><small className="admin-proof-date">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(proof.uploadedAt)}</small></p>)}</section>
                </div>
                <div className="admin-order-actions"><span>Changer le statut</span><OrderStatusActions id={order.id} status={order.status} /></div>
              </article>
            ))}</div>
          )}
        </div>
      </section>
    </main>
  );
}

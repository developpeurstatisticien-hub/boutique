import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

const statusLabels = {
  PENDING: "En attente de vérification",
  PAID: "Paiement validé",
  REJECTED: "Paiement refusé",
} as const;

const paymentLabels = {
  BANKILY: "Bankily",
  MASRVI: "Masrvi",
  SEDAD: "Sedad",
} as const;

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) notFound();

  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    select: {
      orderNumber: true,
      status: true,
      paymentMethod: true,
      total: true,
      currency: true,
      createdAt: true,
      items: {
        select: { productName: true, quantity: true, unitPrice: true, lineTotal: true },
      },
      statusHistory: {
        select: { status: true, note: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!order) notFound();

  return (
    <main className="checkout-page">
      <header className="store-header">
        <Link className="brand" href="/boutique" aria-label="Retour à la boutique">
          <Image className="brand__logo" src="/balkissa-beauty-house.png" alt="" width={768} height={768} />
          <span className="brand__name">NOMA <span>ATELIER</span></span>
        </Link>
        <Link className="checkout-back" href="/boutique">← Boutique</Link>
      </header>
      <section className="checkout-result order-tracking">
        <span className="checkout-result__icon" aria-hidden="true">
          {order.status === "PAID" ? "✓" : order.status === "REJECTED" ? "!" : "…"}
        </span>
        <p className="eyebrow"><span /> SUIVI DE COMMANDE</p>
        <h1>{statusLabels[order.status]}</h1>
        <p>
          Commande <strong>{order.orderNumber}</strong> · {new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          }).format(order.createdAt)}
        </p>
        <div className={`tracking-status tracking-status--${order.status.toLowerCase()}`}>
          {statusLabels[order.status]}
        </div>
        <div className="tracking-items">
          {order.items.map((item) => (
            <div className="tracking-item" key={`${item.productName}-${item.quantity}`}>
              <span>{item.productName} × {item.quantity}</span>
              <strong>{formatPrice(item.lineTotal.toNumber())}</strong>
            </div>
          ))}
          <div className="tracking-item tracking-item--total">
            <span>Total · Paiement {paymentLabels[order.paymentMethod]}</span>
            <strong>{formatPrice(order.total.toNumber())}</strong>
          </div>
        </div>
        <ol className="tracking-history">
          {order.statusHistory.map((entry, index) => (
            <li key={`${entry.status}-${entry.createdAt.toISOString()}-${index}`}>
              <span className="tracking-history__dot" />
              <div>
                <strong>{statusLabels[entry.status]}</strong>
                {entry.note && <p>{entry.note}</p>}
                <time dateTime={entry.createdAt.toISOString()}>
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
        <p className="tracking-privacy">Conservez ce lien privé : il permet de consulter l’état de votre commande.</p>
        <Link className="button button--dark" href="/boutique">Retour à la boutique <span aria-hidden="true">↗</span></Link>
      </section>
      <footer className="checkout-footer">NOMA ATELIER · MERCI POUR VOTRE CONFIANCE</footer>
    </main>
  );
}

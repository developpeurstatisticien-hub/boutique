"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useCart, saveCart } from "@/lib/cart";
import { formatPrice, StoreProduct } from "@/lib/products";

type PaymentMethod = "BANKILY" | "MASRVI" | "SEDAD";
type PaymentRecipients = Record<PaymentMethod, string>;
const paymentMethods: PaymentMethod[] = ["BANKILY", "MASRVI", "SEDAD"];

const paymentLabels: Record<PaymentMethod, string> = {
  BANKILY: "Bankily",
  MASRVI: "Masrvi",
  SEDAD: "Sedad",
};

function isPaymentMethod(value: string): value is PaymentMethod {
  return paymentMethods.some((method) => method === value);
}

export default function CheckoutForm({
  products,
  paymentRecipients,
  ordersEnabled,
}: {
  products: StoreProduct[];
  paymentRecipients: PaymentRecipients;
  ordersEnabled: boolean;
}) {
  const router = useRouter();
  const cart = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const orderLines = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = products.find((item) => item.id === line.id);
        return product ? [{ ...line, product }] : [];
      }),
    [cart, products],
  );
  const total = orderLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!ordersEnabled) {
      setError("La boutique n’est pas encore configurée pour recevoir des commandes.");
      return;
    }
    if (!paymentMethod || !paymentRecipients[paymentMethod]) {
      setError("Le moyen de paiement choisi n’est pas encore configuré.");
      return;
    }
    if (orderLines.length === 0) {
      setError("Votre panier est vide ou contient des produits indisponibles.");
      return;
    }

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const proof = formData.get("proof");
    if (!(proof instanceof File) || proof.size === 0) {
      setError("Ajoutez la capture d’écran de votre paiement.");
      return;
    }
    const order = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      postalCode: formData.get("postalCode"),
      city: formData.get("city"),
      country: formData.get("country"),
      paymentMethod,
      items: orderLines.map(({ id, quantity }) => ({ id, quantity })),
    };
    const submission = new FormData();
    submission.set("order", JSON.stringify(order));
    submission.set("proof", proof);

    setSubmitting(true);
    try {
      const response = await fetch("/api/commandes", { method: "POST", body: submission });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "La commande n’a pas pu être enregistrée.";
        setError(message);
        return;
      }
      if (
        typeof result !== "object" || result === null || !("order" in result) ||
        typeof result.order !== "object" || result.order === null ||
        !("trackingToken" in result.order) || typeof result.order.trackingToken !== "string"
      ) {
        throw new Error("Réponse de commande invalide.");
      }
      saveCart([]);
      router.push(`/commande/suivi/${encodeURIComponent(result.order.trackingToken)}`);
    } catch {
      setError("Une erreur de connexion est survenue. Vérifiez votre réseau et réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="checkout-page">
      <header className="store-header">
        <Link className="brand" href="/boutique" aria-label="Retour à la boutique">
          <Image className="brand__logo" src="/balkissa-beauty-house.png" alt="" width={768} height={768} />
          <span className="brand__name">NOMA <span>ATELIER</span></span>
        </Link>
        <Link className="checkout-back" href="/boutique">← Continuer mes découvertes</Link>
      </header>

      <div className="checkout-layout">
        <section className="checkout-form-wrap">
          <p className="eyebrow"><span /> DERNIÈRE ÉTAPE</p>
          <h1>Finaliser la commande</h1>
          <p className="checkout-intro">Renseignez vos coordonnées, effectuez le paiement et joignez sa capture pour enregistrer votre commande.</p>
          {!ordersEnabled && (
            <p className="checkout-alert" role="status">
              Les commandes sont désactivées tant que la base, le stockage sécurisé et un moyen de paiement ne sont pas configurés.
            </p>
          )}
          {error && <p className="checkout-alert" role="alert">{error}</p>}
          <form className="checkout-form" onSubmit={handleSubmit}>
            <fieldset disabled={!ordersEnabled || submitting}>
              <legend><span>01</span> Vos coordonnées</legend>
              <div className="field-row">
                <label>Prénom<input name="firstName" autoComplete="given-name" maxLength={100} required /></label>
                <label>Nom<input name="lastName" autoComplete="family-name" maxLength={100} required /></label>
              </div>
              <label>Adresse e-mail<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
              <label>Téléphone<input name="phone" type="tel" autoComplete="tel" maxLength={32} required /></label>
            </fieldset>
            <fieldset disabled={!ordersEnabled || submitting}>
              <legend><span>02</span> Adresse de livraison</legend>
              <label>Adresse<input name="address" autoComplete="street-address" maxLength={300} required /></label>
              <div className="field-row">
                <label>Code postal<input name="postalCode" autoComplete="postal-code" maxLength={30} /></label>
                <label>Ville<input name="city" autoComplete="address-level2" maxLength={100} required /></label>
              </div>
              <label>Pays<input name="country" autoComplete="country-name" defaultValue="Mauritanie" maxLength={100} required /></label>
            </fieldset>
            <fieldset disabled={!ordersEnabled || submitting}>
              <legend><span>03</span> Paiement</legend>
              <label>Moyen de paiement
                <select
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPaymentMethod(isPaymentMethod(value) ? value : "");
                  }}
                  required
                >
                  <option value="" disabled>Choisir un moyen de paiement</option>
                  {paymentMethods.map((method) => (
                    <option value={method} key={method} disabled={!paymentRecipients[method]}>
                      {paymentLabels[method]}{paymentRecipients[method] ? "" : " — indisponible"}
                    </option>
                  ))}
                </select>
              </label>
              {paymentMethod && paymentRecipients[paymentMethod] && (
                <div className="payment-instructions">
                  <span aria-hidden="true">i</span>
                  <p>Effectuez le transfert de <strong>{formatPrice(total)}</strong> vers le compte {paymentLabels[paymentMethod]} <strong>{paymentRecipients[paymentMethod]}</strong>, puis joignez la capture.</p>
                </div>
              )}
              {!paymentMethod && (
                <div className="payment-instructions">
                  <span aria-hidden="true">i</span>
                  <p>Les moyens de paiement disponibles seront indiqués ici. La commande reste en attente jusqu’à vérification par la boutique.</p>
                </div>
              )}
              <label className="proof-upload">
                <span>Capture d’écran de paiement <b>*</b></span>
                <input
                  name="proof"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  required
                />
                <span className="proof-upload__hint">PNG, JPG, WEBP ou PDF · 10 Mo maximum</span>
              </label>
            </fieldset>
            <button className="button button--dark checkout-submit" type="submit" disabled={!ordersEnabled || submitting || orderLines.length === 0}>
              {submitting ? "Enregistrement…" : "Confirmer la commande"} <span aria-hidden="true">↗</span>
            </button>
          </form>
        </section>

        <aside className="order-summary">
          <p className="eyebrow"><span /> RÉCAPITULATIF</p>
          <h2>Votre sélection</h2>
          {orderLines.length === 0 ? (
            <div className="summary-empty"><p>Votre panier est vide ou indisponible.</p><Link className="text-link" href="/boutique">Découvrir la collection</Link></div>
          ) : (
            <>
              <div className="summary-items">
                {orderLines.map(({ id, quantity, product }) => (
                  <div className="summary-item" key={id}>
                    <div className="summary-item__image" style={{ backgroundImage: product.image ? `url("${product.image}")` : undefined }} />
                    <div><strong>{product.name}</strong><span>Qté : {quantity}</span></div>
                    <strong>{formatPrice(product.price * quantity)}</strong>
                  </div>
                ))}
              </div>
              <div className="summary-total"><span>Total des articles</span><strong>{formatPrice(total)}</strong></div>
              <p className="summary-shipping">Livraison : à confirmer par la boutique.</p>
            </>
          )}
        </aside>
      </div>
      <footer className="checkout-footer">NOMA ATELIER · VOTRE PAIEMENT SERA VÉRIFIÉ PAR LA BOUTIQUE</footer>
    </main>
  );
}

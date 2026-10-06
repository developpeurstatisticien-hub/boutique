"use client";

import { useState } from "react";

type Status = "PENDING" | "PAID" | "REJECTED";

export function OrderStatusActions({ id, status }: { id: string; status: Status }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(nextStatus: Status) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/commandes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result: { error?: string; order?: { status: Status } } = await response.json();
      if (!response.ok || !result.order) {
        setError(result.error ?? "Le statut n’a pas été modifié.");
        return;
      }
      setCurrentStatus(result.order.status);
    } catch {
      setError("Le serveur est momentanément inaccessible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-status-actions">
      <button disabled={busy || currentStatus === "PAID"} onClick={() => void update("PAID")}>Valider le paiement</button>
      <button disabled={busy || currentStatus === "REJECTED"} onClick={() => void update("REJECTED")}>Refuser</button>
      {currentStatus !== "PENDING" && <button disabled={busy} onClick={() => void update("PENDING")}>Remettre en attente</button>}
      {error && <span className="admin-form-message--error" role="alert">{error}</span>}
    </div>
  );
}

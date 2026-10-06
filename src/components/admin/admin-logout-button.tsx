"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) {
        setError("La déconnexion a échoué. Réessayez.");
        return;
      }
      router.replace("/admin/connexion");
      router.refresh();
    } catch {
      setError("Le serveur est momentanément inaccessible.");
    }
  }

  return (
    <div>
      <button className="admin-logout" onClick={logout}>Se déconnecter <span aria-hidden="true">↗</span></button>
      {error && <p className="admin-logout__error" role="alert">{error}</p>}
    </div>
  );
}

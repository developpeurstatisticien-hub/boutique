"use client";

import { FormEvent, useState } from "react";

export function AdminPasswordForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword: formData.get("newPassword"),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Le mot de passe n’a pas pu être modifié.";
        setError(message);
        return;
      }

      form.reset();
      setSuccess("Votre mot de passe a été modifié.");
    } catch {
      setError("Le serveur est momentanément inaccessible. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-password-form" onSubmit={handleSubmit}>
      <label>
        Mot de passe actuel
        <input name="currentPassword" type="password" autoComplete="current-password" maxLength={128} required />
      </label>
      <label>
        Nouveau mot de passe
        <input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
      </label>
      <p className="admin-password-hint">Choisissez au moins 12 caractères et ne réutilisez pas un mot de passe partagé ailleurs.</p>
      {error && <p className="admin-login__error" role="alert">{error}</p>}
      {success && <p className="admin-password-success" role="status">{success}</p>}
      <button className="button button--dark" type="submit" disabled={pending}>
        {pending ? "Modification…" : "Modifier le mot de passe"}
      </button>
    </form>
  );
}

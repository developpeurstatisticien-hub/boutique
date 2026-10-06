"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Connexion impossible.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Le serveur est momentanément inaccessible. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="admin-login">
      <Link className="brand" href="/">
        <Image className="brand__logo" src="/balkissa-beauty-house.png" alt="" width={768} height={768} />
        <span className="brand__name">NOMA <span>ATELIER</span></span>
      </Link>
      <section className="admin-login__card">
        <p className="eyebrow"><span /> ESPACE PRIVÉ</p>
        <h1>Administration</h1>
        <p>Connectez-vous pour gérer la boutique.</p>
        <form onSubmit={handleSubmit}>
          <label>Adresse e-mail<input name="email" type="email" autoComplete="username" required /></label>
          <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
          {error && <p className="admin-login__error" role="alert">{error}</p>}
          <button className="button button--dark" type="submit" disabled={pending}>
            {pending ? "Connexion…" : "Se connecter"} <span aria-hidden="true">↗</span>
          </button>
        </form>
        <Link className="admin-login__back" href="/">← Retour à la boutique</Link>
      </section>
      <span className="admin-login__caption">ACCÈS RÉSERVÉ AUX ADMINISTRATEURS AUTORISÉS</span>
    </main>
  );
}

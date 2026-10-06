import { redirect } from "next/navigation";
import { AdminNavigation, AdminTopbar } from "@/components/admin/admin-navigation";
import { AdminPasswordForm } from "@/components/admin/admin-password-form";
import { getCurrentAdmin } from "@/lib/admin-auth";

export default async function AdminAccountPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/connexion");

  return (
    <main className="admin-shell">
      <AdminNavigation email={admin.email} active="settings" />
      <section className="admin-main">
        <AdminTopbar title="Mon compte" />
        <div className="admin-content">
          <div className="admin-welcome">
            <div>
              <p className="eyebrow"><span /> SÉCURITÉ DU COMPTE</p>
              <h1>Mon compte</h1>
              <p>{admin.email}</p>
            </div>
          </div>
          <section className="admin-panel admin-account-panel">
            <div className="admin-panel__heading">
              <div><p className="eyebrow"><span /> IDENTIFIANTS</p><h2>Changer le mot de passe</h2></div>
            </div>
            <AdminPasswordForm />
          </section>
        </div>
      </section>
    </main>
  );
}

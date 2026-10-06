import { redirect } from "next/navigation";
import { AdminNavigation, AdminTopbar } from "@/components/admin/admin-navigation";
import { VideoManager } from "@/components/admin/video-manager";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export default async function AdminVideosPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/connexion");
  const videos = await prisma.landingVideo.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  return (
    <main className="admin-shell">
      <AdminNavigation email={admin.email} active="videos" />
      <section className="admin-main">
        <AdminTopbar title="Vidéos d’accueil" />
        <div className="admin-content">
          <div className="admin-welcome">
            <div><p className="eyebrow"><span /> PLATEFORME D’ACCUEIL</p><h1>Vidéos d’accueil</h1><p>Les vidéos actives apparaissent sur la page d’entrée de la boutique.</p></div>
          </div>
          <VideoManager videos={videos.map((video) => ({
            id: video.id, title: video.title, mediaUrl: video.mediaUrl,
            objectKey: video.objectKey, isActive: video.isActive, sortOrder: video.sortOrder,
          }))} />
        </div>
      </section>
    </main>
  );
}

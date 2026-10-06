import Link from "next/link";
import Image from "next/image";
import { LandingVideoBackground } from "@/components/store/landing-video-background";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const videos = process.env.DATABASE_URL
    ? await prisma.landingVideo.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { mediaUrl: true },
      })
    : [];

  return (
    <main className="welcome">
      <LandingVideoBackground videos={videos.map((video) => video.mediaUrl)} />
      <div className="welcome__shade" />
      <header className="welcome__header">
        <Link className="brand brand--light" href="/" aria-label="Noma Atelier, accueil">
          <Image className="brand__logo" src="/balkissa-beauty-house.png" alt="" width={768} height={768} />
          <span className="brand__name">NOMA <span>ATELIER</span></span>
        </Link>
        <span className="welcome__edition">COLLECTION 01 — 2026</span>
      </header>

      <section className="welcome__content">
        <p className="eyebrow eyebrow--light"><span /> LE BEAU, AU QUOTIDIEN</p>
        <h1>Des pièces qui<br />vous ressemblent.</h1>
        <p className="welcome__description">
          Une sélection pensée avec soin. Des essentiels durables, des détails
          qui font la différence.
        </p>
        <Link className="button button--cream welcome__cta" href="/boutique">
          Entrer dans la boutique <span aria-hidden="true">↗</span>
        </Link>
        <span className="welcome__note">Une boutique indépendante, des choix singuliers.</span>
      </section>

      <footer className="welcome__footer">
        <span>DESIGN INTEMPOREL · SÉLECTION RESPONSABLE</span>
        <Link href="/boutique">DÉCOUVRIR LA COLLECTION <span aria-hidden="true">↓</span></Link>
      </footer>
      <span className="welcome__index" aria-hidden="true">01 / 01</span>
    </main>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { createPrivateMediaUrl } from "@/lib/media-storage";
import { getLocalMediaType, isLocalMediaStorageEnabled, readLocalMedia } from "@/lib/local-media";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const { id } = await params;
  const proof = await prisma.paymentProof.findUnique({
    where: { id },
    select: { objectKey: true },
  });
  if (!proof) return NextResponse.json({ error: "Preuve de paiement introuvable." }, { status: 404 });

  try {
    if (isLocalMediaStorageEnabled()) {
      const content = await readLocalMedia(proof.objectKey);
      const contentType = getLocalMediaType(proof.objectKey);
      if (!contentType || !proof.objectKey.startsWith("payment-proofs/")) {
        return NextResponse.json({ error: "Preuve de paiement indisponible." }, { status: 404 });
      }
      return new NextResponse(new Uint8Array(content), {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": "inline",
          "Content-Length": String(content.byteLength),
          "Content-Type": contentType,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return NextResponse.redirect(await createPrivateMediaUrl(proof.objectKey));
  } catch (error) {
    console.error("Admin payment proof retrieval failed:", error);
    return NextResponse.json({ error: "La preuve de paiement est momentanément indisponible." }, { status: 503 });
  }
}

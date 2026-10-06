import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  isValidMediaSignature,
  isLocalMediaStorageEnabled,
  saveLocalMedia,
  verifyLocalUploadGrant,
} from "@/lib/local-media";
import { hasSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!isLocalMediaStorageEnabled()) {
    return NextResponse.json({ error: "Route disponible uniquement en stockage local." }, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("token");
  const grant = token ? verifyLocalUploadGrant(token) : null;
  if (!grant) {
    return NextResponse.json({ error: "Autorisation de téléversement expirée ou invalide." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > grant.size) {
    return NextResponse.json({ error: "Le fichier dépasse la taille autorisée." }, { status: 413 });
  }

  if (!request.body) {
    return NextResponse.json({ error: "Le fichier transmis est vide." }, { status: 400 });
  }

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > grant.size) {
        await reader.cancel();
        return NextResponse.json({ error: "Le fichier dépasse la taille autorisée." }, { status: 413 });
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  const content = Buffer.concat(chunks, size);
  if (
    content.byteLength !== grant.size ||
    !isValidMediaSignature(grant.contentType, content)
  ) {
    return NextResponse.json({ error: "Le fichier est vide ou son format est invalide." }, { status: 415 });
  }

  try {
    await saveLocalMedia(grant.objectKey, content);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Local media upload failed:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer le fichier localement." }, { status: 500 });
  }
}

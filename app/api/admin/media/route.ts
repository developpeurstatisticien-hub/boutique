import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { createPublicMediaUpload } from "@/lib/media-storage";
import { hasSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const body: unknown = await request.json().catch((error: unknown) => {
    if (error instanceof SyntaxError) return null;
    throw error;
  });
  const parsed = z.object({
    kind: z.enum(["image", "video"]),
    contentType: z.string().min(1).max(100),
    size: z.number().int().positive(),
  }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Type ou taille de média invalide." }, { status: 400 });
  }

  try {
    const uploaded = await createPublicMediaUpload(
      parsed.data.kind,
      parsed.data.contentType,
      parsed.data.size,
    );
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unsupported ")) {
      return NextResponse.json({ error: "Format de fichier non accepté." }, { status: 415 });
    }
    if (error instanceof Error && error.message.startsWith("Invalid ")) {
      return NextResponse.json({ error: "Fichier vide ou trop volumineux." }, { status: 413 });
    }
    console.error("Admin media upload failed:", error);
    return NextResponse.json({ error: "Le stockage des médias est indisponible ou mal configuré." }, { status: 503 });
  }
}

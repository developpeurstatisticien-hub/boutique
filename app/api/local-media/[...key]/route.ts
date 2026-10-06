import { NextRequest, NextResponse } from "next/server";
import {
  getLocalMediaType,
  isLocalMediaStorageEnabled,
  isValidLocalMediaKey,
  readLocalMedia,
} from "@/lib/local-media";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ key: string[] }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!isLocalMediaStorageEnabled()) {
    return NextResponse.json({ error: "Médias locaux indisponibles." }, { status: 404 });
  }

  const { key } = await params;
  const mediaKey = key.join("/");
  if (
    !isValidLocalMediaKey(mediaKey) ||
    !mediaKey.startsWith("images/") && !mediaKey.startsWith("videos/")
  ) {
    return NextResponse.json({ error: "Média introuvable." }, { status: 404 });
  }

  const contentType = getLocalMediaType(mediaKey);
  if (!contentType) {
    return NextResponse.json({ error: "Format de média indisponible." }, { status: 415 });
  }

  let content: Buffer;
  try {
    content = await readLocalMedia(mediaKey);
  } catch (error) {
    if (isMissingFile(error)) {
      return NextResponse.json({ error: "Média introuvable." }, { status: 404 });
    }
    console.error("Local public media retrieval failed:", error);
    return NextResponse.json({ error: "Impossible de lire ce média." }, { status: 500 });
  }

  const range = request.headers.get("range");
  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match || (!match[1] && !match[2])) {
      return rangeNotSatisfiable(content.byteLength);
    }
    const start = match[1]
      ? Number(match[1])
      : Math.max(0, content.byteLength - Number(match[2]));
    const end = match[2] && match[1]
      ? Math.min(Number(match[2]), content.byteLength - 1)
      : content.byteLength - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      end < start ||
      start >= content.byteLength
    ) {
      return rangeNotSatisfiable(content.byteLength);
    }
    return new NextResponse(new Uint8Array(content.subarray(start, end + 1)), {
      status: 206,
      headers: {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${content.byteLength}`,
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new NextResponse(new Uint8Array(content), {
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(content.byteLength),
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function rangeNotSatisfiable(size: number) {
  return new NextResponse(null, {
    status: 416,
    headers: {
      "Content-Range": `bytes */${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

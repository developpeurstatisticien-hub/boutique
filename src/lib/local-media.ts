import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";

export type LocalUploadGrant = {
  objectKey: string;
  contentType: string;
  size: number;
  expiresAt: number;
};

const publicExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const privateExtensions: Record<string, string> = {
  ...publicExtensions,
  "application/pdf": "pdf",
};

const extensionTypes = Object.fromEntries(
  Object.entries(privateExtensions).map(([contentType, extension]) => [
    extension,
    contentType,
  ]),
);
const localUploadGrantSchema = z.object({
  objectKey: z.string(),
  contentType: z.string(),
  size: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export function createLocalUploadGrant(
  kind: "image" | "video",
  contentType: string,
  size: number,
) {
  const extension = publicExtensions[contentType];
  const maximumSize = kind === "image" ? 8 * 1024 * 1024 : 100 * 1024 * 1024;
  if (!extension) throw new Error(`Unsupported ${kind} content type.`);
  if (!Number.isSafeInteger(size) || size <= 0 || size > maximumSize) {
    throw new Error(`Invalid ${kind} file size.`);
  }

  const objectKey = `${kind}s/${randomUUID()}.${extension}`;
  const grant: LocalUploadGrant = {
    objectKey,
    contentType,
    size,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
  const signature = sign(payload);
  return {
    grant,
    token: `${payload}.${signature}`,
    mediaUrl: `/api/local-media/${objectKey}`,
  };
}

export function verifyLocalUploadGrant(token: string): LocalUploadGrant | null {
  if (token.length > 2048) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (
    expected.byteLength !== received.byteLength ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const parsed = localUploadGrantSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (!parsed.success || parsed.data.expiresAt < Date.now()) return null;
    const grant = parsed.data;

    const kind = grant.objectKey.startsWith("images/")
      ? "image"
      : grant.objectKey.startsWith("videos/")
        ? "video"
        : null;
    const extension = kind ? publicExtensions[grant.contentType] : undefined;
    const maximumSize = kind === "image" ? 8 * 1024 * 1024 : 100 * 1024 * 1024;
    if (
      !kind ||
      !extension ||
      !Number.isSafeInteger(grant.size) ||
      grant.size <= 0 ||
      grant.size > maximumSize ||
      !Number.isSafeInteger(grant.expiresAt) ||
      grant.expiresAt > Date.now() + 5 * 60 * 1000 ||
      !new RegExp(`^${kind}s/[0-9a-f-]{36}\\.${extension}$`, "i").test(
        grant.objectKey,
      )
    ) {
      return null;
    }

    return grant;
  } catch {
    return null;
  }
}

export function isValidLocalMediaKey(key: string) {
  return /^(images|videos|payment-proofs)\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov|pdf)$/i.test(
    key,
  );
}

export function getLocalMediaType(key: string) {
  const extension = key.split(".").at(-1)?.toLowerCase();
  return extension ? extensionTypes[extension] : undefined;
}

export function isValidMediaSignature(contentType: string, bytes: Buffer) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  }
  if (contentType === "image/webp") {
    return (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }
  if (contentType === "application/pdf") {
    return bytes.toString("ascii", 0, 5) === "%PDF-";
  }
  if (contentType === "video/webm") {
    return bytes.length >= 4 && bytes.subarray(0, 4).equals(
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
    );
  }
  if (contentType === "video/mp4" || contentType === "video/quicktime") {
    return bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp";
  }
  return false;
}

export async function saveLocalMedia(key: string, bytes: Buffer) {
  const path = getLocalMediaPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: "wx" });
}

export async function readLocalMedia(key: string) {
  return readFile(getLocalMediaPath(key));
}

export async function deleteLocalMedia(key: string) {
  await unlink(getLocalMediaPath(key));
}

function getLocalMediaPath(key: string) {
  if (!isValidLocalMediaKey(key)) {
    throw new Error("Invalid local media key.");
  }
  return join(process.cwd(), "local-media", ...key.split("/"));
}

function sign(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function isLocalMediaStorageEnabled() {
  return process.env.LOCAL_MEDIA_STORAGE === "true";
}

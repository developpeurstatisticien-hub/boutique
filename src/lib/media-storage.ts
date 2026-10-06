import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import {
  createLocalUploadGrant,
  deleteLocalMedia,
  isLocalMediaStorageEnabled,
  saveLocalMedia,
} from "@/lib/local-media";

let client: S3Client | undefined;

function getStorageConfig() {
  const { S3_BUCKET, MEDIA_PUBLIC_BASE_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_BUCKET || !MEDIA_PUBLIC_BASE_URL || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("Media storage is not configured. Set S3_BUCKET, S3 credentials and MEDIA_PUBLIC_BASE_URL.");
  }

  return {
    bucket: S3_BUCKET,
    publicBaseUrl: MEDIA_PUBLIC_BASE_URL.replace(/\/+$/, ""),
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  };
}

function getClient(config: ReturnType<typeof getStorageConfig>) {
  client ??= new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: config.credentials,
  });
  return client;
}

export function validatePublicMedia(kind: "image" | "video", contentType: string, size: number) {
  const allowedTypes =
    kind === "image"
      ? new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]])
      : new Map([["video/mp4", "mp4"], ["video/webm", "webm"], ["video/quicktime", "mov"]]);
  const extension = allowedTypes.get(contentType);
  const maxSize = kind === "image" ? 8 * 1024 * 1024 : 100 * 1024 * 1024;

  if (!extension) throw new Error(`Unsupported ${kind} content type.`);
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxSize) {
    throw new Error(`Invalid ${kind} file size.`);
  }

  const config = getStorageConfig();
  const objectKey = `${kind}s/${randomUUID()}.${extension}`;
  const publicBaseUrl = config.publicBaseUrl;
  const mediaUrl = `${publicBaseUrl}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  return { config, objectKey, mediaUrl, contentType, size };
}

export async function createPublicMediaUpload(kind: "image" | "video", contentType: string, size: number) {
  if (isLocalMediaStorageEnabled()) {
    const { grant, token, mediaUrl } = createLocalUploadGrant(kind, contentType, size);
    return {
      objectKey: grant.objectKey,
      mediaUrl,
      uploadUrl: `/api/admin/media/upload?token=${encodeURIComponent(token)}`,
      headers: { "Content-Type": contentType },
    };
  }

  const { config, objectKey, mediaUrl, contentType: validatedContentType } =
    validatePublicMedia(kind, contentType, size);
  const uploadUrl = await getSignedUrl(
    getClient(config),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      ContentType: validatedContentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
    { expiresIn: 300 },
  );
  return {
    objectKey,
    mediaUrl,
    uploadUrl,
    headers: {
      "Content-Type": validatedContentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  };
}

export async function createPrivateMediaUrl(objectKey: string) {
  const config = getStorageConfig();
  return getSignedUrl(
    getClient(config),
    new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }),
    { expiresIn: 60 },
  );
}

export async function storePaymentProof(
  content: Buffer,
  contentType: string,
) {
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  const extension = extensionByType[contentType];
  if (!extension) throw new Error("Unsupported payment proof content type.");

  const objectKey = `payment-proofs/${randomUUID()}.${extension}`;
  if (isLocalMediaStorageEnabled()) {
    await saveLocalMedia(objectKey, content);
    return { objectKey, contentType, fileSize: content.byteLength };
  }

  const config = getStorageConfig();
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: content,
      ContentLength: content.byteLength,
      ContentType: contentType,
      CacheControl: "private, no-store",
    }),
  );
  return { objectKey, contentType, fileSize: content.byteLength };
}

export async function deletePrivateMedia(objectKey: string) {
  if (isLocalMediaStorageEnabled()) {
    await deleteLocalMedia(objectKey);
    return;
  }

  const config = getStorageConfig();
  await getClient(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }),
  );
}

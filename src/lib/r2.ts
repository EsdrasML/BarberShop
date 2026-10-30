import crypto from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const cfg = () => ({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publicUrl: process.env.R2_PUBLIC_URL,
});

export function r2Configured() {
  return Object.values(cfg()).every(Boolean);
}

let client: S3Client | undefined;
function getClient() {
  const c = cfg();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: c.accessKeyId!, secretAccessKey: c.secretAccessKey! },
  });
  return client;
}

/** Sube la imagen al bucket (la clave es aleatoria) y devuelve su URL pública. */
export async function uploadImage(body: Buffer, contentType: string, ext: string) {
  const c = cfg();
  const key = `catalog/${crypto.randomUUID()}.${ext}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: c.bucket!,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${c.publicUrl!.replace(/\/$/, "")}/${key}`;
}

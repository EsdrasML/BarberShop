import { NextResponse } from "next/server";
import sharp from "sharp";
import { r2Configured, uploadImage } from "@/lib/r2";
import { getCurrentUser } from "@/lib/session";

const MAX_BYTES = 8 * 1024 * 1024;

// El tipo se decide por los primeros bytes del archivo, no por el nombre ni el Content-Type enviado.
function sniff(b: Buffer): boolean {
  if (b.length < 13) return false;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true; // JPEG
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true; // PNG
  return b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP"; // WebP
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!r2Configured()) {
    return NextResponse.json({ error: "Cloudflare R2 no está configurado. Revisa las instrucciones del README." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "La imagen supera los 8 MB." }, { status: 413 });

  const original = Buffer.from(await file.arrayBuffer());
  if (!sniff(original)) return NextResponse.json({ error: "Formato no admitido. Usa JPG, PNG o WebP." }, { status: 415 });

  // Compresión: se endereza según la cámara, se limita a 1800 px de lado, se convierte a WebP (mucho más liviano)
  // y se descartan los metadatos (la ubicación GPS de las fotos del celular no se publica).
  let optimized: Buffer;
  try {
    optimized = await sharp(original, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "No se pudo procesar la imagen. Prueba con otra." }, { status: 415 });
  }

  try {
    const url = await uploadImage(optimized, "image/webp", "webp");
    return NextResponse.json({ url, before: original.length, after: optimized.length });
  } catch (e) {
    console.error("Error al subir a R2", e);
    return NextResponse.json({ error: "No se pudo subir la imagen a R2. Revisa las credenciales." }, { status: 502 });
  }
}

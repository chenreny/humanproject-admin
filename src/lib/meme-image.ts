import "server-only";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MIME_BY_FORMAT: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function normalizeMemeImage(file: File): Promise<Buffer> {
  if (!file.size || file.size > MAX_IMAGE_BYTES || !Object.values(MIME_BY_FORMAT).includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image smaller than 3 MB.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (MIME_BY_FORMAT[metadata.format ?? ""] !== file.type || (metadata.pages ?? 1) > 1 || !metadata.width || !metadata.height || metadata.width < 64 || metadata.height < 64) {
    throw new Error("Choose a still JPEG, PNG, or WebP image at least 64 pixels wide and tall.");
  }
  return image.rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

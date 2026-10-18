import "server-only";
import sharp from "sharp";
export async function normalizeMemeImage(file: File): Promise<Buffer> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (metadata.format !== "jpeg" || (metadata.pages ?? 1) > 1 || !metadata.width || !metadata.height) throw new Error("Generated image was not a valid still JPEG.");
  return image.rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

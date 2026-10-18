import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin({ redirectOnFailure: false });
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const db = createServiceClient();
  const { data: caption } = await db.from("captions").select("image_path").eq("id", id).maybeSingle();
  if (!caption?.image_path) return new Response("Not found", { status: 404 });
  const { data, error } = await db.storage.from("meme-images").download(caption.image_path);
  if (error || !data) return new Response("Image unavailable", { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}

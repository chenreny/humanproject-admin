import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

const MIME_BY_EXTENSION: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin({ redirectOnFailure: false });
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const db = createServiceClient();
  const { data: profile } = await db.from("profiles").select("avatar_path").eq("id", id).maybeSingle();
  const avatarPath = profile?.avatar_path;
  if (!avatarPath || !avatarPath.startsWith(`${id}/`)) return new Response("Not found", { status: 404 });
  const match = avatarPath.match(new RegExp(`^${id}/[0-9a-f-]{36}\\.(jpg|png|webp)$`, "i"));
  if (!match) return new Response("Not found", { status: 404 });

  const { data, error } = await db.storage.from("avatars").download(avatarPath);
  if (error || !data) return new Response("Image unavailable", { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: {
    "Content-Type": MIME_BY_EXTENSION[match[1].toLowerCase()],
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  } });
}

import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase";

export type AdminContext = { supabase: Awaited<ReturnType<typeof createSessionClient>>; user: { id: string; email?: string }; profile: { id: string; first_name: string | null; last_name: string | null; is_superadmin: boolean } };

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createSessionClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, first_name, last_name, is_superadmin").eq("id", user.id).maybeSingle();
  if (!profile?.is_superadmin) return null;
  return { supabase, user, profile };
}

export function requireAdmin(): Promise<AdminContext>;
export function requireAdmin(options: { redirectOnFailure: false }): Promise<AdminContext | null>;
export async function requireAdmin(options?: { redirectOnFailure: false }): Promise<AdminContext | null> {
  const context = await getAdminContext();
  if (!context && options?.redirectOnFailure !== false) redirect("/login");
  return context;
}

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local.");
  return { url, key };
}

export async function createSessionClient() {
  const jar = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => { try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server Components cannot write cookies. */ } },
    },
  });
}

export function createServiceClient(): SupabaseClient {
  const { url } = supabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

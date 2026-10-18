import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/?error=callback", request.url));
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/?error=callback", request.url));
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase.from("profiles").select("is_superadmin").eq("id", user.id).maybeSingle();
    if (data?.is_superadmin) return NextResponse.redirect(new URL("/", request.url));
  }
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=not_admin", request.url));
}

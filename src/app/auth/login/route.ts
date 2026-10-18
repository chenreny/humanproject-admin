import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase";
export async function GET(request: NextRequest) {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${request.nextUrl.origin}/auth/callback`, skipBrowserRedirect: true } });
  if (error || !data.url) return NextResponse.redirect(new URL("/?error=login", request.url));
  return NextResponse.redirect(data.url);
}

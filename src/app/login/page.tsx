import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await requireAdmin({ redirectOnFailure: false })) redirect("/");
  const { error } = await searchParams;
  return <main className="login-wrap"><div className="login-card"><Link className="brand" href="/"><span className="brand-mark">h.</span><span><b>humor project</b><small>CONTROL ROOM</small></span></Link><div className="login-lock">⌑</div><h1>Admin sign in</h1><p>Sign in with an authorized Google account to access the Humor Project control room.</p>{error && <div className="error-message">{error === "not_admin" ? "This Google account does not have admin access." : "Sign in could not be completed. Please try again."}</div>}<a className="button primary" href="/auth/login">Continue with Google <span>→</span></a><p style={{margin:"19px 0 0",fontSize:10}}>Admin access is managed by the project owner.</p></div></main>;
}

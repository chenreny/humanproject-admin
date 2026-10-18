import Link from "next/link";
import { AdminShell, PageHeading } from "@/components/admin-shell";
import { requireAdmin, type AdminContext } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
const PAGE_SIZE = 50;
function safeQuery(value: string) { return value.replace(/[%,()]/g, " ").trim().slice(0, 80); }
export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const context = await requireAdmin();
  const params = await searchParams;
  const q = safeQuery(params.q ?? "");
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const db = createServiceClient();
  let profiles: Array<{id:string;first_name:string|null;last_name:string|null;avatar_path:string|null;updated_at:string;is_superadmin:boolean}> = [];
  let total = 0; let loadError: string | null = null;
  if (!q) {
    const users = await db.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    const authUsers = users.data?.users ?? [];
    const ids = authUsers.map((user) => user.id);
    const [{ data, error }, countResult] = await Promise.all([
      ids.length ? db.from("profiles").select("id, first_name, last_name, avatar_path, updated_at, is_superadmin").in("id", ids) : Promise.resolve({ data: [], error: null }),
      db.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    if (error || users.error || countResult.error) loadError = "User data could not be loaded. Confirm service role access and profiles.is_superadmin migration.";
    const profileMap = new Map((data ?? []).map((profile) => [profile.id, profile]));
    profiles = authUsers.map((user) => profileMap.get(user.id)).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
    total = countResult.count ?? 0;
    const lookup = new Map(authUsers.map((user) => [user.id, user]));
    return renderRows(profiles, lookup, q, page, total, loadError, context);
  }
  if (q.includes("@") || /^[0-9a-f-]{8,}$/i.test(q)) {
    // Supabase Auth has no search parameter. Walk its bounded pages for email or ID searches.
    const matches: Array<{id:string;email?:string;created_at?:string}> = [];
    for (let authPage = 1; authPage <= 1000; authPage++) {
      const result = await db.auth.admin.listUsers({ page: authPage, perPage: 1000 });
      if (result.error) { loadError = "Account search could not be completed."; break; }
      const batch = result.data.users;
      matches.push(...batch.filter((user) => `${user.email ?? ""} ${user.id}`.toLowerCase().includes(q.toLowerCase())).map((user) => ({ id: user.id, email: user.email, created_at: user.created_at })));
      if (batch.length < 1000) break;
    }
    const ids = matches.map((user) => user.id);
    if (ids.length) {
      const { data, error } = await db.from("profiles").select("id, first_name, last_name, avatar_path, updated_at, is_superadmin").in("id", ids).order("updated_at", { ascending: false });
      if (error) loadError = "Profile data could not be loaded.";
      profiles = data ?? []; total = profiles.length;
      const lookup = new Map(matches.map((user) => [user.id, { ...user, email: user.email, created_at: user.created_at }]));
      return renderRows(profiles, lookup, q, page, total, loadError, context);
    }
  }
  const { data, count, error } = await db.from("profiles").select("id, first_name, last_name, avatar_path, updated_at, is_superadmin", { count: "exact" }).or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`).order("updated_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) loadError = "Profile search could not be completed.";
  profiles = data ?? []; total = count ?? 0;
  const authMatches = await Promise.all(profiles.map((profile) => db.auth.admin.getUserById(profile.id)));
  const lookup = new Map(authMatches.flatMap((result) => result.data?.user ? [[result.data.user.id, result.data.user] as const] : []));
  return renderRows(profiles, lookup, q, page, total, loadError, context);
}
function renderRows(profiles: Array<{id:string;first_name:string|null;last_name:string|null;avatar_path:string|null;updated_at:string;is_superadmin:boolean}>, lookup: Map<string, {id:string;email?:string;created_at?:string}>, q: string, page: number, total: number, error: string|null, context: AdminContext) {
  const rows = profiles.map((profile) => ({ ...profile, email: lookup.get(profile.id)?.email ?? "—", created: lookup.get(profile.id)?.created_at ?? profile.updated_at }));
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (next: number) => `/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(next) }).toString()}`;
  return <AdminShell context={context} active="/users"><div className="content"><PageHeading eyebrow="COMMUNITY DIRECTORY" title="Users" description="Member profiles and Google account details across the community."/><div className="table-wrap"><div className="table-toolbar"><form action="/users" method="get"><input type="hidden" name="page" value="1"/><input className="search" name="q" defaultValue={q} placeholder="Search name, email, or user ID"/></form><span className="tag">{total.toLocaleString()} profiles</span></div>{error ? <div className="error-message" style={{margin:14}}>{error}</div> : <table className="table"><thead><tr><th>Member</th><th>Account</th><th>Role</th><th>Joined</th><th>User ID</th></tr></thead><tbody>{rows.map((user) => <tr key={user.id}><td><b>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "New member"}</b></td><td>{user.email}</td><td><span className={`tag ${user.is_superadmin ? "purple" : ""}`}>{user.is_superadmin ? "Super admin" : "Member"}</span></td><td className="subtle">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(user.created))}</td><td className="mono">{user.id.slice(0, 8)}…{user.id.slice(-4)}</td></tr>)}</tbody></table>}{!error && rows.length === 0 && <div className="empty"><b>No members found</b>Try a different search.</div>}<div className="pagination"><span>Showing {total ? Math.min((page - 1) * PAGE_SIZE + 1, total) : 0}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}</span><span className="page-links">{page > 1 && <Link className="button" href={link(page - 1)}>← Previous</Link>}{page < pageCount && <Link className="button" href={link(page + 1)}>Next →</Link>}</span></div></div></div></AdminShell>;
}

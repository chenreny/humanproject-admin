import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminShell, PageHeading } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createServiceClient();
  const [{ data: profile }, { data: authResult }] = await Promise.all([
    db.from("profiles").select("id, first_name, last_name, avatar_path, updated_at, is_superadmin").eq("id", id).maybeSingle(),
    db.auth.admin.getUserById(id),
  ]);
  if (!profile) notFound();
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "New member";
  const joined = authResult.user?.created_at ?? profile.updated_at;
  return <AdminShell context={context} active="/users"><div className="content">
    <PageHeading eyebrow="MEMBER PROFILE" title={name} description="Profile and account details for this community member." action={<Link className="button" href="/users">← Back to users</Link>} />
    <section className="profile-card">
      <div className="profile-avatar-wrap">
        {profile.avatar_path ? <Image className="profile-avatar" src={`/users/${profile.id}/avatar`} alt={`${name}'s profile picture`} width={128} height={128} unoptimized /> : <div className="profile-avatar profile-avatar-fallback" aria-label="No profile picture">{name.slice(0, 1).toUpperCase()}</div>}
      </div>
      <div className="profile-info">
        <span className={`tag ${profile.is_superadmin ? "purple" : ""}`}>{profile.is_superadmin ? "Super admin" : "Member"}</span>
        <h2>{name}</h2>
        <dl><div><dt>Email</dt><dd>{authResult.user?.email ?? "—"}</dd></div><div><dt>Joined</dt><dd>{new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(joined))}</dd></div><div><dt>User ID</dt><dd className="mono">{profile.id}</dd></div></dl>
      </div>
    </section>
  </div></AdminShell>;
}

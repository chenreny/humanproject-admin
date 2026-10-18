import Link from "next/link";
import { AdminShell, PageHeading } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { readVoteSummary } from "@/lib/analytics";

function shortDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value)); }
export default async function Dashboard() {
  const context = await requireAdmin();
  const db = createServiceClient();
  // This authenticated dashboard is request-time rendered; use a rolling seven-day window.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 6 * 86_400_000).toISOString();
  const [users, captions, successfulRequests, failedRequests, recentCaptions, topics, latest, captionVoteSummary, curatedVoteSummary] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("captions").select("id", { count: "exact", head: true }),
    db.from("generation_requests").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "completed"),
    db.from("generation_requests").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "failed"),
    db.from("captions").select("created_at").gte("created_at", since),
    db.from("captions").select("topic,created_at").order("created_at", { ascending: false }).limit(1000),
    db.from("captions").select("id, setup, punchline, topic, created_at").order("created_at", { ascending: false }).limit(4),
    readVoteSummary(db, "caption_votes", since),
    readVoteSummary(db, "curated_meme_votes", since),
  ]);
  const chart = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date), caption: (recentCaptions.data ?? []).filter((row) => row.created_at.slice(0, 10) === key).length, vote: (captionVoteSummary.byDay[key] ?? 0) + (curatedVoteSummary.byDay[key] ?? 0) };
  });
  const max = Math.max(1, ...chart.map((x) => Math.max(x.caption, x.vote)));
  const voteCount = captionVoteSummary.count + curatedVoteSummary.count;
  const pathFor = (kind: "caption" | "vote") => chart.map((point, i) => `${i ? "L" : "M"} ${i * 100} ${170 - point[kind] / max * 142}`).join(" ");
  const errors = [users.error, captions.error, successfulRequests.error, failedRequests.error, recentCaptions.error, topics.error, latest.error, captionVoteSummary.error, curatedVoteSummary.error].filter(Boolean);
  const complete = successfulRequests.count ?? 0;
  const failed = failedRequests.count ?? 0;
  const upvotes = captionVoteSummary.up + curatedVoteSummary.up;
  const downvotes = captionVoteSummary.down + curatedVoteSummary.down;
  const topicCounts = Object.entries((topics.data ?? []).reduce<Record<string, number>>((acc, item) => { acc[item.topic] = (acc[item.topic] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return <AdminShell context={context} active="/"><div className="content">
    <PageHeading eyebrow="COMMUNITY OVERVIEW" title={`Good evening, ${context.profile.first_name || "there"}.`} description="Here’s what’s happening across your community today." action={<Link className="button primary" href="/media/new">＋ Create AI media</Link>} />
    {errors.length > 0 && <div className="error-message">Some dashboard data could not be loaded. Check Supabase configuration and schema access.</div>}
    <section className="stats-grid">
      <Stat label="Total members" value={users.count} icon="♙" note="Profiles in your community" />
      <Stat label="Published memes" value={captions.count} icon="▧" note="AI media in the feed" tint="purple" />
      <Stat label="Generations · 7 days" value={complete} icon="✦" note={`${failed} failed · ${complete + failed} total attempts`} tint="purple" />
      <Stat label="Votes · 7 days" value={voteCount} icon="↗" note={`${upvotes} upvotes · ${downvotes} downvotes`} tint="blue" />
    </section>
    <section className="dash-grid">
      <div className="panel"><div className="panel-head"><div><h2>Community activity</h2><p>Last 7 days · vote totals exact; meme trend uses up to 1,000 recent records</p></div><div className="chart-legend"><span><i /> Memes</span><span><i className="purple" /> Votes</span></div></div>
        <div className="chart"><svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label="Community activity trend"><defs><linearGradient id="areaLime" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#c8f169" stopOpacity=".24"/><stop offset="1" stopColor="#c8f169" stopOpacity="0"/></linearGradient></defs><path d={`${pathFor("caption")} L 600 180 L 0 180 Z`} fill="url(#areaLime)"/><path d={pathFor("caption")} fill="none" stroke="#c8f169" strokeWidth="2.4" vectorEffect="non-scaling-stroke"/><path d={pathFor("vote")} fill="none" stroke="#b5a0ff" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/></svg></div><div className="chart-labels">{chart.map((x) => <span key={x.key}>{x.label}</span>)}</div>
      </div>
      <div className="panel"><div className="panel-head"><div><h2>Most active topics</h2><p>Distribution across up to 1,000 recent memes</p></div><Link className="subtle" href="/media">View media →</Link></div><div className="activity">{topicCounts.map(([topic, count]) => <div className="activity-row" key={topic}><div className="activity-avatar">#</div><div className="activity-main"><b>{topic === "EastVillage" ? "East Village" : topic}</b><small>{count} published memes</small></div><span className="activity-time">{topics.data?.length ? `${Math.round(count / topics.data.length * 100)}%` : "—"}</span></div>)}{topicCounts.length === 0 && <div className="empty">No topic activity yet.</div>}</div><div className="panel-head" style={{marginTop:17,marginBottom:6}}><div><h2>Recent memes</h2></div><Link className="subtle" href="/media">View all →</Link></div><div className="activity">{(latest.data ?? []).map((item) => <div className="activity-row" key={item.id}><div className="activity-avatar">▧</div><div className="activity-main"><b>{item.setup}</b><small>{item.topic} · {item.punchline}</small></div><span className="activity-time">{shortDate(item.created_at)}</span></div>)}{!latest.data?.length && <div className="empty">No published memes yet.</div>}</div></div>
    </section>
    <section className="quick-grid"><Quick href="/users" icon="♙" title="Manage members" note="Review profiles and account activity"/><Quick href="/media" icon="▧" title="Review AI media" note="Edit, remove, or create published memes"/><Quick href="/votes" icon="↗" title="Explore votes" note="See caption and curated meme feedback"/></section>
  </div></AdminShell>;
}
function Stat({ label, value, icon, note, tint, suffix }: { label: string; value: number | string | null; icon: string; note: string; tint?: string; suffix?: string }) { return <div className="stat-card"><div className="stat-head">{label}<span className={`stat-icon ${tint ?? ""}`}>{icon}</span></div><div className="stat-value">{value?.toLocaleString() ?? "—"}{suffix && <span style={{fontSize:11,color:"#92959d",letterSpacing:0}}>{suffix}</span>}</div><div className="stat-foot">{note}</div></div>; }
function Quick({ href, icon, title, note }: { href: string; icon: string; title: string; note: string }) { return <Link href={href} className="quick-card"><span className="quick-icon">{icon}</span><span><b>{title}</b><small>{note}</small></span><span style={{marginLeft:"auto",color:"#747882"}}>↗</span></Link>; }

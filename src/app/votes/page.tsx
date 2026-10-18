import Link from "next/link";
import { AdminShell, PageHeading } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { readVoteSummary } from "@/lib/analytics";
const PAGE_SIZE = 50;
type CaptionVoteRow = { caption_id: string; user_id: string; value: number; created_at: string };
type CuratedVoteRow = { sample_id: string; user_id: string; value: number; created_at: string };
async function fetchCaptionVotePrefix(db: ReturnType<typeof createServiceClient>, needed: number) {
  const rows: CaptionVoteRow[] = [];
  for (let offset = 0; offset < needed; offset += 1000) {
    const end = Math.min(offset + 999, needed - 1);
    const { data, error } = await db.from("caption_votes").select("caption_id,user_id,value,created_at").order("created_at", { ascending: false }).range(offset, end);
    if (error) return { rows, error: error.message };
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < end - offset + 1) break;
  }
  return { rows, error: null as string | null };
}
async function fetchCuratedVotePrefix(db: ReturnType<typeof createServiceClient>, needed: number) {
  const rows: CuratedVoteRow[] = [];
  for (let offset = 0; offset < needed; offset += 1000) {
    const end = Math.min(offset + 999, needed - 1);
    const { data, error } = await db.from("curated_meme_votes").select("sample_id,user_id,value,created_at").order("created_at", { ascending: false }).range(offset, end);
    if (error) return { rows, error: error.message };
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < end - offset + 1) break;
  }
  return { rows, error: null as string | null };
}
export default async function Votes({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const context = await requireAdmin();
  const params = await searchParams;
  const db = createServiceClient();
  const [captionSummary, curatedSummary] = await Promise.all([readVoteSummary(db, "caption_votes"), readVoteSummary(db, "curated_meme_votes")]);
  const total = captionSummary.count + curatedSummary.count;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1));
  const limit = page * PAGE_SIZE;
  const [captionResult, curatedResult] = await Promise.all([
    fetchCaptionVotePrefix(db, limit),
    fetchCuratedVotePrefix(db, limit),
  ]);
  const merged = [...captionResult.rows.map((vote) => ({ ...vote, kind: "Caption" as const, sample: "" })), ...curatedResult.rows.map((vote) => ({ ...vote, kind: "Curated" as const, caption_id: "", sample: vote.sample_id }))].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const votes = merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ids = [...new Set(votes.filter((vote) => vote.kind === "Caption").map((vote) => vote.caption_id))];
  const captions = ids.length ? await db.from("captions").select("id,setup,punchline").in("id", ids) : { data: [], error: null };
  const captionLookup = new Map((captions.data ?? []).map((caption) => [caption.id, caption]));
  const errors = [captionResult.error, curatedResult.error, captions.error, captionSummary.error, curatedSummary.error].filter(Boolean);
  const upCount = captionSummary.up + curatedSummary.up;
  const downCount = captionSummary.down + curatedSummary.down;
  return <AdminShell context={context} active="/votes"><div className="content"><PageHeading eyebrow="COMMUNITY FEEDBACK" title="Votes" description="Review recent votes on generated captions and curated memes."/><section className="stats-grid"><VoteStat label="All-time caption votes" value={captionSummary.count} detail="Generated media"/><VoteStat label="Curated meme votes" value={curatedSummary.count} detail="Featured samples"/><VoteStat label="Upvotes · all time" value={upCount} detail={`${downCount.toLocaleString()} downvotes · ${(upCount + downCount).toLocaleString()} votes total`}/><VoteStat label="Vote directions" value="+1 / −1" detail="One vote per member and item"/></section>{errors.length > 0 && <div className="error-message" style={{marginTop:14}}>Some vote records could not be loaded. Confirm the curated_meme_votes schema and service role configuration.</div>}<div className="table-wrap" style={{marginTop:14}}><div className="table-toolbar"><b style={{fontSize:12,alignSelf:"center"}}>Latest vote activity</b><span className="subtle">Page {page} of {pageCount}</span></div><table className="table"><thead><tr><th>Type</th><th>Content</th><th>Voter ID</th><th>Vote</th><th>Submitted</th></tr></thead><tbody>{votes.map((vote, index) => { const caption = vote.kind === "Caption" ? captionLookup.get(vote.caption_id) : null; return <tr key={`${vote.kind}-${vote.user_id}-${vote.created_at}-${index}`}><td><span className={`tag ${vote.kind === "Curated" ? "purple" : "blue"}`}>{vote.kind}</span></td><td><b>{vote.kind === "Curated" ? vote.sample : caption?.setup ?? vote.caption_id}</b><div className="subtle" style={{marginTop:5}}>{vote.kind === "Curated" ? "Curated community meme" : caption?.punchline ?? "Caption no longer available"}</div></td><td className="mono">{vote.user_id}</td><td><span className={`tag ${vote.value === 1 ? "" : "purple"}`}>{vote.value === 1 ? "+1 Upvote" : "−1 Downvote"}</span></td><td className="subtle">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(vote.created_at))}</td></tr>; })}</tbody></table>{votes.length === 0 && !errors.length && <div className="empty"><b>No votes yet</b>New community activity will appear here.</div>}<div className="pagination"><span>Showing {total ? Math.min((page - 1) * PAGE_SIZE + 1, total) : 0}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} votes</span><span className="page-links">{page > 1 && <Link className="button" href={`/votes?page=${page - 1}`}>← Previous</Link>}{page < pageCount && <Link className="button" href={`/votes?page=${page + 1}`}>Next →</Link>}</span></div></div></div></AdminShell>;
}
function VoteStat({ label, value, detail }: { label: string; value: number | string; detail: string }) { return <div className="stat-card"><div className="stat-head">{label}<span className="stat-icon">↗</span></div><div className="stat-value">{typeof value === "number" ? value.toLocaleString() : value}</div><div className="stat-foot">{detail}</div></div>; }

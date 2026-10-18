import Link from "next/link";
import Image from "next/image";
import { AdminShell, PageHeading } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { ConfirmDelete } from "@/components/confirm-delete";
const PAGE_SIZE = 24;
export default async function Media({ searchParams }: { searchParams: Promise<{ created?: string; updated?: string; deleted?: string; error?: string; page?: string }> }) {
  const context = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const db = createServiceClient();
  const { data, error, count } = await db.from("captions").select("id, setup, punchline, topic, created_at, image_path, image_description", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  return <AdminShell context={context} active="/media"><div className="content"><PageHeading eyebrow="PUBLISHED AI CONTENT" title="AI media" description="Create, review, and maintain the images and captions in your feed." action={<Link className="button primary" href="/media/new">＋ Generate media</Link>}/>
    {params.created && <div className="success-message">Your AI generated meme was published.</div>}{params.updated && <div className="success-message">Caption details saved.</div>}{params.deleted && <div className="success-message">Media and related votes were deleted.</div>}{params.error && <div className="error-message">{params.error}</div>}{error && <div className="error-message">Media could not be loaded. Check the service role key and caption schema.</div>}
    {!error && !data?.length ? <div className="empty"><b>No published media yet</b>Generate the first image and caption to seed the feed.</div> : <div className="media-grid">{(data ?? []).map((item) => <article className="media-card" key={item.id}>{item.image_path ? <Image className="media-image" src={`/media/${item.id}/image`} alt={item.image_description ?? item.setup} width={640} height={420} unoptimized /> : <div className="media-placeholder">Text only · no image attached</div>}<div className="media-body"><div className="media-caption">{item.setup}<br/><b>{item.punchline}</b></div><div className="media-meta"><span className="tag blue">{item.topic}</span><span>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.created_at))}</span></div><div className="media-actions"><Link className="button" href={`/media/${item.id}/edit`}>Edit details</Link><ConfirmDelete id={item.id}/></div></div></article>)}</div>}
    {data && data.length > 0 && <div className="pagination"><span>Showing {count ? Math.min((page - 1) * PAGE_SIZE + 1, count) : 0}–{Math.min(page * PAGE_SIZE, count ?? 0)} of {(count ?? 0).toLocaleString()} published memes</span><span className="page-links">{page > 1 && <Link className="button" href={`/media?page=${page - 1}`}>← Previous</Link>}{page < pageCount && <Link className="button" href={`/media?page=${page + 1}`}>Next →</Link>}</span></div>}
  </div></AdminShell>;
}

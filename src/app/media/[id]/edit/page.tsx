import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminShell, PageHeading } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { updateMedia } from "@/app/actions";
export default async function EditMedia({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const context = await requireAdmin(); const { id } = await params; const { error } = await searchParams;
  const { data, error: dbError } = await createServiceClient().from("captions").select("id, setup, punchline, topic, image_description, image_path").eq("id", id).maybeSingle();
  if (!data && !dbError) notFound();
  return <AdminShell context={context} active="/media"><div className="content"><PageHeading eyebrow="PUBLISHED AI CONTENT" title="Edit meme details" description="Update its caption, topic, or accessible image description." action={<Link className="button" href="/media">← Back to media</Link>}/>{error && <div className="error-message">{error}</div>}{dbError ? <div className="error-message">Could not load this meme: {dbError.message}</div> : data && <div className="form-card">{data.image_path && <Image className="media-image" style={{borderRadius:8,marginBottom:18}} src={`/media/${id}/image`} alt={data.image_description ?? data.setup} width={640} height={420} unoptimized/>}<form action={updateMedia}><input type="hidden" name="id" value={id}/><div className="field"><label htmlFor="setup">Top caption</label><input id="setup" name="setup" defaultValue={data.setup} maxLength={80} required/></div><div className="field"><label htmlFor="punchline">Bottom caption</label><input id="punchline" name="punchline" defaultValue={data.punchline} maxLength={100} required/></div><div className="form-row"><div className="field"><label htmlFor="topic">Topic</label><select id="topic" name="topic" defaultValue={data.topic}>{["Campus", "Ktown", "EastVillage", "NYC", "Dorm life"].map((topic) => <option value={topic} key={topic}>{topic === "EastVillage" ? "East Village" : topic}</option>)}</select></div><div className="field"><label htmlFor="description">Image description</label><input id="description" name="description" defaultValue={data.image_description ?? ""} maxLength={300} required/></div></div><button className="button primary">Save changes</button></form></div>}</div></AdminShell>;
}

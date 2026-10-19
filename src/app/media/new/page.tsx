import Link from "next/link";
import { AdminShell, PageHeading } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { MediaSourceForm } from "./media-source-form";
export const maxDuration = 60;
export default async function NewMedia({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const context = await requireAdmin(); const { error } = await searchParams;
  return <AdminShell context={context} active="/media"><div className="content"><PageHeading eyebrow="AI MEDIA STUDIO" title="Generate a meme" description="Choose an image, write a caption, and publish it to the member feed." action={<Link className="button" href="/media">← Back to media</Link>}/>{error && <div className="error-message">{error}</div>}<MediaSourceForm /></div></AdminShell>;
}

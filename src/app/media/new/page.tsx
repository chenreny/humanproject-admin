import Link from "next/link";
import { AdminShell, PageHeading } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { createMedia } from "@/app/actions";
export const maxDuration = 60;
export default async function NewMedia({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const context = await requireAdmin(); const { error } = await searchParams;
  return <AdminShell context={context} active="/media"><div className="content"><PageHeading eyebrow="AI MEDIA STUDIO" title="Generate a meme" description="Create a new image, write its caption, and publish it to the member feed." action={<Link className="button" href="/media">← Back to media</Link>}/>{error && <div className="error-message">{error}</div>}<form action={createMedia} className="form-card"><p className="form-note">This uses the configured OpenAI image and text models. The generated image and caption will be published to the existing community feed.</p><div className="field"><label htmlFor="prompt">Describe the scene</label><textarea id="prompt" name="prompt" minLength={10} maxLength={500} required placeholder="A Columbia student trying to carry three coffees and a stack of library books through the subway…"/><small>10–500 characters. Avoid names or sensitive personal details.</small></div><div className="field"><label htmlFor="topic">Topic</label><select id="topic" name="topic" defaultValue="Campus">{["Campus", "Ktown", "EastVillage", "NYC", "Dorm life"].map((topic) => <option key={topic} value={topic}>{topic === "EastVillage" ? "East Village" : topic}</option>)}</select></div><button className="button primary" type="submit">✦ Generate and publish</button></form></div></AdminShell>;
}

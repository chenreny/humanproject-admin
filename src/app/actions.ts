"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { normalizeMemeImage } from "@/lib/meme-image";

const TOPICS = ["Campus", "Ktown", "EastVillage", "NYC", "Dorm life"];
const SYSTEM_PROMPT = "Create an original image meme for a Columbia College student exploring NYC. Use a visible detail, expression, or contrast as the joke. Write short, punchy classic meme text: setup 1–80 characters and punchline 1–100 characters. Do not describe the image in the joke. Make it relatable to campus, dorms, student budgets, or NYC. Provide image_description as literal alt text (1–300 characters), without identifying people or inferring sensitive traits. Avoid slurs, harassment, sexual content, and personal attacks. Return JSON with setup, punchline, and image_description only.";

function text(value: FormDataEntryValue | null, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function parseOutput(value: unknown) {
  if (typeof value !== "string") throw new Error("The caption response was empty.");
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object") throw new Error("The caption response was invalid.");
  const data = parsed as Record<string, unknown>;
  if (typeof data.setup !== "string" || data.setup.trim().length < 1 || data.setup.trim().length > 80 || typeof data.punchline !== "string" || data.punchline.trim().length < 1 || data.punchline.trim().length > 100 || typeof data.image_description !== "string" || data.image_description.trim().length < 1 || data.image_description.trim().length > 300) throw new Error("The generated caption did not meet the publication rules.");
  return { setup: data.setup.trim(), punchline: data.punchline.trim(), description: data.image_description.trim() };
}

export async function createMedia(form: FormData) {
  const { user } = await requireAdmin();
  const prompt = text(form.get("prompt"), 500);
  const topic = text(form.get("topic"), 30);
  if (prompt.length < 10 || !TOPICS.includes(topic)) redirect("/media/new?error=Check%20the%20scene%20and%20topic");
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) redirect("/media/new?error=OPENAI_API_KEY%20is%20not%20configured");
  const db = createServiceClient();
  const model = process.env.OPENAI_MODEL || "gpt-6-luna";
  const { data: request, error: insertError } = await db.from("generation_requests").insert({ user_id: user.id, prompt, system_prompt: SYSTEM_PROMPT, topic, model, status: "pending" }).select("id").single();
  if (insertError || !request) redirect("/media/new?error=Could%20not%20start%20generation");
  const imagePath = `${user.id}/${request.id}.jpg`;
  let stored = false;
  try {
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` }, cache: "no-store", signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare", prompt: `Create an original natural-looking 3:2 photograph for a funny student meme about ${topic}. Scene: ${prompt}. Make the visual moment clear and expressive. Do not include text, captions, lettering, watermarks, logos, or recognizable copyrighted characters.`, size: "1536x1024", quality: "low", output_format: "jpeg", output_compression: 60 }),
    });
    if (!imageResponse.ok) throw new Error("Image generation failed.");
    const imagePayload = await imageResponse.json();
    const encoded = imagePayload.data?.[0]?.b64_json;
    if (typeof encoded !== "string") throw new Error("Image generation returned no image.");
    const generatedBytes = Buffer.from(encoded, "base64");
    const imageBytes = await normalizeMemeImage(new File([new Uint8Array(generatedBytes)], "generated.jpg", { type: "image/jpeg" }));
    const { error: uploadError } = await db.storage.from("meme-images").upload(imagePath, imageBytes, { contentType: "image/jpeg", upsert: false });
    if (uploadError) throw new Error("Image upload failed.");
    stored = true;
    const { error: updateError } = await db.from("generation_requests").update({ image_path: imagePath }).eq("id", request.id);
    if (updateError) throw new Error("Image reference could not be saved.");
    const captionResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` }, cache: "no-store", signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ model, store: false, reasoning: { effort: "none" }, max_output_tokens: 400, instructions: SYSTEM_PROMPT, input: [{ role: "user", content: [{ type: "input_text", text: `Topic: ${topic}\nScene: ${prompt}` }, { type: "input_image", image_url: `data:image/jpeg;base64,${imageBytes.toString("base64")}`, detail: "low" }] }], text: { format: { type: "json_schema", name: "caption", strict: true, schema: { type: "object", additionalProperties: false, properties: { setup: { type: "string" }, punchline: { type: "string" }, image_description: { type: "string" } }, required: ["setup", "punchline", "image_description"] } } } }),
    });
    if (!captionResponse.ok) throw new Error("Caption generation failed.");
    const payload = await captionResponse.json();
    if (payload.status !== "completed") throw new Error("Caption generation did not complete.");
    const output = payload.output?.filter((item: { type: string }) => item.type === "message").flatMap((item: { content: { type: string; text?: string }[] }) => item.content).filter((part: { type: string }) => part.type === "output_text").map((part: { text?: string }) => part.text ?? "").join("");
    const caption = parseOutput(output);
    const { error: publishError } = await db.rpc("complete_meme_generation", { p_request_id: request.id, p_setup: caption.setup, p_punchline: caption.punchline, p_image_description: caption.description });
    if (publishError) throw new Error("Caption could not be published.");
  } catch (error) {
    await db.from("generation_requests").update({ status: "failed" }).eq("id", request.id).eq("status", "pending");
    if (stored) await db.storage.from("meme-images").remove([imagePath]);
    redirect(`/media/new?error=${encodeURIComponent(error instanceof Error ? error.message : "Generation failed")}`);
  }
  revalidatePath("/media"); revalidatePath("/");
  redirect("/media?created=1");
}

export async function updateMedia(form: FormData) {
  await requireAdmin();
  const id = text(form.get("id"), 36);
  const setup = text(form.get("setup"), 80);
  const punchline = text(form.get("punchline"), 100);
  const description = text(form.get("description"), 300);
  const topic = text(form.get("topic"), 30);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !setup || !punchline || !description || !TOPICS.includes(topic)) redirect("/media?error=Check%20the%20caption%20fields");
  const db = createServiceClient();
  const { error } = await db.from("captions").update({ setup, punchline, image_description: description, topic }).eq("id", id);
  if (error) redirect(`/media/${id}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/media"); revalidatePath(`/media/${id}/edit`);
  redirect("/media?updated=1");
}

export async function deleteMedia(form: FormData) {
  await requireAdmin();
  const id = text(form.get("id"), 36);
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/media?error=Invalid%20media%20id");
  const db = createServiceClient();
  const { data: caption } = await db.from("captions").select("generation_id, image_path").eq("id", id).maybeSingle();
  if (!caption) redirect("/media?error=Media%20item%20not%20found");
  const { error } = await db.from("generation_requests").delete().eq("id", caption.generation_id);
  if (error) redirect(`/media?error=${encodeURIComponent(error.message)}`);
  if (caption.image_path) await db.storage.from("meme-images").remove([caption.image_path]);
  revalidatePath("/media"); revalidatePath("/votes"); revalidatePath("/");
  redirect("/media?deleted=1");
}

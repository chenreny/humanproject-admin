import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VoteTable = "caption_votes" | "curated_meme_votes";
export async function readVoteSummary(db: SupabaseClient, table: VoteTable, since?: string) {
  let offset = 0;
  let count = 0;
  let up = 0;
  let down = 0;
  const byDay: Record<string, number> = {};
  while (offset < 1_000_000) {
    let query = db.from(table).select("value, created_at").order("created_at", { ascending: false }).range(offset, offset + 999);
    if (since) query = query.gte("created_at", since);
    const { data, error } = await query;
    if (error) return { count, up, down, byDay, error: error.message };
    const batch = data ?? [];
    count += batch.length;
    for (const vote of batch) {
      if (vote.value === 1) up++;
      if (vote.value === -1) down++;
      if (since && vote.created_at) {
        const day = vote.created_at.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
    }
    if (batch.length < 1000) break;
    offset += batch.length;
  }
  return { count, up, down, byDay, error: null as string | null };
}

import type { Analyst, ResearchJob, Source } from "@/lib/api";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Each signed-in user's finished reports, stored in the Supabase `reports` table.
 * The API writes a row when a run completes; row level security limits reads and
 * deletes to the owner, so these queries only ever see the current user's reports.
 */
export type HistoryEntry = {
  thread_id: string;
  topic: string;
  created_at: string;
  completed_at: string;
  analysts: Analyst[];
  sources: Source[];
};

export type HistoryReport = HistoryEntry & { final_report: string };

const TABLE = "reports";
const SUMMARY_COLUMNS = "thread_id, topic, created_at, completed_at, analysts, sources";
const PAGE_SIZE = 50;

function fail(action: string, error: { message: string }): never {
  throw new Error(`Couldn't ${action}: ${error.message}`);
}

/** Newest first, without report bodies so the list stays light. */
export async function listHistory(): Promise<HistoryEntry[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(SUMMARY_COLUMNS)
    .order("completed_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) fail("load your history", error);
  return (data ?? []) as HistoryEntry[];
}

export async function getHistoryReport(threadId: string): Promise<HistoryReport | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(`${SUMMARY_COLUMNS}, final_report`)
    .eq("thread_id", threadId)
    .maybeSingle();
  if (error) fail("open that report", error);
  return (data as HistoryReport | null) ?? null;
}

export async function removeFromHistory(threadId: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq("thread_id", threadId);
  if (error) fail("delete that report", error);
}

export function jobFromHistory(entry: HistoryReport): ResearchJob {
  return {
    thread_id: entry.thread_id,
    status: "completed",
    topic: entry.topic,
    max_analysts: entry.analysts.length,
    max_num_turns: 0,
    analysts: entry.analysts,
    progress: [],
    activity: [],
    sources: entry.sources,
    sections_count: entry.analysts.length,
    total_sections: entry.analysts.length,
    final_report: entry.final_report,
    error: null,
    created_at: entry.created_at,
    updated_at: entry.completed_at,
  };
}

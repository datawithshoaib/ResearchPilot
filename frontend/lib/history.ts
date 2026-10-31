import type { Analyst, ResearchJob, Source } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/config";

/**
 * Finished reports are kept in the browser so they survive backend restarts
 * (the API stores jobs in memory only).
 */
export type HistoryEntry = {
  thread_id: string;
  topic: string;
  created_at: string;
  completed_at: string;
  analysts: Analyst[];
  sources: Source[];
  final_report: string;
};

const MAX_ENTRIES = 12;

export function readHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.history);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(entries));
  } catch {
    // Storage full or blocked: history is a convenience, so drop silently.
  }
}

export function saveToHistory(job: ResearchJob) {
  if (job.status !== "completed" || !job.final_report) return;
  const entry: HistoryEntry = {
    thread_id: job.thread_id,
    topic: job.topic,
    created_at: job.created_at,
    completed_at: job.updated_at,
    analysts: job.analysts,
    sources: job.sources,
    final_report: job.final_report,
  };
  const rest = readHistory().filter((item) => item.thread_id !== job.thread_id);
  writeHistory([entry, ...rest].slice(0, MAX_ENTRIES));
}

export function removeFromHistory(threadId: string) {
  writeHistory(readHistory().filter((item) => item.thread_id !== threadId));
}

export function jobFromHistory(entry: HistoryEntry): ResearchJob {
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

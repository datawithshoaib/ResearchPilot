"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  ApiError,
  api,
  TERMINAL_STATUSES,
  type ResearchJob,
  type StartResearchInput,
} from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/config";
import { saveToHistory } from "@/lib/history";

const MAX_ACTIVITY = 300;
const POLL_INTERVAL_MS = 2_500;

export type Connection = "idle" | "live" | "polling";
type PendingAction = "start" | "resume" | "cancel" | null;

/**
 * Stream snapshots only carry activity the connection has not delivered yet,
 * so append those; full snapshots (GET) replace the list outright.
 */
function mergeJob(previous: ResearchJob | null, next: ResearchJob, partial: boolean): ResearchJob {
  if (!partial || !previous || previous.thread_id !== next.thread_id) return next;
  const lastId = previous.activity.at(-1)?.id ?? 0;
  const fresh = next.activity.filter((event) => event.id > lastId);
  return { ...next, activity: [...previous.activity, ...fresh].slice(-MAX_ACTIVITY) };
}

function storeThread(threadId: string | null) {
  try {
    if (threadId) window.localStorage.setItem(STORAGE_KEYS.activeThread, threadId);
    else window.localStorage.removeItem(STORAGE_KEYS.activeThread);
  } catch {
    // Storage blocked: the run just won't survive a refresh.
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function useResearchJob() {
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);
  const [connection, setConnection] = useState<Connection>("idle");

  const applySnapshot = useCallback((next: ResearchJob, partial: boolean) => {
    setJob((previous) => mergeJob(previous, next, partial));
  }, []);

  const loseJob = useCallback(() => {
    storeThread(null);
    setJob(null);
    toast.error("That research run is no longer available", {
      description: "The server may have restarted. Finished reports stay in your history.",
    });
  }, []);

  // Restore the active run after a refresh.
  useEffect(() => {
    let cancelled = false;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEYS.activeThread);
    } catch {
      saved = null;
    }

    const restore = saved
      ? api
          .getResearch(saved)
          .then((restored) => {
            if (!cancelled) setJob(restored);
          })
          .catch((error) => {
            if (error instanceof ApiError && error.status === 404) storeThread(null);
          })
      : Promise.resolve();

    void restore.finally(() => {
      if (!cancelled) setRestoring(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const threadId = job?.thread_id ?? null;
  const live = job !== null && !TERMINAL_STATUSES.includes(job.status);

  // Live updates: Server-Sent Events, falling back to polling if the stream fails.
  useEffect(() => {
    if (!threadId || !live) return;

    let disposed = false;
    let source: EventSource | null = null;
    let pollTimer: number | undefined;
    let failures = 0;

    const poll = async () => {
      try {
        const next = await api.getResearch(threadId);
        if (disposed) return;
        setConnection("polling");
        applySnapshot(next, false);
      } catch (error) {
        if (disposed) return;
        if (error instanceof ApiError && error.status === 404) {
          loseJob();
          return;
        }
      }
      if (!disposed) pollTimer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    const fallBackToPolling = () => {
      source?.close();
      source = null;
      void poll();
    };

    if (typeof EventSource === "undefined") {
      fallBackToPolling();
    } else {
      source = new EventSource(api.streamUrl(threadId));
      source.addEventListener("job", (event) => {
        failures = 0;
        setConnection("live");
        applySnapshot(JSON.parse((event as MessageEvent<string>).data), true);
      });
      source.addEventListener("end", () => source?.close());
      source.onerror = () => {
        failures += 1;
        // CLOSED means the server refused the stream (e.g. 404); otherwise the
        // browser is reconnecting on its own — give it a couple of tries.
        if (source?.readyState === EventSource.CLOSED || failures >= 3) fallBackToPolling();
      };
    }

    return () => {
      disposed = true;
      source?.close();
      window.clearTimeout(pollTimer);
      setConnection("idle");
    };
  }, [threadId, live, applySnapshot, loseJob]);

  // Persist the active run, and archive finished reports.
  useEffect(() => {
    if (!job) return;
    if (job.status === "completed") saveToHistory(job);
    storeThread(TERMINAL_STATUSES.includes(job.status) && job.status !== "completed" ? null : job.thread_id);
  }, [job]);

  const run = useCallback(async (action: Exclude<PendingAction, null>, task: () => Promise<ResearchJob>) => {
    setPending(action);
    try {
      const next = await task();
      setJob(next);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) loseJob();
      else toast.error(errorMessage(error));
      return false;
    } finally {
      setPending(null);
    }
  }, [loseJob]);

  const start = useCallback(
    (input: StartResearchInput) => run("start", () => api.startResearch(input)),
    [run],
  );

  const resume = useCallback(
    (feedback: string | null) =>
      threadId ? run("resume", () => api.resumeResearch(threadId, feedback)) : Promise.resolve(false),
    [run, threadId],
  );

  const cancel = useCallback(
    () => (threadId ? run("cancel", () => api.cancelResearch(threadId)) : Promise.resolve(false)),
    [run, threadId],
  );

  const reset = useCallback(() => {
    storeThread(null);
    setJob(null);
  }, []);

  const open = useCallback((next: ResearchJob) => {
    setJob(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { job, restoring, pending, connection, start, resume, cancel, reset, open };
}

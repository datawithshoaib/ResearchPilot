"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, type Health } from "@/lib/api";

export type BackendState = "checking" | "waking" | "online" | "misconfigured" | "offline";

// Render's free tier sleeps idle services; a cold start can take ~60s.
const WAKE_HINT_AFTER_MS = 3_500;
const GIVE_UP_AFTER_MS = 100_000;
const ONLINE_REFRESH_MS = 60_000;

export function useBackendHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [state, setState] = useState<BackendState>("checking");
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    startedAt.current = Date.now();

    const wakeHint = window.setTimeout(() => {
      if (!cancelled) setState((current) => (current === "checking" ? "waking" : current));
    }, WAKE_HINT_AFTER_MS);

    const probe = async () => {
      try {
        const next = await api.health(15_000);
        if (cancelled) return;
        setHealth(next);
        setState(next.configured ? "online" : "misconfigured");
        timer = window.setTimeout(probe, ONLINE_REFRESH_MS);
      } catch {
        if (cancelled) return;
        if (Date.now() - startedAt.current > GIVE_UP_AFTER_MS) {
          setState("offline");
          return;
        }
        timer = window.setTimeout(probe, 2_500);
      }
    };
    void probe();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(wakeHint);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState("checking");
    setAttempt((value) => value + 1);
  }, []);

  return { health, state, retry };
}

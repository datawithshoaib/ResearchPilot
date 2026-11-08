import { API_URL } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";

import type { Health, ResearchJob, StartResearchInput } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Network failure or timeout — the request never got an HTTP response. */
  get isNetwork() {
    return this.status === 0;
  }

  /** The session is missing or expired; the user needs to sign in again. */
  get isUnauthorized() {
    return this.status === 401;
  }
}

/** Current Supabase access token; supabase-js refreshes it when it is about to expire. */
async function accessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

type RequestOptions = RequestInit & { timeoutMs?: number };

async function request<T>(path: string, { timeoutMs = 20_000, ...init }: RequestOptions = {}): Promise<T> {
  let response: Response;
  const token = await accessToken();

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("Can't reach the ResearchPilot API. It may be waking up — try again in a moment.", 0);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") message = body.detail;
      else if (Array.isArray(body?.detail) && body.detail[0]?.msg) message = body.detail[0].msg;
    } catch {
      // Keep the fallback message.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  health: (timeoutMs?: number) => request<Health>("/api/health", { timeoutMs }),
  startResearch: (input: StartResearchInput) => post<ResearchJob>("/api/research", input),
  getResearch: (threadId: string) => request<ResearchJob>(`/api/research/${threadId}`),
  resumeResearch: (threadId: string, feedback?: string | null) =>
    post<ResearchJob>(`/api/research/${threadId}/resume`, { feedback: feedback?.trim() || null }),
  cancelResearch: (threadId: string) => post<ResearchJob>(`/api/research/${threadId}/cancel`),
  /** EventSource cannot send headers, so the token rides along as a query parameter. */
  streamUrl: async (threadId: string) => {
    const url = new URL(`${API_URL}/api/research/${threadId}/stream`);
    const token = await accessToken();
    if (token) url.searchParams.set("access_token", token);
    return url.toString();
  },
};

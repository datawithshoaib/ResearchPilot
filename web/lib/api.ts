const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type JobStatus =
  | "queued"
  | "generating_analysts"
  | "awaiting_feedback"
  | "researching"
  | "completed"
  | "failed";

export type Analyst = {
  name: string;
  role: string;
  affiliation: string;
  description: string;
};

export type ResearchJob = {
  thread_id: string;
  status: JobStatus;
  topic: string;
  max_analysts: number;
  max_num_turns: number;
  analysts: Analyst[];
  sections_count: number;
  total_sections: number;
  final_report: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type Health = {
  status: string;
  configured: boolean;
  missing: string[];
};

export type StartResearchInput = {
  topic: string;
  max_analysts: number;
  max_num_turns: number;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      `Cannot reach the ResearchPilot API at ${API_URL}. Is the backend running?`,
      0,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Keep the fallback message.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => request<Health>("/api/health"),
  startResearch: (input: StartResearchInput) =>
    request<ResearchJob>("/api/research", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getResearch: (threadId: string) => request<ResearchJob>(`/api/research/${threadId}`),
  resumeResearch: (threadId: string, feedback?: string | null) =>
    request<ResearchJob>(`/api/research/${threadId}/resume`, {
      method: "POST",
      body: JSON.stringify({ feedback: feedback?.trim() ? feedback.trim() : null }),
    }),
};

export const ACTIVE_STATUSES: JobStatus[] = ["queued", "generating_analysts", "researching"];

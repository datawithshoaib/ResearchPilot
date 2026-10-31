// Mirrors backend/src/researchpilot/api/schemas.py — keep the two in sync.

export type JobStatus =
  | "queued"
  | "generating_analysts"
  | "awaiting_feedback"
  | "researching"
  | "writing_report"
  | "completed"
  | "failed"
  | "cancelled";

export type Analyst = {
  name: string;
  role: string;
  affiliation: string;
  description: string;
};

export type Source = {
  url: string;
  title: string;
};

export type ActivityKind =
  | "status"
  | "error"
  | "analysts"
  | "question"
  | "search"
  | "sources"
  | "answer"
  | "section"
  | "writing";

export type ActivityEvent = {
  id: number;
  kind: ActivityKind;
  analyst: string | null;
  message: string;
  data: { query?: string; sources?: Source[] };
  at: string;
};

export type AnalystProgress = {
  name: string;
  questions: number;
  searches: number;
  sources: number;
  section_title: string | null;
  done: boolean;
};

export type ResearchJob = {
  thread_id: string;
  status: JobStatus;
  topic: string;
  max_analysts: number;
  max_num_turns: number;
  analysts: Analyst[];
  progress: AnalystProgress[];
  activity: ActivityEvent[];
  sources: Source[];
  sections_count: number;
  total_sections: number;
  final_report: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type Health = {
  status: string;
  version: string;
  configured: boolean;
  missing: string[];
  model: string;
  active_jobs: number;
};

export type StartResearchInput = {
  topic: string;
  max_analysts: number;
  max_num_turns: number;
};

export const RUNNING_STATUSES: JobStatus[] = [
  "queued",
  "generating_analysts",
  "researching",
  "writing_report",
];

export const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed", "cancelled"];

/** Base URL of the ResearchPilot FastAPI backend (no trailing slash). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export const STORAGE_KEYS = {
  activeThread: "researchpilot:thread",
  history: "researchpilot:history",
} as const;

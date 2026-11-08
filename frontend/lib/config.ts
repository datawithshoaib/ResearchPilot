/** Base URL of the ResearchPilot FastAPI backend (no trailing slash). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export const STORAGE_KEYS = {
  activeThread: "researchpilot:thread",
  // Legacy: reports used to live in localStorage; now they are stored per user in
  // Supabase. Kept so sign-out clears any old copies.
  history: "researchpilot:history",
} as const;

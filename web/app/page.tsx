"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BookOpenCheck, ShieldCheck, Users } from "lucide-react";

import { AnalystReview } from "@/components/analyst-review";
import { ReportView } from "@/components/report-view";
import { ResearchForm } from "@/components/research-form";
import { ResearchProgress } from "@/components/research-progress";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTIVE_STATUSES,
  ApiError,
  api,
  type Health,
  type ResearchJob,
  type StartResearchInput,
} from "@/lib/api";

const STORAGE_KEY = "researchpilot:thread";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

const FEATURES = [
  {
    icon: Users,
    title: "Analyst panel",
    description:
      "Distinct expert personas are generated for your topic so every angle gets its own interview.",
  },
  {
    icon: ShieldCheck,
    title: "Human in the loop",
    description:
      "Review and revise the panel before research starts. Nothing expensive runs until you approve.",
  },
  {
    icon: BookOpenCheck,
    title: "Cited synthesis",
    description:
      "Interviews are grounded in Tavily web search, and the final report preserves source links.",
  },
];

export default function HomePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [starting, setStarting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .health()
      .then((next) => {
        if (cancelled) return;
        setHealth(next);
        setHealthError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setHealth(null);
        setHealthError(true);
      });

    const savedThread = window.localStorage.getItem(STORAGE_KEY);

    if (savedThread) {
      api
        .getResearch(savedThread)
        .then((restored) => {
          if (!cancelled) setJob(restored);
        })
        .catch((restoreError) => {
          if (restoreError instanceof ApiError && restoreError.status === 404) {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        })
        .finally(() => {
          if (!cancelled) setHydrated(true);
        });
    } else {
      queueMicrotask(() => {
        if (!cancelled) setHydrated(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (job) {
      window.localStorage.setItem(STORAGE_KEY, job.thread_id);
    }
  }, [job]);

  const threadId = job?.thread_id ?? null;
  const status = job?.status ?? null;

  useEffect(() => {
    if (!threadId || !status || !ACTIVE_STATUSES.includes(status)) return;

    let cancelled = false;
    const timer = window.setInterval(() => {
      api
        .getResearch(threadId)
        .then((next) => {
          if (!cancelled) setJob(next);
        })
        .catch((pollError) => {
          if (cancelled) return;
          if (pollError instanceof ApiError && pollError.status === 404) {
            window.localStorage.removeItem(STORAGE_KEY);
            setJob(null);
            setError("The research job is no longer available. Please start again.");
            return;
          }
          setError(messageOf(pollError));
        });
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [threadId, status]);

  async function handleStart(input: StartResearchInput) {
    setStarting(true);
    setError(null);
    try {
      const next = await api.startResearch(input);
      setJob(next);
      setFeedback("");
    } catch (startError) {
      setError(messageOf(startError));
    } finally {
      setStarting(false);
    }
  }

  async function handleResume(nextFeedback: string | null) {
    if (!job) return;
    setResuming(true);
    setError(null);
    try {
      const next = await api.resumeResearch(job.thread_id, nextFeedback);
      setJob(next);
      setFeedback("");
    } catch (resumeError) {
      setError(messageOf(resumeError));
    } finally {
      setResuming(false);
    }
  }

  function handleReset() {
    setJob(null);
    setFeedback("");
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const backendReady = health?.configured ?? true;

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-x-0 top-0 h-[480px]" aria-hidden />

      <div className="relative mx-auto w-full max-w-5xl px-5 pt-8 pb-20 sm:px-8 sm:pt-12">
        <SiteHeader health={health} healthError={healthError} />

        {healthError && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle />
            <AlertTitle>Cannot reach the ResearchPilot API</AlertTitle>
            <AlertDescription>
              Start the backend with{" "}
              <code>uv run uvicorn researchpilot.api.app:app --reload</code> and make sure{" "}
              <code>NEXT_PUBLIC_API_URL</code> points to it.
            </AlertDescription>
          </Alert>
        )}

        {health && !health.configured && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle />
            <AlertTitle>Backend is missing API keys</AlertTitle>
            <AlertDescription>
              Add {health.missing.join(" and ")} to the project <code>.env</code> file and
              restart the API server.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-10">
          {!hydrated ? (
            <LoadingState />
          ) : !job ? (
            <div className="space-y-12">
              <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
                <div className="space-y-5">
                  <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                    AI research workflow
                  </p>
                  <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                    Turn a question into a{" "}
                    <span className="text-muted-foreground">cited research report.</span>
                  </h1>
                  <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
                    ResearchPilot assembles a panel of expert analysts, runs parallel
                    web-grounded interviews, and synthesizes the findings into a single
                    Markdown report with sources.
                  </p>
                  <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span>Review before it runs</span>
                    <span className="hidden sm:inline">·</span>
                    <span>Parallel interviews</span>
                    <span className="hidden sm:inline">·</span>
                    <span>Source-backed output</span>
                  </div>
                </div>

                <ResearchForm
                  onStart={handleStart}
                  starting={starting}
                  disabled={!backendReady}
                />
              </section>

              <section className="grid gap-4 sm:grid-cols-3">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={feature.title} className="gap-3 py-5 shadow-none">
                      <CardHeader className="px-5">
                        <div className="bg-secondary text-secondary-foreground mb-1 flex size-9 items-center justify-center rounded-lg">
                          <Icon className="size-4" />
                        </div>
                        <CardTitle className="text-sm">{feature.title}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </section>
            </div>
          ) : job.status === "awaiting_feedback" ? (
            <AnalystReview
              job={job}
              feedback={feedback}
              onFeedbackChange={setFeedback}
              onApprove={() => handleResume(null)}
              onRegenerate={() => handleResume(feedback)}
              busy={resuming}
            />
          ) : job.status === "completed" ? (
            <ReportView job={job} onReset={handleReset} />
          ) : job.status === "failed" ? (
            <FailureState job={job} onReset={handleReset} />
          ) : (
            <ResearchProgress job={job} />
          )}
        </div>

        <footer className="text-muted-foreground mt-16 border-t pt-6 text-xs">
          ResearchPilot produces AI-assisted drafts. Verify sources before using output for
          business, academic, legal, or financial decisions.
        </footer>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function FailureState({ job, onReset }: { job: ResearchJob; onReset: () => void }) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Research stopped</CardTitle>
        <CardDescription>
          The workflow could not finish this run. This is often caused by missing API keys,
          rate limits, or a transient provider error.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Error details</AlertTitle>
          <AlertDescription>{job.error ?? "Unknown error."}</AlertDescription>
        </Alert>
        <Button onClick={onReset}>Start a new research brief</Button>
      </CardContent>
    </Card>
  );
}

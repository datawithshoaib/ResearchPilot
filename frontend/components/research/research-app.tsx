"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CloudOff, Coffee } from "lucide-react";
import { useCallback, useState } from "react";

import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ResearchComposer } from "@/components/landing/research-composer";
import { SiteHeader } from "@/components/layout/site-header";
import { AnalystReview } from "@/components/research/analyst-review";
import { AssemblingPanel } from "@/components/research/assembling-panel";
import { EndState } from "@/components/research/end-state";
import { HistoryDrawer } from "@/components/research/history-drawer";
import { MissionControl } from "@/components/research/mission-control";
import { MissionStepper } from "@/components/research/mission-stepper";
import { ReportView } from "@/components/research/report-view";
import { useBackendHealth, type BackendState } from "@/hooks/use-backend-health";
import { useResearchJob } from "@/hooks/use-research-job";
import { RUNNING_STATUSES, type ResearchJob } from "@/lib/api";
import { jobFromHistory } from "@/lib/history";

type View = "loading" | "landing" | "assembling" | "review" | "mission" | "report" | "ended";

function viewFor(job: ResearchJob | null, restoring: boolean): View {
  if (restoring) return "loading";
  if (!job) return "landing";
  switch (job.status) {
    case "queued":
    case "generating_analysts":
      return "assembling";
    case "awaiting_feedback":
      return "review";
    case "researching":
    case "writing_report":
      return "mission";
    case "completed":
      return "report";
    default:
      return "ended";
  }
}

export function ResearchApp() {
  const backend = useBackendHealth();
  const research = useResearchJob();
  const { job } = research;
  const [historyOpen, setHistoryOpen] = useState(false);

  // Remember runs we watched live, so only those celebrate on completion.
  const [watchedLive, setWatchedLive] = useState<string[]>([]);
  if (job && RUNNING_STATUSES.includes(job.status) && !watchedLive.includes(job.thread_id)) {
    setWatchedLive([...watchedLive, job.thread_id]);
  }

  const view = viewFor(job, research.restoring);
  const busy = view === "assembling" || view === "mission";
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-5 pt-6 pb-16 sm:px-8 sm:pt-8">
      <SiteHeader
        backendState={backend.state}
        health={backend.health}
        onRetryBackend={backend.retry}
        onHome={() => !busy && research.reset()}
        onOpenHistory={() => setHistoryOpen(true)}
        busy={busy}
      />

      <AnimatePresence>
        {job && view !== "report" && view !== "ended" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-10"
          >
            <MissionStepper status={job.status} />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mt-10 sm:mt-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={view === "landing" || view === "loading" ? view : `${view}-${job?.thread_id}`}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {view === "loading" && <div className="h-[60vh]" />}

            {view === "landing" && (
              <div className="pt-4 sm:pt-10">
                <Hero />
                <BackendNotice state={backend.state} missing={backend.health?.missing ?? []} />
                <div className="mt-10">
                  <ResearchComposer
                    onStart={research.start}
                    starting={research.pending === "start"}
                    disabled={backend.state !== "online"}
                  />
                </div>
                <HowItWorks />
              </div>
            )}

            {view === "assembling" && job && <AssemblingPanel job={job} onCancel={research.cancel} />}

            {view === "review" && job && (
              <AnalystReview
                job={job}
                busy={research.pending !== null}
                onApprove={() => research.resume(null)}
                onRegenerate={(feedback) => research.resume(feedback)}
                onCancel={research.cancel}
              />
            )}

            {view === "mission" && job && (
              <MissionControl
                job={job}
                connection={research.connection}
                cancelling={research.pending === "cancel"}
                onCancel={research.cancel}
              />
            )}

            {view === "report" && job && (
              <ReportView
                job={job}
                celebrateOnMount={watchedLive.includes(job.thread_id)}
                onReset={research.reset}
              />
            )}

            {view === "ended" && job && <EndState job={job} onReset={research.reset} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="text-muted-foreground mt-24 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs sm:flex-row">
        <span>AI-generated drafts — verify sources before relying on them.</span>
        <span>LangGraph · Groq · Tavily</span>
      </footer>

      <HistoryDrawer
        open={historyOpen}
        onClose={closeHistory}
        onSelect={(entry) => research.open(jobFromHistory(entry))}
      />
    </div>
  );
}

function BackendNotice({ state, missing }: { state: BackendState; missing: string[] }) {
  const notices: Partial<Record<BackendState, { icon: typeof Coffee; title: string; body: string }>> = {
    waking: {
      icon: Coffee,
      title: "Waking up the research server",
      body: "Free-tier servers nap when idle. This usually takes under a minute.",
    },
    misconfigured: {
      icon: AlertCircle,
      title: "The API is missing credentials",
      body: `Set ${missing.join(" and ")} on the backend and restart it.`,
    },
    offline: {
      icon: CloudOff,
      title: "Can't reach the research server",
      body: "Check that the backend is running and NEXT_PUBLIC_API_URL points to it, then retry from the status pill.",
    },
  };
  const notice = notices[state];

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mx-auto max-w-2xl overflow-hidden"
        >
          <div className="glass mt-8 flex items-start gap-3 rounded-2xl border p-4">
            <notice.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">{notice.title}</p>
              <p className="text-muted-foreground mt-0.5">{notice.body}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

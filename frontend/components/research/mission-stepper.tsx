"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

import type { JobStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const STEPS = ["Brief", "Panel", "Interviews", "Report"];

function activeStep(status: JobStatus) {
  switch (status) {
    case "queued":
    case "generating_analysts":
    case "awaiting_feedback":
      return 1;
    case "researching":
      return 2;
    case "writing_report":
      return 3;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

export function MissionStepper({ status }: { status: JobStatus }) {
  const current = activeStep(status);
  if (current < 0) return null;
  const fraction = Math.min(current, STEPS.length - 1) / (STEPS.length - 1);

  return (
    <nav aria-label="Research progress" className="mx-auto w-full max-w-xl pb-6">
      <ol className="relative flex items-center justify-between">
        <div className="bg-border absolute inset-x-4 top-1/2 h-px -translate-y-1/2" />
        <motion.div
          className="bg-brand-gradient absolute top-1/2 left-4 h-px -translate-y-1/2"
          initial={false}
          animate={{ width: `calc((100% - 2rem) * ${fraction})` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {STEPS.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="relative flex flex-col items-center">
              <motion.span
                initial={false}
                animate={{ scale: active ? 1.12 : 1 }}
                className={cn(
                  "bg-background relative z-10 flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "bg-brand-gradient border-transparent text-white",
                  active && "text-foreground border-[var(--brand-1)]",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {active && (
                  <span className="animate-ping-slow absolute inset-0 rounded-full border border-[var(--brand-1)]" />
                )}
                {done ? <Check className="size-3.5" /> : index + 1}
              </motion.span>
              <span
                className={cn(
                  "absolute top-10 text-[11px] font-medium whitespace-nowrap",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

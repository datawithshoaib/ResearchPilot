"use client";

import { motion } from "motion/react";
import { AlertTriangle, CircleSlash, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ResearchJob } from "@/lib/api";

export function EndState({ job, onReset }: { job: ResearchJob; onReset: () => void }) {
  const failed = job.status === "failed";
  const Icon = failed ? AlertTriangle : CircleSlash;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass mx-auto max-w-xl rounded-2xl border p-8 text-center"
    >
      <motion.span
        initial={{ rotate: -20, scale: 0.5 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        className={
          failed
            ? "bg-destructive/15 text-destructive mx-auto flex size-14 items-center justify-center rounded-2xl"
            : "bg-muted text-muted-foreground mx-auto flex size-14 items-center justify-center rounded-2xl"
        }
      >
        <Icon className="size-6" />
      </motion.span>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">
        {failed ? "The mission hit turbulence" : "Research stopped"}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {failed
          ? "Usually a rate limit or a transient provider hiccup. Starting again normally works."
          : "You stopped this run before the report was written."}
      </p>
      {failed && job.error && (
        <pre className="bg-muted/60 text-muted-foreground mt-5 max-h-40 overflow-auto rounded-xl border p-3 text-left font-mono text-xs whitespace-pre-wrap">
          {job.error}
        </pre>
      )}
      <Button className="bg-brand-gradient mt-6 rounded-full text-white" onClick={onReset}>
        <RotateCcw />
        Start a new brief
      </Button>
    </motion.div>
  );
}

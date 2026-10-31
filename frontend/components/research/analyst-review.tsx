"use client";

import { motion } from "motion/react";
import { Check, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { useState } from "react";

import { AnalystCard } from "@/components/research/analyst-card";
import { Button } from "@/components/ui/button";
import type { ResearchJob } from "@/lib/api";

const SUGGESTIONS = [
  "Add a skeptic who challenges the hype",
  "Include a policy & regulation expert",
  "Bring in an economist",
  "Go more technical",
  "Add an end-user perspective",
];

type AnalystReviewProps = {
  job: ResearchJob;
  busy: boolean;
  onApprove: () => void;
  onRegenerate: (feedback: string) => void;
  onCancel: () => void;
};

export function AnalystReview({ job, busy, onApprove, onRegenerate, onCancel }: AnalystReviewProps) {
  const [feedback, setFeedback] = useState("");

  function addSuggestion(text: string) {
    setFeedback((current) => (current.trim() ? `${current.trim()}. ${text}` : text));
  }

  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">Checkpoint</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Meet your <span className="text-gradient font-serif font-normal italic">panel</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Each analyst will run their own web-grounded interview. Approve the line-up, or tell the
            recruiter what to change.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          <X />
          Discard
        </Button>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.09 }}
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        {job.analysts.map((analyst, index) => (
          <AnalystCard key={`${analyst.name}-${index}`} analyst={analyst} index={index} />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass grid gap-6 rounded-2xl border p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <div className="space-y-3">
          <label htmlFor="feedback" className="text-sm font-medium">
            Want a different line-up? <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="e.g. Replace the investor with a labor economist and add a security researcher."
            rows={2}
            maxLength={4000}
            disabled={busy}
            className="bg-background/60 focus-visible:ring-ring/50 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none focus-visible:ring-[3px]"
          />
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={busy}
                onClick={() => addSuggestion(suggestion)}
                className="text-muted-foreground hover:text-foreground hover:border-foreground/20 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors"
              >
                <Plus className="size-3" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Button
            variant="outline"
            onClick={() => onRegenerate(feedback)}
            disabled={busy || !feedback.trim()}
            className="rounded-xl"
          >
            {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Regenerate panel
          </Button>
          <motion.button
            type="button"
            onClick={onApprove}
            disabled={busy}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-brand-gradient inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_var(--glow)] disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Approve & start research
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

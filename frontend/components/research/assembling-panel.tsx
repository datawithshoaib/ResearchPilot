"use client";

import { motion } from "motion/react";

import { LogoMark } from "@/components/layout/logo";
import type { ResearchJob } from "@/lib/api";

export function AssemblingPanel({ job, onCancel }: { job: ResearchJob; onCancel: () => void }) {
  const regenerating = job.activity.some((event) => event.message.startsWith("Regenerating"));
  const slots = Array.from({ length: job.max_analysts });

  return (
    <div className="mx-auto max-w-4xl text-center">
      <div className="relative mx-auto flex size-40 items-center justify-center">
        {[0, 1, 2].map((ring) => (
          <motion.span
            key={ring}
            className="absolute inset-0 rounded-full border border-[var(--brand-1)]"
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 1.25, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: ring * 0.8, ease: "easeOut" }}
          />
        ))}
        <motion.div
          className="absolute inset-4 rounded-full border border-dashed border-[var(--brand-3)]/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
        <LogoMark spinning className="size-16 rounded-2xl" />
      </div>

      <h2 className="mt-8 text-3xl font-semibold tracking-tight">
        {regenerating ? "Re-casting your panel" : "Recruiting your analysts"}
      </h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm">
        Reading <span className="text-foreground font-medium">“{job.topic}”</span> and picking the{" "}
        {job.max_analysts} most interesting angles to investigate.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className="glass relative overflow-hidden rounded-2xl border p-5 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="bg-muted size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="bg-muted h-3 w-2/3 rounded-full" />
                <div className="bg-muted h-2.5 w-1/2 rounded-full" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="bg-muted h-2.5 w-full rounded-full" />
              <div className="bg-muted h-2.5 w-11/12 rounded-full" />
              <div className="bg-muted h-2.5 w-3/4 rounded-full" />
            </div>
            <motion.div
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--brand-1)]/10 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.2, ease: "easeInOut" }}
            />
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground mt-8 text-xs underline-offset-4 hover:underline"
      >
        Cancel
      </button>
    </div>
  );
}

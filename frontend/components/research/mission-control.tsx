"use client";

import { motion } from "motion/react";
import { Check, FileText, Globe2, Loader2, MessageCircleQuestion, Radio, Square, Timer } from "lucide-react";

import { ActivityFeed } from "@/components/research/activity-feed";
import { AnalystAvatar } from "@/components/research/analyst-avatar";
import { Constellation } from "@/components/research/constellation";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import type { Connection } from "@/hooks/use-research-job";
import { useNow } from "@/hooks/use-now";
import { analystColor } from "@/lib/analyst-palette";
import type { ResearchJob } from "@/lib/api";
import { cn, formatDuration } from "@/lib/utils";

type MissionControlProps = {
  job: ResearchJob;
  connection: Connection;
  cancelling: boolean;
  onCancel: () => void;
};

export function MissionControl({ job, connection, cancelling, onCancel }: MissionControlProps) {
  const now = useNow();
  const writing = job.status === "writing_report";
  const names = job.analysts.map((analyst) => analyst.name);
  const questions = job.progress.reduce((sum, item) => sum + item.questions, 0);
  const startedAt =
    job.activity.find((event) => event.message.startsWith("Panel approved"))?.at ?? job.created_at;

  const stats = [
    { icon: Timer, label: "Elapsed", value: formatDuration(now - new Date(startedAt).getTime()) },
    { icon: MessageCircleQuestion, label: "Questions asked", value: questions },
    { icon: Globe2, label: "Sources found", value: job.sources.length },
    { icon: FileText, label: "Sections drafted", value: `${job.sections_count}/${job.total_sections}` },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div className="min-w-0">
          <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
            <Radio className={cn("size-3.5", connection === "live" && "text-emerald-400")} />
            {connection === "live" ? "Live" : connection === "polling" ? "Syncing" : "Connecting"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="shimmer-text">
              {writing ? "Writing the final report" : "Interviews in progress"}
            </span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl truncate text-sm">{job.topic}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={onCancel} disabled={cancelling}>
          {cancelling ? <Loader2 className="animate-spin" /> : <Square className="size-3 fill-current" />}
          Stop
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="glass rounded-2xl border px-4 py-3.5"
            >
              <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
                <Icon className="size-3.5" />
                {stat.label}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">
                {typeof stat.value === "number" ? <AnimatedNumber value={stat.value} /> : stat.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="glass relative overflow-hidden rounded-2xl border p-4 sm:p-6"
        >
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">Research map</p>
          <div className="mx-auto max-w-[440px]">
            <Constellation job={job} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.22 }}
          className="glass flex h-[520px] flex-col rounded-2xl border p-3 sm:p-4"
        >
          <p className="text-muted-foreground px-2.5 pb-2 text-[11px] font-medium tracking-wide uppercase">
            Activity
          </p>
          <div className="min-h-0 flex-1">
            <ActivityFeed events={job.activity} analysts={names} />
          </div>
        </motion.div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {job.analysts.map((analyst, index) => {
          const progress = job.progress.find((item) => item.name === analyst.name);
          const latest = [...job.activity].reverse().find((event) => event.analyst === analyst.name);
          const color = analystColor(index);
          const steps = progress ? progress.questions + progress.searches : 0;
          const percent = progress?.done ? 100 : Math.min((steps / (job.max_num_turns * 2 + 1)) * 100, 92);

          return (
            <motion.div
              key={analyst.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.06 }}
              className="glass rounded-2xl border p-4"
            >
              <div className="flex items-center gap-3">
                <AnalystAvatar name={analyst.name} index={index} className="size-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{analyst.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{analyst.role}</p>
                </div>
                {progress?.done ? (
                  <span className="bg-success/15 text-success flex size-6 items-center justify-center rounded-full">
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <Loader2 className="text-muted-foreground size-4 animate-spin" />
                )}
              </div>
              <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color.gradient }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 16 }}
                />
              </div>
              <p className="text-muted-foreground mt-2.5 line-clamp-1 text-xs">
                {progress?.done
                  ? `Section ready: ${progress.section_title ?? "done"}`
                  : (latest?.message ?? "Preparing the first question…")}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

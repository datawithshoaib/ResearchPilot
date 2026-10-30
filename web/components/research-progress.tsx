"use client";

import { Check, FileText, Loader2, Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ResearchJob } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_COPY: Record<string, { title: string; description: string }> = {
  queued: {
    title: "Queued",
    description: "Preparing the research workflow.",
  },
  generating_analysts: {
    title: "Building an analyst panel",
    description: "Reading your topic and drafting distinct expert perspectives.",
  },
  researching: {
    title: "Running interviews",
    description:
      "Analysts are searching the web, interviewing experts, and writing report sections in parallel.",
  },
};

export function ResearchProgress({ job }: { job: ResearchJob }) {
  const total = Math.max(job.total_sections, job.analysts.length, 1);
  const completed = Math.min(job.sections_count, total);
  const copy = STATUS_COPY[job.status] ?? STATUS_COPY.queued;

  const percent =
    job.status === "generating_analysts"
      ? 20
      : job.status === "researching"
        ? 35 + (completed / total) * 55
        : 10;

  const steps = [
    {
      label: "Analysts",
      icon: Users,
      done: job.analysts.length > 0,
      active: job.status === "generating_analysts",
    },
    {
      label: "Interviews",
      icon: Search,
      done: completed >= total && job.status === "researching",
      active: job.status === "researching",
    },
    {
      label: "Report",
      icon: FileText,
      done: false,
      active: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Loader2 className="size-4 animate-spin" />
          Step 3 of 3
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{copy.title}</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{copy.description}</p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Research in progress</CardTitle>
            <Badge variant="secondary">
              {completed}/{total} sections
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Topic: <span className="text-foreground font-medium">{job.topic}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={percent} />

          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.label}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
                    step.done && "border-emerald-500/30 bg-emerald-500/5",
                    step.active && "border-primary/40 bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border",
                      step.done && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
                      step.active && "border-primary/40 text-primary",
                      !step.done && !step.active && "text-muted-foreground",
                    )}
                  >
                    {step.done ? (
                      <Check className="size-3.5" />
                    ) : step.active ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </span>
                  <span className={cn("font-medium", !step.done && !step.active && "text-muted-foreground")}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Analyst panel
            </p>
            <div className="flex flex-wrap gap-2">
              {job.analysts.map((analyst) => (
                <Badge key={analyst.name} variant="outline" className="py-1">
                  {analyst.name} · {analyst.role}
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            This can take a minute or two. You can leave this tab open; progress updates
            automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

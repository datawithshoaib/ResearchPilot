"use client";

import { useState } from "react";
import { Check, Copy, Download, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResearchJob } from "@/lib/api";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function ReportView({ job, onReset }: { job: ResearchJob; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const report = job.final_report ?? "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(job.topic) || "research-report"}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Report ready</Badge>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{job.topic}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Synthesized from {job.analysts.length} analyst interview
            {job.analysts.length === 1 ? "" : "s"} with live web sources.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy markdown"}
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download />
            Download
          </Button>
          <Button onClick={onReset}>
            <RotateCcw />
            New research
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium">
            Final report
            <span className="text-muted-foreground ml-2 font-normal">
              {report.split(/\s+/).filter(Boolean).length} words
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <article className="prose prose-zinc dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-foreground prose-a:decoration-border prose-a:underline-offset-4 prose-pre:bg-muted prose-pre:text-foreground max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
              }}
            >
              {report}
            </ReactMarkdown>
          </article>
        </CardContent>
      </Card>
    </div>
  );
}

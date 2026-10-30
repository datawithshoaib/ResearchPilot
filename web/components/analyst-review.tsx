"use client";

import { Check, Loader2, RefreshCw, Users } from "lucide-react";

import { AnalystCard } from "@/components/analyst-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResearchJob } from "@/lib/api";

type AnalystReviewProps = {
  job: ResearchJob;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  busy: boolean;
};

export function AnalystReview({
  job,
  feedback,
  onFeedbackChange,
  onApprove,
  onRegenerate,
  busy,
}: AnalystReviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Users className="size-4" />
            Step 2 of 3
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Review the analyst panel</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            These personas will drive the interviews. Approve them to start web research, or
            describe what to change and generate a new panel.
          </p>
        </div>
        <Badge variant="secondary">{job.analysts.length} analysts</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {job.analysts.map((analyst, index) => (
          <AnalystCard key={`${analyst.name}-${index}`} analyst={analyst} index={index} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Want a different panel?</CardTitle>
          <CardDescription>
            Optional: give editorial direction such as &quot;add a skeptic&quot; or &quot;focus
            more on regulation&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback for the analyst generator</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(event) => onFeedbackChange(event.target.value)}
              placeholder="e.g. Replace the venture capitalist with a labor economist and add a security researcher."
              rows={3}
              maxLength={4000}
              disabled={busy}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onRegenerate}
              disabled={busy || feedback.trim().length === 0}
            >
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Regenerate analysts
            </Button>
            <Button type="button" onClick={onApprove} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />}
              Approve and run research
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StartResearchInput } from "@/lib/api";
import { cn } from "@/lib/utils";

const EXAMPLE_TOPICS = [
  "How autonomous AI agents are changing software engineering teams",
  "The business impact of retrieval-augmented generation in enterprise support",
  "What makes developer tools stick: lessons from platform adoptions",
];

type ResearchFormProps = {
  onStart: (input: StartResearchInput) => Promise<void>;
  starting: boolean;
  disabled?: boolean;
};

export function ResearchForm({ onStart, starting, disabled }: ResearchFormProps) {
  const [topic, setTopic] = useState("");
  const [maxAnalysts, setMaxAnalysts] = useState(3);
  const [maxTurns, setMaxTurns] = useState(2);

  const canSubmit = topic.trim().length >= 8 && !starting && !disabled;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    await onStart({
      topic: topic.trim(),
      max_analysts: maxAnalysts,
      max_num_turns: maxTurns,
    });
  }

  return (
    <Card className="shadow-lg">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="text-muted-foreground size-4" />
            Start a research brief
          </CardTitle>
          <CardDescription>
            Describe the question you want investigated. ResearchPilot builds an analyst
            panel, runs web-grounded interviews, and writes a cited report.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic">Research topic</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. How are AI coding assistants changing the way engineering teams review code?"
              rows={3}
              maxLength={2000}
              disabled={starting}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {EXAMPLE_TOPICS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setTopic(example)}
                  className={cn(
                    "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full border px-3 py-1 text-left text-xs transition-colors",
                    topic === example && "bg-accent text-accent-foreground",
                  )}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-analysts">Analyst panel size</Label>
              <select
                id="max-analysts"
                value={maxAnalysts}
                onChange={(event) => setMaxAnalysts(Number(event.target.value))}
                disabled={starting}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50"
              >
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>
                    {count} analyst{count === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                More analysts produce broader coverage and take longer.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-turns">Questions per interview</Label>
              <select
                id="max-turns"
                value={maxTurns}
                onChange={(event) => setMaxTurns(Number(event.target.value))}
                disabled={starting}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50"
              >
                {[1, 2, 3, 4].map((turns) => (
                  <option key={turns} value={turns}>
                    {turns} question{turns === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Two turns per analyst is a good balance of depth and speed.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-between gap-4 border-t pt-6">
          <p className="text-muted-foreground text-xs">
            You will review the analyst panel before research begins.
          </p>
          <Button type="submit" disabled={!canSubmit}>
            {starting ? (
              <>
                <Loader2 className="animate-spin" />
                Generating analysts
              </>
            ) : (
              <>
                Generate analysts
                <ArrowRight />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

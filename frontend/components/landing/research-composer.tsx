"use client";

import { motion } from "motion/react";
import { ArrowUp, Loader2 } from "lucide-react";
import { useState } from "react";

import { Segmented } from "@/components/ui/segmented";
import { useTypewriter } from "@/hooks/use-typewriter";
import type { StartResearchInput } from "@/lib/api";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "How are autonomous AI agents changing software engineering teams?",
  "What will it take for solid-state batteries to reach mass-market EVs?",
  "Is the four-day work week improving productivity?",
  "How are cities adapting to extreme urban heat?",
  "What's driving the resurgence of nuclear power?",
];

const CHIPS = [
  { emoji: "🤖", label: "AI agents in engineering", topic: EXAMPLES[0] },
  { emoji: "🔋", label: "Solid-state batteries", topic: EXAMPLES[1] },
  { emoji: "🗓️", label: "Four-day work week", topic: EXAMPLES[2] },
  { emoji: "🌡️", label: "Urban heat", topic: EXAMPLES[3] },
];

const DEPTHS = [
  { value: 1, label: "Quick", hint: "1 question per interview" },
  { value: 2, label: "Balanced", hint: "2 questions per interview" },
  { value: 3, label: "Deep", hint: "3 questions per interview" },
  { value: 4, label: "Max", hint: "4 questions per interview" },
];

const MIN_TOPIC = 8;

type ResearchComposerProps = {
  onStart: (input: StartResearchInput) => Promise<boolean>;
  starting: boolean;
  disabled?: boolean;
};

export function ResearchComposer({ onStart, starting, disabled }: ResearchComposerProps) {
  const [topic, setTopic] = useState("");
  const [focused, setFocused] = useState(false);
  const [analysts, setAnalysts] = useState(3);
  const [depth, setDepth] = useState(2);
  const placeholder = useTypewriter(EXAMPLES, !topic && !focused);

  const trimmed = topic.trim();
  const canSubmit = trimmed.length >= MIN_TOPIC && !starting && !disabled;
  const searches = analysts * depth;
  const llmCalls = 1 + analysts * (depth * 3 + 1) + 3;

  async function submit() {
    if (!canSubmit) return;
    await onStart({ topic: trimmed, max_analysts: analysts, max_num_turns: depth });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-2xl"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className={cn(
          "glow-border glass rounded-2xl border shadow-[0_30px_80px_-30px_var(--glow)] transition-shadow",
          focused && "shadow-[0_30px_100px_-20px_var(--glow)]",
        )}
      >
        <label htmlFor="topic" className="sr-only">
          Research topic
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={focused ? "What should the panel investigate?" : placeholder || " "}
          rows={3}
          maxLength={2000}
          disabled={starting}
          className="placeholder:text-muted-foreground/70 block w-full resize-none bg-transparent px-5 pt-5 pb-2 text-base leading-relaxed outline-none sm:text-lg"
        />

        <div className="flex flex-col gap-3 px-4 pt-1 pb-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
                Analysts
              </p>
              <Segmented
                ariaLabel="Number of analysts"
                value={analysts}
                onChange={setAnalysts}
                disabled={starting}
                options={[1, 2, 3, 4, 5, 6].map((count) => ({ value: count, label: count }))}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
                Interview depth
              </p>
              <Segmented
                ariaLabel="Interview depth"
                value={depth}
                onChange={setDepth}
                disabled={starting}
                options={DEPTHS}
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.04 } : undefined}
            whileTap={canSubmit ? { scale: 0.96 } : undefined}
            className={cn(
              "group relative flex h-11 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-sm font-semibold text-white transition-opacity",
              "bg-brand-gradient shadow-[0_10px_30px_-8px_var(--glow)]",
              !canSubmit && "opacity-45",
            )}
          >
            {starting ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            {starting ? "Launching" : "Launch"}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </motion.button>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5 text-[11px]">
          <span>
            ≈ {llmCalls} model calls · {searches} web searches
          </span>
          <span className="hidden sm:inline">
            <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>{" "}
            <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to launch
          </span>
        </div>
      </form>

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.06, delayChildren: 0.9 }}
        className="mt-5 flex flex-wrap justify-center gap-2"
      >
        {CHIPS.map((chip) => (
          <motion.button
            key={chip.label}
            type="button"
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -2 }}
            onClick={() => setTopic(chip.topic)}
            className={cn(
              "glass text-muted-foreground hover:text-foreground rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              topic === chip.topic && "text-foreground border-[var(--brand-1)]/50",
            )}
          >
            <span className="mr-1.5">{chip.emoji}</span>
            {chip.label}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

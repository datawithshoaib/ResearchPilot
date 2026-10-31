"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  FileCheck2,
  Flag,
  Link2,
  MessageCircleQuestion,
  MessageSquareQuote,
  PenLine,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useNow } from "@/hooks/use-now";
import { analystColor, analystIndex } from "@/lib/analyst-palette";
import type { ActivityEvent, ActivityKind } from "@/lib/api";
import { cn, faviconUrl, hostname, timeAgo } from "@/lib/utils";

const ICONS: Record<ActivityKind, LucideIcon> = {
  status: Flag,
  error: AlertTriangle,
  analysts: Users,
  question: MessageCircleQuestion,
  search: Search,
  sources: Link2,
  answer: MessageSquareQuote,
  section: FileCheck2,
  writing: PenLine,
};

const MAX_VISIBLE = 60;

export function ActivityFeed({ events, analysts }: { events: ActivityEvent[]; analysts: string[] }) {
  const now = useNow(10_000);
  const visible = events.slice(-MAX_VISIBLE).reverse();

  return (
    <ol className="scrollbar-thin relative h-full space-y-1 overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {visible.map((event) => {
          const Icon = ICONS[event.kind] ?? Flag;
          const index = analystIndex(analysts, event.analyst);
          const color = index >= 0 ? analystColor(index) : null;
          const quoted = event.kind === "question" || event.kind === "answer";

          return (
            <motion.li
              key={event.id}
              layout
              initial={{ opacity: 0, x: -16, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="overflow-hidden"
            >
              <div className="hover:bg-muted/50 flex gap-3 rounded-xl px-2.5 py-2 transition-colors">
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border",
                    event.kind === "error" && "text-destructive",
                  )}
                  style={color ? { color: color.solid, background: color.soft, borderColor: "transparent" } : undefined}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-semibold" style={color ? { color: color.solid } : undefined}>
                      {event.analyst ?? "ResearchPilot"}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                      {timeAgo(event.at, now)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-muted-foreground mt-0.5 text-[13px] leading-snug",
                      quoted && "text-foreground/85 line-clamp-2 italic",
                    )}
                  >
                    {quoted ? `“${event.message}”` : event.message}
                  </p>
                  {event.data.sources && event.data.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {event.data.sources.map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          title={source.title}
                          className="bg-background/60 hover:border-foreground/20 inline-flex max-w-[180px] items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={faviconUrl(source.url)} alt="" className="size-3 rounded-sm" loading="lazy" />
                          <span className="truncate">{hostname(source.url)}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

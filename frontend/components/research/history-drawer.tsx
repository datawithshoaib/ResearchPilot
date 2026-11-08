"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, FileText, Loader2, RotateCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { listHistory, removeFromHistory, type HistoryEntry } from "@/lib/history";
import { timeAgo } from "@/lib/utils";

type HistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (entry: HistoryEntry) => void;
};

type LoadState = "loading" | "ready" | "error";

export function HistoryDrawer({ open, onClose, onSelect }: HistoryDrawerProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setEntries(await listHistory());
      setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your history.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Reload on open so reports finished since the last visit appear.
    queueMicrotask(() => void load());

    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, load]);

  async function remove(entry: HistoryEntry) {
    const previous = entries;
    setEntries((current) => current.filter((item) => item.thread_id !== entry.thread_id));
    try {
      await removeFromHistory(entry.thread_id);
    } catch (cause) {
      setEntries(previous);
      toast.error(cause instanceof Error ? cause.message : "Couldn't delete that report.");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Research history"
            className="bg-popover fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">Your briefs</h2>
                <p className="text-muted-foreground text-xs">Saved to your account</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close history">
                <X />
              </Button>
            </div>

            <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4">
              {state === "loading" && entries.length === 0 && (
                <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Loading your briefs…
                </div>
              )}
              {state === "error" && (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center text-sm">
                  <AlertCircle className="size-8 opacity-40" />
                  <p className="max-w-xs">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => void load()}>
                    <RotateCw />
                    Try again
                  </Button>
                </div>
              )}
              {state === "ready" && entries.length === 0 && (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center text-sm">
                  <FileText className="size-8 opacity-40" />
                  Finished reports will appear here.
                </div>
              )}
              <AnimatePresence initial={false}>
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.thread_id}
                    layout
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: index * 0.04 } }}
                    exit={{ opacity: 0, x: 24 }}
                    className="group hover:bg-muted/60 flex items-start gap-3 rounded-xl border p-3.5 transition-colors"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        onSelect(entry);
                        onClose();
                      }}
                    >
                      <p className="line-clamp-2 text-sm font-medium">{entry.topic}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {timeAgo(entry.completed_at)} · {entry.analysts.length} analysts · {entry.sources.length}{" "}
                        sources
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete from history"
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => void remove(entry)}
                    >
                      <Trash2 />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

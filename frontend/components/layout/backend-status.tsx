"use client";

import { RotateCw } from "lucide-react";

import type { BackendState } from "@/hooks/use-backend-health";
import type { Health } from "@/lib/api";
import { cn } from "@/lib/utils";

const COPY: Record<BackendState, { label: string; dot: string }> = {
  checking: { label: "Connecting", dot: "bg-muted-foreground" },
  waking: { label: "Waking server", dot: "bg-amber-400" },
  online: { label: "Online", dot: "bg-emerald-400" },
  misconfigured: { label: "Keys missing", dot: "bg-amber-400" },
  offline: { label: "Offline", dot: "bg-red-400" },
};

export function BackendStatus({
  state,
  health,
  onRetry,
}: {
  state: BackendState;
  health: Health | null;
  onRetry: () => void;
}) {
  const copy = COPY[state];
  const pulsing = state === "checking" || state === "waking" || state === "online";

  return (
    <button
      type="button"
      onClick={state === "offline" ? onRetry : undefined}
      title={health ? `API v${health.version} · ${health.model}` : undefined}
      className={cn(
        "glass text-muted-foreground flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium",
        state === "offline" ? "hover:text-foreground cursor-pointer" : "cursor-default",
      )}
    >
      <span className="relative flex size-2">
        {pulsing && <span className={cn("absolute inset-0 rounded-full animate-ping-slow", copy.dot)} />}
        <span className={cn("relative size-2 rounded-full", copy.dot)} />
      </span>
      <span className={cn(state === "waking" && "shimmer-text")}>{copy.label}</span>
      {state === "offline" && <RotateCw className="size-3" />}
    </button>
  );
}

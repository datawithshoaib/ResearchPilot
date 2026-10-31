"use client";

import { motion } from "motion/react";
import { History } from "lucide-react";

import { BackendStatus } from "@/components/layout/backend-status";
import { LogoMark } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import type { BackendState } from "@/hooks/use-backend-health";
import type { Health } from "@/lib/api";

type SiteHeaderProps = {
  backendState: BackendState;
  health: Health | null;
  onRetryBackend: () => void;
  onHome: () => void;
  onOpenHistory: () => void;
  busy: boolean;
};

export function SiteHeader({
  backendState,
  health,
  onRetryBackend,
  onHome,
  onOpenHistory,
  busy,
}: SiteHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex items-center justify-between gap-4"
    >
      <button type="button" onClick={onHome} className="group flex items-center gap-3 text-left">
        <LogoMark spinning={busy} className="transition-transform group-hover:scale-105" />
        <span>
          <span className="block text-[15px] font-semibold tracking-tight">ResearchPilot</span>
          <span className="text-muted-foreground hidden text-xs sm:block">Multi-agent research briefs</span>
        </span>
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <BackendStatus state={backendState} health={health} onRetry={onRetryBackend} />
        <Button variant="ghost" size="sm" className="rounded-full" onClick={onOpenHistory}>
          <History />
          <span className="hidden sm:inline">History</span>
        </Button>
        <ThemeToggle />
      </div>
    </motion.header>
  );
}

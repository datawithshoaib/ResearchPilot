import { Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Health } from "@/lib/api";
import { cn } from "@/lib/utils";

function HealthIndicator({
  health,
  healthError,
}: {
  health: Health | null;
  healthError: boolean;
}) {
  let label = "Connecting to API";
  let dot = "bg-muted-foreground";

  if (healthError) {
    label = "API offline";
    dot = "bg-red-500";
  } else if (health?.configured) {
    label = "API ready";
    dot = "bg-emerald-500";
  } else if (health && !health.configured) {
    label = "API keys missing";
    dot = "bg-amber-500";
  }

  return (
    <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
      <span className={cn("size-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

export function SiteHeader({
  health,
  healthError,
}: {
  health: Health | null;
  healthError: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-sm">
          <Compass className="size-5" />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight">ResearchPilot</p>
          <p className="text-muted-foreground text-xs">Multi-agent research briefs</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <HealthIndicator health={health} healthError={healthError} />
        <Badge variant="outline" className="hidden sm:inline-flex">
          LangGraph · Groq · Tavily
        </Badge>
      </div>
    </header>
  );
}

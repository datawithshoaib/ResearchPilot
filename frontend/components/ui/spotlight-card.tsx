"use client";

import { cn } from "@/lib/utils";

/** Glass card with a highlight that follows the pointer. */
export function SpotlightCard({ className, children, ...props }: React.ComponentProps<"div">) {
  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      onPointerMove={onPointerMove}
      className={cn("glass group relative overflow-hidden rounded-2xl border", className)}
      {...props}
    >
      <div className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
  );
}

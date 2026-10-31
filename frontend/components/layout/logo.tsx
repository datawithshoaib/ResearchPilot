import { cn } from "@/lib/utils";

/** Orbit mark: a core with two analysts in rotation. */
export function LogoMark({ className, spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <span
      className={cn(
        "bg-brand-gradient relative flex size-9 items-center justify-center rounded-xl shadow-[0_8px_30px_-6px_var(--glow)]",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-[70%] text-white" fill="none">
        <circle cx="16" cy="16" r="3.2" fill="currentColor" />
        <g
          className={cn("origin-center", spinning && "animate-[spin_6s_linear_infinite]")}
          style={{ transformBox: "fill-box" }}
        >
          <ellipse cx="16" cy="16" rx="12" ry="5.5" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.4" />
          <circle cx="28" cy="16" r="2" fill="currentColor" />
          <circle cx="4" cy="16" r="1.4" fill="currentColor" fillOpacity="0.8" />
        </g>
      </svg>
    </span>
  );
}

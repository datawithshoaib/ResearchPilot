import { cn } from "@/lib/utils";

/** Compass Lens mark: a magnifier (research) with a compass needle in the lens (pilot). */
export function LogoMark({ className, spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <span
      className={cn(
        "bg-brand-gradient relative flex size-9 items-center justify-center rounded-xl shadow-[0_8px_30px_-6px_var(--glow)]",
        className,
      )}
    >
      <svg viewBox="0 0 48 48" className="size-[70%] text-white" fill="none" aria-hidden="true">
        <circle cx="21" cy="21" r="13.5" stroke="currentColor" strokeWidth="4" />
        <line x1="31" y1="31" x2="41.5" y2="41.5" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
        <g
          className={cn(spinning && "animate-[spin_2.4s_ease-in-out_infinite]")}
          style={{ transformBox: "view-box", transformOrigin: "21px 21px" }}
        >
          <polygon points="28,14 23.2,23.2 18.8,18.8" fill="#8FF0FA" />
          <polygon points="14,28 18.8,18.8 23.2,23.2" fill="currentColor" fillOpacity="0.55" />
        </g>
      </svg>
    </span>
  );
}

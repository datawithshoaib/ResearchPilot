"use client";

import { useEffect, useRef } from "react";

/**
 * Fixed backdrop: drifting aurora blobs, a fading grid, film grain, and a soft
 * spotlight that trails the cursor.
 */
export function Background() {
  const spotlight = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = spotlight.current;
    if (!element || window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--mx", `${event.clientX}px`);
        element.style.setProperty("--my", `${event.clientY}px`);
        element.style.opacity = "1";
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[30%] -left-[10%] h-[70vh] w-[60vw] rounded-full bg-[var(--brand-1)] opacity-[0.16] blur-[120px] animate-aurora dark:opacity-[0.22]" />
      <div
        className="absolute top-[5%] -right-[15%] h-[60vh] w-[55vw] rounded-full bg-[var(--brand-3)] opacity-[0.12] blur-[120px] animate-aurora dark:opacity-[0.16]"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="absolute top-[45%] left-[25%] h-[50vh] w-[45vw] rounded-full bg-[var(--brand-2)] opacity-[0.08] blur-[140px] animate-aurora dark:opacity-[0.14]"
        style={{ animationDelay: "-14s" }}
      />
      <div className="surface-grid absolute inset-x-0 top-0 h-[90vh]" />
      <div className="noise absolute inset-0 opacity-[0.035] mix-blend-overlay dark:opacity-[0.06]" />
      <div
        ref={spotlight}
        className="absolute inset-0 opacity-0 transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx) var(--my), color-mix(in oklab, var(--brand-1) 9%, transparent), transparent 70%)",
        }}
      />
    </div>
  );
}

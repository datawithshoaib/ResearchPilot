"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { cn } from "@/lib/utils";

type Option<T extends string | number> = { value: T; label: React.ReactNode; hint?: string };

/** Pill-style radio group with a spring-animated selection indicator. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const id = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("bg-muted/60 flex rounded-xl border p-1", disabled && "opacity-60", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.hint}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="bg-background absolute inset-0 rounded-lg shadow-sm ring-1 ring-border"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { animate, useMotionValue, useTransform, motion } from "motion/react";
import { useEffect } from "react";

/** Counts smoothly to `value` whenever it changes. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [count, value]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Building2 } from "lucide-react";

import { AnalystAvatar } from "@/components/research/analyst-avatar";
import { analystColor } from "@/lib/analyst-palette";
import type { Analyst } from "@/lib/api";

/** Analyst persona card that tilts toward the pointer in 3D. */
export function AnalystCard({ analyst, index }: { analyst: Analyst; index: number }) {
  const color = analystColor(index);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [7, -7]), { stiffness: 200, damping: 18 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-9, 9]), { stiffness: 200, damping: 18 });
  const glare = useTransform(
    [x, y],
    ([gx, gy]) =>
      `radial-gradient(320px circle at ${Number(gx) * 100}% ${Number(gy) * 100}%, ${color.soft}, transparent 65%)`,
  );

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.94 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 140, damping: 16 } },
      }}
      style={{ perspective: 900 }}
      className="h-full"
    >
      <motion.article
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          x.set((event.clientX - rect.left) / rect.width);
          y.set((event.clientY - rect.top) / rect.height);
        }}
        onPointerLeave={() => {
          x.set(0.5);
          y.set(0.5);
        }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="glass relative flex h-full flex-col overflow-hidden rounded-2xl border p-5"
      >
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: glare }} />
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: color.gradient }} />

        <div className="relative flex items-start justify-between gap-3" style={{ transform: "translateZ(30px)" }}>
          <AnalystAvatar name={analyst.name} index={index} className="size-12 text-base" />
          <span className="text-muted-foreground font-mono text-[11px]">#{String(index + 1).padStart(2, "0")}</span>
        </div>

        <div className="relative mt-4" style={{ transform: "translateZ(20px)" }}>
          <h3 className="text-lg leading-tight font-semibold">{analyst.name}</h3>
          <p className="mt-1 text-sm font-medium" style={{ color: color.solid }}>
            {analyst.role}
          </p>
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
            <Building2 className="size-3.5 shrink-0" />
            {analyst.affiliation}
          </p>
        </div>

        <p className="text-muted-foreground relative mt-4 text-sm leading-relaxed">{analyst.description}</p>
      </motion.article>
    </motion.div>
  );
}

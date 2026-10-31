"use client";

import { AnimatePresence, motion } from "motion/react";

import { analystColor } from "@/lib/analyst-palette";
import type { ResearchJob } from "@/lib/api";
import { initials } from "@/lib/utils";

const SIZE = 420;
const CENTER = SIZE / 2;
const ORBIT = 150;
const NODE = 26;
const MAX_SATELLITES = 14;

/**
 * Live map of the research run: the topic at the core, one node per analyst on
 * the orbit, a data packet flying inward for each new event, and a satellite
 * for every source that analyst has retrieved.
 */
export function Constellation({ job }: { job: ResearchJob }) {
  const writing = job.status === "writing_report";
  const count = Math.max(job.analysts.length, 1);
  const turns = Math.max(job.max_num_turns, 1);

  const latestEventId = new Map<string, number>();
  for (const event of job.activity) {
    if (event.analyst) latestEventId.set(event.analyst, event.id);
  }

  const nodes = job.analysts.map((analyst, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const progress = job.progress.find((item) => item.name === analyst.name);
    const steps = progress ? progress.questions + progress.searches : 0;
    return {
      analyst,
      index,
      x: CENTER + Math.cos(angle) * ORBIT,
      y: CENTER + Math.sin(angle) * ORBIT,
      color: analystColor(index),
      done: progress?.done ?? false,
      completion: progress?.done ? 1 : Math.min(steps / (turns * 2 + 1), 0.92),
      sources: progress?.sources ?? 0,
      pulse: latestEventId.get(analyst.name) ?? 0,
    };
  });

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full" role="img" aria-label="Live research map">
      <defs>
        <radialGradient id="core-gradient">
          <stop offset="0%" stopColor="var(--brand-3)" />
          <stop offset="60%" stopColor="var(--brand-2)" />
          <stop offset="100%" stopColor="var(--brand-1)" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Orbits */}
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={ORBIT}
        fill="none"
        stroke="var(--border)"
        strokeDasharray="2 7"
        strokeWidth="1.5"
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      />
      <circle cx={CENTER} cy={CENTER} r={ORBIT * 0.55} fill="none" stroke="var(--border)" strokeWidth="1" />

      {/* Spokes and packets */}
      {nodes.map((node) => (
        <g key={`spoke-${node.analyst.name}`}>
          <motion.line
            x1={CENTER}
            y1={CENTER}
            x2={node.x}
            y2={node.y}
            stroke={node.color.solid}
            strokeWidth={writing ? 2 : 1.25}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: writing || node.done ? 0.7 : 0.3 }}
            transition={{ duration: 1, delay: node.index * 0.1 }}
            strokeDasharray={writing ? "4 6" : undefined}
          />
          <AnimatePresence>
            {node.pulse > 0 && (
              <motion.circle
                key={node.pulse}
                r={4}
                fill={node.color.solid}
                initial={{ cx: node.x, cy: node.y, opacity: 1 }}
                animate={{ cx: CENTER, cy: CENTER, opacity: [1, 1, 0] }}
                transition={{ duration: 1.1, ease: "easeIn" }}
              />
            )}
          </AnimatePresence>
        </g>
      ))}

      {/* Core */}
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={44}
        fill="url(#core-gradient)"
        filter="url(#glow)"
        animate={{ opacity: writing ? [0.5, 0.9, 0.5] : [0.3, 0.55, 0.3] }}
        transition={{ duration: writing ? 1.4 : 3, repeat: Infinity }}
      />
      <circle cx={CENTER} cy={CENTER} r={34} fill="url(#core-gradient)" />
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={34}
        fill="none"
        stroke="var(--brand-1)"
        animate={{ r: [34, 58], opacity: [0.6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
      />
      <text
        x={CENTER}
        y={CENTER + 4}
        textAnchor="middle"
        className="fill-white text-[11px] font-semibold tracking-wider uppercase"
      >
        {writing ? "Writing" : "Topic"}
      </text>

      {/* Analyst nodes, drawn around their own origin so scale/rotate pivot correctly. */}
      {nodes.map((node) => {
        const satellites = Math.min(node.sources, MAX_SATELLITES);
        const ring = NODE + 6;
        const circumference = 2 * Math.PI * ring;
        return (
          <g key={`node-${node.analyst.name}`} transform={`translate(${node.x} ${node.y})`}>
            <motion.g
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.2 + node.index * 0.12 }}
            >
              {/* Source satellites; the invisible circle keeps the bbox centered. */}
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 24 + node.index * 3, repeat: Infinity, ease: "linear" }}
              >
                <circle r={NODE + 22} fill="none" />
                {Array.from({ length: satellites }).map((_, i) => {
                  const angle = (i / MAX_SATELLITES) * Math.PI * 2;
                  return (
                    <motion.circle
                      key={i}
                      cx={Math.cos(angle) * (NODE + 16)}
                      cy={Math.sin(angle) * (NODE + 16)}
                      r={2.4}
                      fill={node.color.solid}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.85 }}
                      transition={{ type: "spring", stiffness: 300, damping: 12 }}
                    />
                  );
                })}
              </motion.g>

              <circle r={ring} fill="none" stroke="var(--border)" strokeWidth="3" />
              <g transform="rotate(-90)">
                <motion.circle
                  r={ring}
                  fill="none"
                  stroke={node.color.solid}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={false}
                  animate={{ strokeDashoffset: circumference * (1 - node.completion) }}
                  transition={{ type: "spring", stiffness: 60, damping: 15 }}
                />
              </g>
              <circle r={NODE} fill={node.color.solid} />
              <text y={4.5} textAnchor="middle" className="fill-white text-[13px] font-semibold">
                {initials(node.analyst.name)}
              </text>
              {node.done && (
                <g transform="translate(20 -20)">
                  <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <circle r={9} fill="var(--success)" />
                    <path
                      d="M-4 0 l3 3 l5 -6"
                      stroke="white"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.g>
                </g>
              )}
            </motion.g>
            <motion.text
              y={NODE + 26}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px] font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + node.index * 0.12 }}
            >
              {node.analyst.name.split(" ").slice(-1)[0]}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}

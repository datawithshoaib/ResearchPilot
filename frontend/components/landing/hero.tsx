"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

const LINE_ONE = ["Ask", "anything."];
const LINE_TWO = ["Get", "a"];

const word = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export function Hero() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass text-muted-foreground mx-auto inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
      >
        <Sparkles className="size-3.5 text-[var(--brand-1)]" />
        <span className="shimmer-text">A panel of AI analysts, working in parallel</span>
      </motion.div>

      <motion.h1
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.08, delayChildren: 0.15 }}
        className="mt-7 text-[clamp(2.6rem,7vw,5rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance"
      >
        {LINE_ONE.map((text) => (
          <motion.span key={text} variants={word} className="mr-[0.25em] inline-block">
            {text}
          </motion.span>
        ))}
        <br />
        {LINE_TWO.map((text) => (
          <motion.span key={text} variants={word} className="mr-[0.25em] inline-block">
            {text}
          </motion.span>
        ))}
        <motion.span
          variants={word}
          className="text-gradient inline-block pr-[0.08em] font-serif font-normal tracking-normal italic"
        >
          cited brief.
        </motion.span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="text-muted-foreground mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg"
      >
        ResearchPilot recruits expert personas for your question, sends them to interview the live web,
        and weaves their findings into one sourced report.
      </motion.p>
    </div>
  );
}

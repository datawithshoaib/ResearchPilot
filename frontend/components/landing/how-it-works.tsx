"use client";

import { motion } from "motion/react";
import { FileText, Globe2, ShieldCheck, Users } from "lucide-react";

import { SpotlightCard } from "@/components/ui/spotlight-card";

const STEPS = [
  {
    icon: Users,
    title: "Recruit a panel",
    body: "An LLM reads your question and invents distinct expert personas — each owning one angle.",
  },
  {
    icon: ShieldCheck,
    title: "You approve",
    body: "Nothing expensive runs until you sign off. Ask for a skeptic, an economist, anything.",
  },
  {
    icon: Globe2,
    title: "Parallel interviews",
    body: "Every analyst interviews an expert grounded in live Tavily web search, all at once.",
  },
  {
    icon: FileText,
    title: "Cited synthesis",
    body: "Memos merge into one report with an intro, insights, conclusion, and deduplicated sources.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto mt-28 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">How it works</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          A research team, <span className="text-gradient font-serif font-normal italic">on demand</span>
        </h2>
      </motion.div>

      <div className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          aria-hidden
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeInOut", delay: 0.2 }}
          className="bg-brand-gradient absolute top-[42px] right-[12%] left-[12%] hidden h-px origin-left opacity-50 lg:block"
        />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.12, duration: 0.5 }}
            >
              <SpotlightCard className="h-full p-5">
                <div className="flex items-center justify-between">
                  <span className="bg-background relative flex size-11 items-center justify-center rounded-xl border shadow-sm">
                    <Icon className="size-5 text-[var(--brand-1)]" />
                  </span>
                  <span className="text-muted-foreground/60 font-mono text-xs">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{step.body}</p>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

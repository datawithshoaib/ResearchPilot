"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { BookOpen, Check, Copy, Download, Globe2, Printer, RotateCcw, Users } from "lucide-react";
import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { AnalystAvatar } from "@/components/research/analyst-avatar";
import { Button } from "@/components/ui/button";
import type { ResearchJob } from "@/lib/api";
import { cn, faviconUrl, hostname, slugify, wordCount } from "@/lib/utils";

type Heading = { id: string; text: string; level: number };

function textOf(node: React.ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: React.ReactNode }>(child)) return textOf(child.props.children);
      return "";
    })
    .join("");
}

function extractHeadings(markdown: string): Heading[] {
  return markdown
    .split("\n")
    .map((line) => /^(#{1,2})\s+(.+)$/.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => {
      const text = match[2].replace(/[*_`[\]]/g, "").trim();
      return { id: slugify(text), text, level: match[1].length };
    })
    .filter((heading, index, all) => heading.id && all.findIndex((h) => h.id === heading.id) === index);
}

function heading(Tag: "h1" | "h2" | "h3"): Components["h1"] {
  return function MarkdownHeading({ children }) {
    return <Tag id={slugify(textOf(children))}>{children}</Tag>;
  };
}

const MARKDOWN_COMPONENTS: Components = {
  h1: heading("h1"),
  h2: heading("h2"),
  h3: heading("h3"),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

async function celebrate() {
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#a06bff", "#5b8cff", "#4fd6e6", "#ffffff"];
  const shoot = (x: number, angle: number) =>
    confetti({ particleCount: 70, spread: 70, startVelocity: 55, angle, origin: { x, y: 0.7 }, colors });
  shoot(0.1, 60);
  shoot(0.9, 120);
  window.setTimeout(() => confetti({ particleCount: 90, spread: 120, origin: { y: 0.4 }, colors }), 250);
}

type ReportViewProps = {
  job: ResearchJob;
  celebrateOnMount: boolean;
  onReset: () => void;
};

export function ReportView({ job, celebrateOnMount, onReset }: ReportViewProps) {
  const report = job.final_report ?? "";
  const [copied, setCopied] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const headings = useMemo(() => extractHeadings(report), [report]);
  const words = wordCount(report);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  useEffect(() => {
    if (!celebrateOnMount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) void celebrate();
  }, [celebrateOnMount]);

  // Scroll-spy for the table of contents.
  useEffect(() => {
    const elements = headings
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast.success("Markdown copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  }

  function handleDownload() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(job.topic) || "research-report"}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <motion.div
        aria-hidden
        className="bg-brand-gradient fixed inset-x-0 top-0 z-50 h-[3px] origin-left"
        style={{ scaleX: progress }}
      />

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative overflow-hidden rounded-2xl border p-6 sm:p-8"
      >
        <div className="bg-brand-gradient absolute -top-24 -right-24 size-64 rounded-full opacity-20 blur-3xl" />
        <span className="bg-success/15 text-success inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
          <Check className="size-3.5" />
          Report ready
        </span>
        <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-[2.6rem]">{job.topic}</h2>

        <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {job.analysts.map((analyst, index) => (
                <AnalystAvatar key={analyst.name} name={analyst.name} index={index} className="size-7 text-[10px]" />
              ))}
            </span>
            <Users className="size-3.5" /> {job.analysts.length} analysts
          </span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="size-3.5" /> {job.sources.length} sources
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" /> {words.toLocaleString()} words · {Math.max(1, Math.round(words / 230))} min
            read
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy markdown"}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleDownload}>
            <Download />
            Download .md
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.print()}>
            <Printer />
            Save as PDF
          </Button>
          <Button size="sm" className="bg-brand-gradient rounded-full text-white" onClick={onReset}>
            <RotateCcw />
            New research
          </Button>
        </div>
      </motion.header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-8 space-y-1" aria-label="Table of contents">
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wide uppercase">
              On this page
            </p>
            {headings.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "relative block rounded-md py-1.5 text-[13px] leading-snug transition-colors",
                  item.level === 1 ? "pl-3 font-medium" : "pl-6",
                  activeId === item.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {activeId === item.id && (
                  <motion.span
                    layoutId="toc-indicator"
                    className="bg-brand-gradient absolute top-1 bottom-1 left-0 w-0.5 rounded-full"
                  />
                )}
                {item.text}
              </a>
            ))}
          </nav>
        </aside>

        <motion.article
          id="report-print"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className={cn(
            "glass prose prose-zinc dark:prose-invert max-w-none rounded-2xl border p-6 sm:p-10",
            "prose-headings:scroll-mt-24 prose-headings:tracking-tight",
            "prose-h1:font-serif prose-h1:text-4xl prose-h1:font-normal prose-h1:tracking-normal",
            "prose-h2:mt-12 prose-h2:border-b prose-h2:pb-2",
            "prose-a:text-[var(--brand-2)] prose-a:break-words prose-a:no-underline hover:prose-a:underline",
            "prose-hr:my-10 prose-p:leading-relaxed",
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {report}
          </ReactMarkdown>
        </motion.article>
      </div>

      {job.sources.length > 0 && (
        <section className="mt-12 lg:ml-[252px]">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
            Every source the panel read
          </h3>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.04 }}
            className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {job.sources.map((source) => (
              <motion.a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
                className="glass hover:border-foreground/20 flex items-start gap-3 rounded-xl border p-3.5 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={faviconUrl(source.url)} alt="" className="mt-0.5 size-5 rounded" loading="lazy" />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-medium">{source.title}</span>
                  <span className="text-muted-foreground mt-0.5 block truncate text-xs">{hostname(source.url)}</span>
                </span>
              </motion.a>
            ))}
          </motion.div>
        </section>
      )}
    </div>
  );
}

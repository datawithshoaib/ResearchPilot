import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { Background } from "@/components/layout/background";
import { Providers } from "@/components/layout/providers";

import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: {
    default: "ResearchPilot — multi-agent research briefs",
    template: "%s · ResearchPilot",
  },
  description:
    "Assemble a panel of AI analysts, run parallel web-grounded interviews, and get a cited research report in minutes.",
  openGraph: {
    title: "ResearchPilot",
    description: "Ask anything. Get a cited research brief written by a panel of AI analysts.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0f1a" },
    { media: "(prefers-color-scheme: light)", color: "#fafaff" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${serif.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <Providers>
          <Background />
          {children}
        </Providers>
      </body>
    </html>
  );
}

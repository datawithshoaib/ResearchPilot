import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchPilot · Multi-agent research briefs",
  description:
    "Generate an analyst panel, run parallel web-grounded interviews, and synthesize a cited research report.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-dvh antialiased">{children}</body>
    </html>
  );
}

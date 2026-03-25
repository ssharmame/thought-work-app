import "./globals.css";

import { Fraunces } from "next/font/google";
import type { Metadata } from "next";

// Fraunces — variable serif with soft, warm letterforms.
// SOFT axis (0–100): rounder, friendlier feel — we use 40–60 in CSS.
// opsz axis (9–144): optical sizing per text size for crisp rendering.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],   // load variable axes so CSS can dial them in
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ThoughtLens",
  description: "Understand the story your mind is telling.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} scroll-smooth`}>
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

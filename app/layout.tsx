import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thoughtlensai",
  description: "Understand the story your mind is telling.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}

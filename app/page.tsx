"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// REPLACE THESE THREE VALUES WHEN YOU HAVE THE REAL ASSETS
// ─────────────────────────────────────────────────────────────────────────────
const DASHBOARD_SCREENSHOT_URL = "/therapistviewscreenshot.ping"; // paste your dashboard screenshot URL here
const FOUNDER_PHOTO_URL = "/sunil.png";        // paste your profile image URL here
const LINKEDIN_URL = "https://www.linkedin.com/in/sunil-sharma-21306255/";             // paste your LinkedIn profile URL here
const CONTACT_EMAIL = "sunil@thoughtlensai.com"; // your contact email
// ─────────────────────────────────────────────────────────────────────────────

// ── Animation helper ──────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay },
  }),
};

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      custom={delay}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground mb-4">
      {children}
    </p>
  );
}

function SectionDivider() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="border-t border-border" />
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b border-border"
      style={{ background: "oklch(0.977 0.008 88 / 0.94)" }}
    >
      <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="font-display text-xl font-semibold text-foreground tracking-tight">
          ThoughtLens
        </span>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => scrollTo("in-session")}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            See it
          </button>
          <button
            type="button"
            onClick={() => scrollTo("how-it-works")}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => scrollTo("why-i-built-this")}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => scrollTo("contact")}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Contact
          </button>
        </div>

        <Link
          href="/tool"
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide transition"
          style={{
            background: "oklch(0.13 0.012 248)",
            color: "oklch(0.97 0.004 88)",
          }}
        >
          Try it
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>
    </header>
  );
}

// ── 1. Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-20 px-6">
      {/* Very subtle background wash — not decorative */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 0%, oklch(0.9 0.04 150 / 0.25) 0%, transparent 75%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto">
        <FadeUp delay={0}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground mb-6">
            For therapists &amp; coaches
          </p>
        </FadeUp>

        <FadeUp delay={0.07}>
          <h1 className="font-display text-5xl md:text-6xl lg:text-[4.5rem] font-semibold leading-[1.1] tracking-tight text-foreground text-balance mb-7 max-w-[720px]">
            Understand what happens{" "}
            <span className="italic" style={{ color: "oklch(0.4 0.12 152)" }}>
              between sessions
            </span>{" "}
            — before the next one starts.
          </h1>
        </FadeUp>

        <FadeUp delay={0.14}>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[540px] leading-relaxed mb-10">
            ThoughtLens captures your client&apos;s thoughts, patterns, and
            emotional signals between sessions — and organises them into a
            clear starting point for your next conversation.
          </p>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Link
              href="/tool"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold tracking-wide transition"
              style={{
                background: "oklch(0.13 0.012 248)",
                color: "oklch(0.97 0.004 88)",
                boxShadow:
                  "0 4px 16px oklch(0.13 0.012 248 / 0.2), 0 1px 3px oklch(0.13 0.012 248 / 0.1)",
              }}
            >
              Try with a reflection
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("in-session")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-base font-medium text-foreground transition hover:bg-secondary/30"
            >
              See what it shows you
            </button>
          </div>
        </FadeUp>

        <FadeUp delay={0.27}>
          <p className="mt-8 text-sm text-muted-foreground/60 max-w-sm">
            Not a therapy replacement. Not a journaling app. A structured
            view of what your client brings between sessions.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ── 2. Dashboard / In-session screenshot ──────────────────────────────────────
function InSession() {
  return (
    <section
      className="px-6 py-20 max-w-5xl mx-auto"
      id="in-session"
    >
      <FadeUp>
        <Eyebrow>Before your next session</Eyebrow>
        <h2 className="font-display text-4xl md:text-[2.75rem] font-semibold tracking-tight text-foreground text-balance mb-4 max-w-2xl">
          You already see this when you log in.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mb-10">
          Before sitting down with your client, you see the patterns that came
          up in the last week — summarised, not interpreted — so the session
          can start where it actually matters.
        </p>
      </FadeUp>

      {/* Screenshot panel */}
      <FadeUp delay={0.08}>
        <div
          className="w-full rounded-[24px] border border-border overflow-hidden"
          style={{
            background: "oklch(0.985 0.006 88)",
            boxShadow: "0 28px 72px oklch(0.18 0.015 248 / 0.1), 0 4px 12px oklch(0.18 0.015 248 / 0.05)",
          }}
        >
          {DASHBOARD_SCREENSHOT_URL ? (
            <Image
              src={"/Therapistviewscreenshot.png"}
              alt="ThoughtLens therapist dashboard — shows session starting point, suggested opening question, pattern summary, and situational belief"
              width={1200}
              height={800}
              className="w-full h-auto"
              priority
            />
          ) : (
            /* Placeholder — remove once you paste a real URL above */
            <div className="flex flex-col items-center justify-center gap-3 py-24 px-6 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "oklch(0.93 0.02 150 / 0.5)" }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="oklch(0.4 0.1 152)"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Dashboard screenshot</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Paste your screenshot URL in{" "}
                <code className="text-[11px] bg-secondary/40 px-1.5 py-0.5 rounded">
                  DASHBOARD_SCREENSHOT_URL
                </code>{" "}
                at the top of this file.
              </p>
            </div>
          )}
        </div>
      </FadeUp>

      {/* What you're seeing — 4 bullets */}
      <FadeUp delay={0.14}>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "What has been repeating",
              body: "Which thoughts and patterns your client returned to most across the week.",
            },
            {
              label: "What it may be leading to",
              body: "A situational belief forming across reflections — offered as a hypothesis, not a diagnosis.",
            },
            {
              label: "How to begin the session",
              body: "A suggested opening question grounded in what the client actually wrote.",
            },
            {
              label: "What might be beneath the surface",
              body: "The emotional signal that kept appearing alongside the pattern, shown with frequency.",
            },
          ].map(({ label, body }, i) => (
            <div
              key={label}
              className="rounded-[20px] border border-border bg-card/70 px-5 py-5"
            >
              <p
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold mb-3"
                style={{
                  background: "oklch(0.93 0.025 150 / 0.6)",
                  color: "oklch(0.36 0.1 152)",
                }}
              >
                {i + 1}
              </p>
              <p className="text-sm font-semibold text-foreground mb-1.5">
                {label}
              </p>
              <p className="text-xs leading-6 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </FadeUp>
    </section>
  );
}

// ── 3. What gets lost ─────────────────────────────────────────────────────────
function WhatGetsLost() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto" id="what-gets-lost">
      <FadeUp>
        <Eyebrow>The gap this fills</Eyebrow>
        <h2 className="font-display text-4xl md:text-[2.75rem] font-semibold tracking-tight text-foreground text-balance mb-5 max-w-2xl">
          This helps you see what usually gets lost between sessions.
        </h2>
      </FadeUp>

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        {[
          {
            heading: "Clients compress what happened.",
            body: "By the time they sit down with you, a week of experience often becomes a one-line summary. The texture — the repeated thought, the specific moment — gets left out.",
          },
          {
            heading: "Patterns are hard to track manually.",
            body: "A single session shows you a slice. Noticing that the same fear has appeared in different situations across three weeks takes consistent tracking most practitioners don't have time for.",
          },
          {
            heading: "This makes it visible — without over-interpreting.",
            body: "ThoughtLens surfaces what's recurring and leaves the clinical interpretation to you. No labels, no diagnoses — just what came up, how often, and in what context.",
          },
        ].map(({ heading, body }, i) => (
          <FadeUp key={heading} delay={i * 0.07}>
            <div className="rounded-[22px] border border-border bg-card/75 px-5 py-6 h-full">
              <p className="text-sm font-semibold text-foreground mb-3">
                {heading}
              </p>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

// ── 4. How it works ───────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto" id="how-it-works">
      <FadeUp>
        <Eyebrow>How it works</Eyebrow>
        <h2 className="font-display text-4xl md:text-[2.75rem] font-semibold tracking-tight text-foreground text-balance mb-4 max-w-xl">
          Simple to set up. Useful from the first session.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-12">
          No extra app. No complicated onboarding. You invite a client, they
          reflect, you see the pattern.
        </p>
      </FadeUp>

      <div className="relative grid md:grid-cols-3 gap-5">
        {/* Connector line */}
        <div
          aria-hidden
          className="hidden md:block absolute top-[50px] left-[calc(16.66%+18px)] right-[calc(16.66%+18px)] h-px"
          style={{ background: "oklch(0.88 0.01 88)" }}
        />

        {[
          {
            step: "1",
            title: "Client reflects",
            body: "You invite a client. Between sessions, they take a few minutes to explore a thought or situation that came up. Short, open-ended, no pressure.",
          },
          {
            step: "2",
            title: "Patterns are captured",
            body: "Across their reflections, you see which thoughts keep recurring, what emotions they connect to, and whether a situational belief may be forming.",
          },
          {
            step: "3",
            title: "You see a structured summary before session",
            body: "Before you sit down together, you have a clear view of what's been happening — including a suggested way to open the conversation.",
          },
        ].map(({ step, title, body }, i) => (
          <FadeUp key={step} delay={i * 0.09}>
            <div className="rounded-[22px] border border-border bg-card/75 px-5 py-6 h-full">
              <div
                className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold mb-5"
                style={{
                  background: "oklch(0.93 0.028 150 / 0.6)",
                  color: "oklch(0.34 0.1 152)",
                  border: "1.5px solid oklch(0.76 0.08 150 / 0.45)",
                }}
              >
                {step}
              </div>
              <p className="text-sm font-semibold text-foreground mb-2">
                {title}
              </p>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

// ── 5. What you get ───────────────────────────────────────────────────────────
function WhatYouGet() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto" id="what-you-get">
      <div
        className="rounded-[28px] border border-border px-8 py-12 md:px-12 md:py-14"
        style={{
          background:
            "linear-gradient(150deg, oklch(0.985 0.012 150 / 0.5) 0%, oklch(0.977 0.008 88 / 1) 65%)",
        }}
      >
        <FadeUp>
          <Eyebrow>What you get</Eyebrow>
          <h2 className="font-display text-4xl md:text-[2.75rem] font-semibold tracking-tight text-foreground text-balance mb-4 max-w-xl">
            Concrete, usable — not a report to read through.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-10">
            Before each session, you have a clear picture. Not a wall of
            text — specific signals you can act on immediately.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              title: "Recurring thought patterns",
              body: "Which cognitive patterns (e.g. fortune telling, self-criticism, catastrophising) appeared most often — and how frequently.",
            },
            {
              title: "Emotional trends across time",
              body: "Which emotions are present, whether they're increasing or stable, and what situations tend to bring them out.",
            },
            {
              title: "A session starting point",
              body: "A suggested opening question grounded in what your client actually wrote — so the session doesn't start cold.",
            },
            {
              title: "An emerging belief — as a hypothesis",
              body: "What situational belief may be forming across reflections. Presented with a confidence level and an alternative interpretation.",
            },
            {
              title: "The client's own language",
              body: "The exact words your client used, preserved — so you can reflect back what they said, not a clinical translation of it.",
            },
            {
              title: "Grouped situations across time",
              body: "Whether the same situation or fear has come back more than once — and how the language around it has shifted.",
            },
          ].map(({ title, body }, i) => (
            <FadeUp key={title} delay={i * 0.05}>
              <div className="flex items-start gap-3.5 rounded-[18px] border border-border bg-background/85 px-5 py-5">
                <Check
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: "oklch(0.44 0.12 152)" }}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {title}
                  </p>
                  <p className="text-xs leading-6 text-muted-foreground">
                    {body}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 6. Scope & limits ─────────────────────────────────────────────────────────
function ScopeAndLimits() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto" id="scope">
      <FadeUp>
        <Eyebrow>What this is — and what it isn&apos;t</Eyebrow>
        <h2 className="font-display text-4xl md:text-[2.75rem] font-semibold tracking-tight text-foreground text-balance mb-5 max-w-xl">
          Designed to support the work.
          <br />
          Not to replace it.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-10">
          ThoughtLens is a reflection and pattern-capture tool. It does not
          make clinical assessments, offer diagnoses, or provide treatment of
          any kind.
        </p>
      </FadeUp>

      <div className="grid sm:grid-cols-2 gap-5">
        {[
          {
            label: "ThoughtLens is",
            items: [
              "A structured space for clients to reflect between sessions",
              "A pattern summary for you to review before the session",
              "A starting point for a conversation — not a conclusion",
              "A record of what came up in the client's own language",
            ],
            positive: true,
          },
          {
            label: "ThoughtLens is not",
            items: [
              "A replacement for therapy or clinical support",
              "A diagnostic tool of any kind",
              "A source of advice, guidance, or treatment",
              "Suitable for use in crisis or acute distress situations",
            ],
            positive: false,
          },
        ].map(({ label, items, positive }) => (
          <FadeUp key={label}>
            <div className="rounded-[22px] border border-border bg-card/75 px-6 py-6 h-full">
              <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground mb-5">
                {label}
              </p>
              <ul className="space-y-3.5">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: positive
                          ? "oklch(0.44 0.12 152)"
                          : "oklch(0.72 0.02 248)",
                      }}
                    />
                    <span className="text-sm leading-6 text-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        ))}
      </div>

      <FadeUp>
        <p className="mt-6 text-sm text-muted-foreground/70 leading-relaxed max-w-lg">
          If a client is in crisis or experiencing acute distress, please
          follow your existing clinical protocols. ThoughtLens is not monitored
          and is not a crisis service.
        </p>
      </FadeUp>
    </section>
  );
}

// ── 7. Why I built this ───────────────────────────────────────────────────────
function WhyIBuiltThis() {
  return (
    <section
      className="px-6 py-20 max-w-5xl mx-auto"
      id="why-i-built-this"
    >
      <div className="rounded-[28px] border border-border bg-card/60 px-8 py-12 md:px-12 md:py-14">
        <FadeUp>
          <Eyebrow>Why I built this</Eyebrow>
        </FadeUp>

        <div className="grid md:grid-cols-[1fr_280px] gap-10 items-start">
          <FadeUp delay={0.06}>
            <blockquote className="space-y-5 text-base md:text-lg leading-8 text-foreground">
              <p>
                After working on this problem, I noticed something that kept
                coming back.
              </p>
              <p>
                Most of the important work in therapy doesn&apos;t happen in the
                session. It happens in the moments clients don&apos;t fully
                remember — or can&apos;t quite articulate — when they finally
                sit down with you.
              </p>
              <p>
                ThoughtLens is an attempt to make that visible. Without
                replacing therapy, and without over-interpreting what&apos;s
                there.
              </p>
            </blockquote>

            <div className="mt-8 flex items-center gap-4">
              {FOUNDER_PHOTO_URL ? (
                <Image
                  src={FOUNDER_PHOTO_URL}
                  alt="Sunil Sharma"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover border border-border"
                />
              ) : (
                /* Placeholder avatar */
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                  style={{
                    background: "oklch(0.93 0.025 150 / 0.6)",
                    color: "oklch(0.36 0.1 152)",
                    border: "1.5px solid oklch(0.78 0.08 150 / 0.4)",
                  }}
                >
                  SS
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Sunil Sharma
                </p>
                <p className="text-xs text-muted-foreground">
                  Builder, ThoughtLens
                </p>
                {LINKEDIN_URL && (
                  <a
                    href={LINKEDIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {!LINKEDIN_URL && (
                  <p className="text-xs text-muted-foreground/50 mt-0.5 italic">
                    {/* Paste your LinkedIn URL in the constant above */}
                    LinkedIn — add URL above
                  </p>
                )}
              </div>
            </div>
          </FadeUp>

          {/* Profile image (large) — only shown on md+ */}
          <FadeUp delay={0.1} className="hidden md:block">
            {FOUNDER_PHOTO_URL ? (
              <Image
                src={FOUNDER_PHOTO_URL}
                alt="Sunil Sharma"
                width={280}
                height={340}
                className="w-full rounded-[22px] object-cover border border-border"
                style={{ maxHeight: "340px" }}
              />
            ) : (
              <div
                className="w-full rounded-[22px] border border-border flex flex-col items-center justify-center gap-3 py-14 px-6 text-center"
                style={{ background: "oklch(0.965 0.015 150 / 0.35)" }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{
                    background: "oklch(0.93 0.025 150 / 0.6)",
                    color: "oklch(0.36 0.1 152)",
                    border: "2px solid oklch(0.78 0.08 150 / 0.4)",
                  }}
                >
                  SS
                </div>
                <p className="text-xs text-muted-foreground/60 max-w-[160px]">
                  Paste your photo URL in{" "}
                  <code className="text-[11px] bg-secondary/40 px-1 py-0.5 rounded">
                    FOUNDER_PHOTO_URL
                  </code>
                </p>
              </div>
            )}
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

// ── 8. Contact ────────────────────────────────────────────────────────────────
function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Opens the user's mail client with pre-filled content.
    // Replace with a real form endpoint (Resend, Formspree, etc.) when ready.
    const subject = encodeURIComponent(`ThoughtLens — message from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <section className="px-6 py-20 max-w-5xl mx-auto" id="contact">
      <div className="max-w-lg">
        <FadeUp>
          <Eyebrow>Contact</Eyebrow>
          <h2 className="font-display text-4xl md:text-[2.75rem] font-semibold tracking-tight text-foreground text-balance mb-4">
            Curious about using this?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            If you&apos;re a therapist or coach and want to explore whether
            ThoughtLens could be useful in your practice, feel free to reach
            out. No sales pitch — just an honest conversation.
          </p>
        </FadeUp>

        {submitted ? (
          <FadeUp>
            <div className="rounded-[20px] border border-border bg-card/70 px-6 py-8">
              <p className="text-sm font-semibold text-foreground mb-1">
                Your mail client should have opened.
              </p>
              <p className="text-sm text-muted-foreground">
                If it didn&apos;t, email directly at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </FadeUp>
        ) : (
          <FadeUp delay={0.06}>
            <form
              onSubmit={handleSubmit}
              className="rounded-[22px] border border-border bg-card/70 px-6 py-8 space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label
                    htmlFor="contact-name"
                    className="block text-xs uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="contact-email"
                    className="block text-xs uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="contact-message"
                  className="block text-xs uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Message{" "}
                  <span className="normal-case tracking-normal text-muted-foreground/50">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How are you thinking about using ThoughtLens, or what questions do you have?"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground/60">
                  Or email directly:{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="underline underline-offset-4 hover:text-muted-foreground transition-colors"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition"
                  style={{
                    background: "oklch(0.13 0.012 248)",
                    color: "oklch(0.97 0.004 88)",
                  }}
                >
                  Send
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </FadeUp>
        )}
      </div>
    </section>
  );
}

// ── 9. Final CTA ──────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="px-6 py-24 max-w-5xl mx-auto text-center" id="cta">
      <FadeUp>
        <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground text-balance mb-5 max-w-2xl mx-auto">
          Try it with a real client scenario.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto mb-10">
          Walk through the full flow — from client reflection to your session
          view — with a built-in sample, or invite a real client to start.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/tool"
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold tracking-wide transition"
            style={{
              background: "oklch(0.13 0.012 248)",
              color: "oklch(0.97 0.004 88)",
              boxShadow:
                "0 4px 18px oklch(0.13 0.012 248 / 0.2), 0 1px 3px oklch(0.13 0.012 248 / 0.1)",
            }}
          >
            Try with a reflection
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-8 py-4 text-base font-medium text-foreground transition hover:bg-secondary/30"
          >
            Sign in
          </Link>
        </div>
      </FadeUp>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <span className="font-display text-base font-semibold text-foreground tracking-tight">
            ThoughtLens
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            Between-session intelligence for therapists and coaches.
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          {LINKEDIN_URL && (
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              LinkedIn
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-foreground transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
        <p className="text-xs text-muted-foreground/50">
          Not a medical device. Not a crisis service.
        </p>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.977 0.008 88)" }}
    >
      <Navbar />
      <Hero />
      <SectionDivider />
      <InSession />
      <SectionDivider />
      <WhatGetsLost />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <WhatYouGet />
      <SectionDivider />
      <ScopeAndLimits />
      <SectionDivider />
      <WhyIBuiltThis />
      <SectionDivider />
      <Contact />
      <SectionDivider />
      <FinalCTA />
      <Footer />
    </div>
  );
}

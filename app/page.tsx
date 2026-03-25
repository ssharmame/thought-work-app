"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const DASHBOARD_SCREENSHOT_URL = "/therapistviewscreenshot.png";
const FOUNDER_PHOTO_URL = "/sunil.png";
const LINKEDIN_URL = "https://www.linkedin.com/in/sunil-sharma-21306255/";
const CONTACT_EMAIL = "sunil@thoughtlensai.com";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay },
  }),
};

const featureBullets = [
  {
    label: "What has been repeating",
    body: "Which thoughts and patterns your client returned to most across the week.",
  },
  {
    label: "What it may be leading to",
    body: "A situational belief forming across reflections, shown as a hypothesis rather than a conclusion.",
  },
  {
    label: "How to begin the session",
    body: "A suggested opening question grounded in what the client actually wrote.",
  },
  {
    label: "What sits underneath",
    body: "The emotional signal that kept appearing with the pattern, shown with frequency.",
  },
];

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
      {children}
    </p>
  );
}

function SectionDivider() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="border-t border-border/80" />
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  className?: string;
}) {
  return (
    <FadeUp className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="max-w-3xl text-balance font-display text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem] md:text-[3rem]">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-muted-foreground md:text-lg md:leading-8">
          {body}
        </p>
      ) : null}
    </FadeUp>
  );
}

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-border/80 bg-card/75 ${className}`}
      style={{ boxShadow: "0 18px 50px oklch(0.22 0.018 248 / 0.06)" }}
    >
      {children}
    </div>
  );
}

function Navbar() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/80 backdrop-blur-xl"
      style={{ background: "oklch(0.977 0.008 88 / 0.84)" }}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 font-display text-xs font-semibold text-foreground sm:h-9 sm:w-9 sm:text-sm"
            style={{
              background:
                "linear-gradient(145deg, oklch(0.985 0.01 88) 0%, oklch(0.94 0.03 150 / 0.9) 100%)",
            }}
          >
            TL
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              ThoughtLens
            </p>
            <p className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
              Between-session clarity
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
          <button
            type="button"
            onClick={() => scrollTo("in-session")}
            className="transition-colors hover:text-foreground"
          >
            Product
          </button>
          <button
            type="button"
            onClick={() => scrollTo("how-it-works")}
            className="transition-colors hover:text-foreground"
          >
            Workflow
          </button>
          <button
            type="button"
            onClick={() => scrollTo("why-i-built-this")}
            className="transition-colors hover:text-foreground"
          >
            Story
          </button>
          <button
            type="button"
            onClick={() => scrollTo("contact")}
            className="transition-colors hover:text-foreground"
          >
            Contact
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground md:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/tool"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold tracking-wide transition sm:gap-2 sm:px-5"
            style={{
              background: "oklch(0.13 0.012 248)",
              color: "oklch(0.97 0.004 88)",
            }}
          >
            Try it
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 md:pb-28 md:pt-20">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[620px]"
        style={{
          background: [
            "radial-gradient(circle at 18% 16%, oklch(0.9 0.045 150 / 0.26), transparent 26%)",
            "radial-gradient(circle at 82% 8%, oklch(0.92 0.035 220 / 0.18), transparent 22%)",
            "linear-gradient(180deg, oklch(0.99 0.006 88) 0%, transparent 100%)",
          ].join(", "),
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-start">
        <div className="pt-4 md:pt-8">
          <FadeUp>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              For therapists and coaches
            </div>
          </FadeUp>

          <FadeUp delay={0.06}>
            <h1 className="max-w-4xl text-balance font-display text-[2.85rem] font-semibold leading-[0.98] tracking-tight text-foreground sm:text-[3.65rem] md:text-[4.6rem]">
              See the pattern
              <br />
              before the session
              <span style={{ color: "oklch(0.4 0.12 152)" }}> begins.</span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.12}>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 md:text-xl">
              ThoughtLens captures what your client notices between sessions,
              then turns it into a calm, structured starting point for the next
              conversation.
            </p>
          </FadeUp>

          <FadeUp delay={0.18}>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
              <Link
                href="/tool"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold tracking-wide transition sm:w-auto sm:px-7"
                style={{
                  background: "oklch(0.13 0.012 248)",
                  color: "oklch(0.97 0.004 88)",
                  boxShadow:
                    "0 10px 24px oklch(0.13 0.012 248 / 0.16), 0 2px 6px oklch(0.13 0.012 248 / 0.08)",
                }}
              >
                Try with a reflection
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#in-session"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/80 bg-background/80 px-6 py-3.5 text-base font-medium text-foreground transition hover:bg-secondary/25 sm:w-auto sm:px-7"
              >
                See the dashboard
              </a>
            </div>
          </FadeUp>

          <FadeUp delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/80 bg-background/75 px-3 py-1.5">
                Not a journaling app
              </span>
              <span className="rounded-full border border-border/80 bg-background/75 px-3 py-1.5">
                Not a therapy replacement
              </span>
              <span className="rounded-full border border-border/80 bg-background/75 px-3 py-1.5">
                Built for session prep
              </span>
            </div>
          </FadeUp>
        </div>

        <FadeUp delay={0.16}>
          <SurfaceCard className="px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6">
            <div
              className="rounded-[20px] border border-border/70 px-4 py-4 sm:px-5 sm:py-5"
              style={{
                background:
                  "linear-gradient(155deg, oklch(0.995 0.004 88 / 0.98) 0%, oklch(0.97 0.018 150 / 0.8) 100%)",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Why it feels different
              </p>
              <p className="mt-2 font-display text-[1.55rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.9rem]">
                Built for session preparation, not generic journaling.
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:leading-7">
                The therapist sees a structured review centered on what changed,
                what repeated, and where the next conversation could begin.
              </p>

              <div className="mt-6 grid gap-3">
                <div className="rounded-[18px] border border-border/80 bg-background/78 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Session guide
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    A starting point, suggested opening, and the reason it matters.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-border/80 bg-background/78 p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Client summary
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      Dominant pattern, recent thoughts, and emotion summary from the last week.
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-border/80 bg-background/78 p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Belief layering
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      A working hypothesis built from recurring reflections, with rationale and alternatives.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </FadeUp>
      </div>
    </section>
  );
}

function InSession() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24" id="in-session">
      <SectionIntro
        eyebrow="Before your next session"
        title="You open the dashboard and already know where the work might begin."
        body="This is the actual practitioner view from the product. Instead of reconstructing the week from memory, you see the recurring thought patterns, emotional signals, and a grounded way to begin the conversation."
      />

      <FadeUp delay={0.08}>
        <SurfaceCard className="mt-10 overflow-hidden p-2 sm:p-3 md:mt-12 md:p-4">
          <div
            className="rounded-[20px] border border-border/80 overflow-hidden"
            style={{ background: "oklch(0.988 0.006 88)" }}
          >
            <div className="flex flex-col gap-2 border-b border-border/80 bg-background/75 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Actual practitioner dashboard
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  Real product screenshot showing the pre-session review flow.
                </p>
              </div>
              <span className="w-fit rounded-full border border-border/80 bg-background px-3 py-1 text-xs text-muted-foreground">
                Real screenshot
              </span>
            </div>
            {DASHBOARD_SCREENSHOT_URL ? (
              <Image
                src={DASHBOARD_SCREENSHOT_URL}
                alt="ThoughtLens therapist dashboard showing client patterns, session opening, and recurring themes"
                width={1400}
                height={920}
                className="h-auto w-full"
                priority
              />
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
                <p className="font-display text-2xl font-semibold text-foreground">
                  Dashboard screenshot
                </p>
                <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                  Add a screenshot to <code>DASHBOARD_SCREENSHOT_URL</code> at the
                  top of this file.
                </p>
              </div>
            )}
          </div>
        </SurfaceCard>
      </FadeUp>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {featureBullets.map((item, index) => (
          <FadeUp key={item.label} delay={0.05 * index}>
            <SurfaceCard className="h-full px-5 py-5">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background text-xs font-semibold text-foreground">
                0{index + 1}
              </div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {item.body}
              </p>
            </SurfaceCard>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

function WhatGetsLost() {
  const items = [
    {
      heading: "Clients compress the week into a sentence.",
      body: "By the time the session starts, a week of internal experience often becomes a vague summary. The repeated thought and the exact situation disappear.",
    },
    {
      heading: "Patterns are hard to hold across sessions.",
      body: "Even strong clinicians rarely have the time to compare scattered notes and spot that the same fear has resurfaced in different moments.",
    },
    {
      heading: "ThoughtLens makes recurrence visible.",
      body: "It surfaces what keeps appearing, preserves the client’s language, and leaves interpretation where it belongs: with you.",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <SectionIntro
        eyebrow="The gap this fills"
        title="This helps you see what usually gets lost between sessions."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {items.map((item, index) => (
          <FadeUp key={item.heading} delay={index * 0.06}>
            <SurfaceCard className="h-full px-6 py-6">
              <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {item.heading}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {item.body}
              </p>
            </SurfaceCard>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Client reflects between sessions",
      body: "You invite a client. They capture a thought, moment, or recurring worry in a short guided reflection when it actually happens.",
    },
    {
      step: "02",
      title: "The product organizes recurrence",
      body: "Recurring patterns, emotional trends, and possible situational beliefs are grouped into a clear pre-session view.",
    },
    {
      step: "03",
      title: "You start from what matters",
      body: "Before the next session, you already have a useful map of what returned, what intensified, and where the conversation might begin.",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24" id="how-it-works">
      <SectionIntro
        eyebrow="How it works"
        title="Simple to set up. Useful from the first client."
        body="No new workflow to learn. The product is designed to support clinical work, not create more admin around it."
      />

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {steps.map((step, index) => (
          <FadeUp key={step.step} delay={index * 0.08}>
            <SurfaceCard className="h-full px-6 py-6">
              <div className="flex items-center justify-between gap-4">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/80 text-sm font-semibold text-foreground"
                  style={{ background: "oklch(0.95 0.02 150 / 0.7)" }}
                >
                  {step.step}
                </span>
                <div className="h-px flex-1 bg-border/70" />
              </div>
              <p className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
                {step.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {step.body}
              </p>
            </SurfaceCard>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

function WhatYouGet() {
  const items = [
    "Recurring thought patterns with frequency, not just labels.",
    "Emotional trends across time and the situations that trigger them.",
    "A suggested session opening grounded in the client’s own language.",
    "An emerging belief framed as a working hypothesis.",
    "The original wording the client used, preserved for context.",
    "Grouped situations across time, so recurrence is obvious at a glance.",
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div
        className="rounded-[28px] border border-border/80 px-5 py-8 sm:px-6 md:rounded-[32px] md:px-10 md:py-12"
        style={{
          background:
            "linear-gradient(150deg, oklch(0.995 0.004 88 / 0.98) 0%, oklch(0.968 0.02 150 / 0.82) 100%)",
          boxShadow: "0 24px 70px oklch(0.22 0.018 248 / 0.08)",
        }}
      >
        <SectionIntro
          eyebrow="What you get"
          title="Concrete, usable, session-facing information."
          body="Not another report to read through. A compact view of the signals that can shape the next conversation."
        />

        <div className="mt-10 grid gap-4 md:auto-rows-fr md:grid-cols-2">
          {items.map((item, index) => (
            <FadeUp key={item} delay={index * 0.04}>
              <div className="flex h-full items-start gap-3 rounded-[18px] border border-border/80 bg-background/80 px-5 py-4">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "oklch(0.44 0.12 152)" }}
                />
                <p className="text-sm leading-7 text-foreground">{item}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScopeAndLimits() {
  const columns = [
    {
      label: "ThoughtLens is",
      items: [
        "A structured space for reflection between sessions",
        "A pattern summary for session preparation",
        "A way to preserve the client’s language over time",
        "A starting point for a clinical conversation",
      ],
      dot: "oklch(0.44 0.12 152)",
    },
    {
      label: "ThoughtLens is not",
      items: [
        "A replacement for therapy or coaching",
        "A diagnostic tool",
        "A source of treatment, advice, or crisis response",
        "Suitable for acute distress or emergency situations",
      ],
      dot: "oklch(0.58 0.03 248)",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24" id="scope">
      <SectionIntro
        eyebrow="What this is and what it is not"
        title={
          <>
            Designed to support the work.
            <br />
            Not replace it.
          </>
        }
        body="ThoughtLens helps capture and structure reflection. It does not assess, diagnose, or treat."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {columns.map((column, index) => (
          <FadeUp key={column.label} delay={index * 0.06}>
            <SurfaceCard className="h-full px-6 py-6">
              <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                {column.label}
              </p>
              <ul className="mt-6 space-y-4">
                {column.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-2 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: column.dot }}
                    />
                    <span className="text-sm leading-7 text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          </FadeUp>
        ))}
      </div>

      <FadeUp delay={0.12}>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">
          If a client is in crisis or acute distress, practitioners should follow
          their existing protocols. ThoughtLens is not monitored and is not a
          crisis service.
        </p>
      </FadeUp>
    </section>
  );
}

function WhyIBuiltThis() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24" id="why-i-built-this">
      <SurfaceCard className="overflow-hidden px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_300px] md:items-start">
          <div>
            <SectionIntro
              eyebrow="Why I built this"
              title="Most of the important work does not happen in the room."
              body="It happens in the moments clients almost forget by the time the session begins. ThoughtLens is an attempt to make those moments easier to carry into the work."
            />

            <FadeUp delay={0.08}>
              <blockquote className="mt-8 border-l border-border pl-6 text-base leading-8 text-foreground md:text-lg">
                <p>
                  Clients often arrive with the summary version of the week.
                  The repeated thought, the exact trigger, and the emotional tone
                  have already been compressed.
                </p>
                <p className="mt-5">
                  I wanted a way to preserve that texture without pretending the
                  software should interpret the work for the practitioner.
                </p>
              </blockquote>
            </FadeUp>

            <FadeUp delay={0.12}>
              <div className="mt-8 flex items-center gap-4">
                {FOUNDER_PHOTO_URL ? (
                  <Image
                    src={FOUNDER_PHOTO_URL}
                    alt="Sunil Sharma"
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background font-semibold text-foreground">
                    SS
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">Sunil Sharma</p>
                  <p className="text-xs text-muted-foreground">Builder, ThoughtLens</p>
                  {LINKEDIN_URL ? (
                    <a
                      href={LINKEDIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </div>
            </FadeUp>
          </div>

          <FadeUp delay={0.1} className="hidden md:block">
            {FOUNDER_PHOTO_URL ? (
              <Image
                src={FOUNDER_PHOTO_URL}
                alt="Sunil Sharma"
                width={300}
                height={380}
                className="h-auto w-full rounded-[24px] border border-border object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center rounded-[24px] border border-border bg-background">
                <span className="font-display text-3xl font-semibold text-foreground">
                  ThoughtLens
                </span>
              </div>
            )}
          </FadeUp>
        </div>
      </SurfaceCard>
    </section>
  );
}

function Contact() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24" id="contact">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_360px] md:items-end">
        <SectionIntro
          eyebrow="Contact"
          title="Curious whether this could fit your practice?"
          body="If you are a therapist or coach and want to explore how ThoughtLens might be useful, reach out. No pitch deck, no funnel, just a direct conversation."
        />

        <FadeUp delay={0.08}>
          <SurfaceCard className="px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Email
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 block max-w-full font-sans text-[0.98rem] font-semibold tracking-[-0.01em] text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-muted-foreground sm:text-[1.02rem] md:text-[1.08rem]"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Best for early conversations, pilot interest, or product feedback.
            </p>
          </SurfaceCard>
        </FadeUp>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28" id="cta">
      <div
        className="rounded-[28px] border border-border/80 px-5 py-10 text-center sm:px-6 md:rounded-[32px] md:px-10 md:py-12"
        style={{
          background: [
            "radial-gradient(circle at top, oklch(0.92 0.04 150 / 0.2), transparent 36%)",
            "linear-gradient(180deg, oklch(0.99 0.005 88) 0%, oklch(0.975 0.01 88) 100%)",
          ].join(", "),
          boxShadow: "0 26px 80px oklch(0.22 0.018 248 / 0.08)",
        }}
      >
        <FadeUp>
          <h2 className="mx-auto max-w-3xl text-balance font-display text-[2.1rem] font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Try it with a real client reflection and see how the session view feels.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground md:text-lg">
            Walk through the product from the client reflection to the therapist
            dashboard, then decide whether it is worth bringing into your practice.
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/tool"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold tracking-wide transition sm:w-auto"
              style={{
                background: "oklch(0.13 0.012 248)",
                color: "oklch(0.97 0.004 88)",
              }}
            >
              Try with a reflection
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/80 bg-background/80 px-8 py-4 text-base font-medium text-foreground transition hover:bg-secondary/25 sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/80 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            ThoughtLens
          </span>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Between-session intelligence for therapists and coaches
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          {LINKEDIN_URL ? (
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              LinkedIn
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="transition-colors hover:text-foreground"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <p className="text-xs text-muted-foreground/70">
          Not a medical device. Not a crisis service.
        </p>
      </div>
    </footer>
  );
}

export default function MarketingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: [
          "radial-gradient(circle at top, oklch(0.99 0.01 88) 0%, transparent 30%)",
          "oklch(0.977 0.008 88)",
        ].join(", "),
      }}
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

"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Eye,
  Heart,
  Layers,
  Sparkles,
  TrendingUp,
  User,
  X,
} from "lucide-react";

import { motion } from "framer-motion";

// ── Fade-up animation helper ────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" as const, delay },
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
      viewport={{ once: true, margin: "-50px" }}
      custom={delay}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </p>
  );
}

// ── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="font-display text-xl font-semibold text-foreground tracking-tight">
          ThoughtLens.ai
        </span>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => scrollTo("how-it-works")}
            className="hover:text-foreground transition-colors"
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => scrollTo("different")}
            className="hover:text-foreground transition-colors"
          >
            Why different
          </button>
          <button
            type="button"
            onClick={() => scrollTo("vision")}
            className="hover:text-foreground transition-colors"
          >
            Vision
          </button>
        </div>

        <Link
          href="/tool"
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90"
        >
          Try the tool
        </Link>
      </nav>
    </header>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative overflow-hidden pt-24 pb-36 px-6">
      {/* --- Atmospheric background: richer, more layered --- */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[560px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.82 0.09 150 / 0.45) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-10 right-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.88 0.06 75 / 0.35) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-1/3 -left-20 w-[300px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.86 0.05 200 / 0.25) 0%, transparent 65%)",
        }}
      />

      <div className="relative max-w-5xl lg:max-w-6xl mx-auto text-center">
        <FadeUp delay={0}>
          <Badge className="mb-7 bg-accent text-accent-foreground border-0 text-xs font-semibold px-4 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3 mr-1.5" />
            AI-Powered Thinking Clarity
          </Badge>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h1 className="font-display text-5xl md:text-6xl lg:text-[5.25rem] xl:text-[5.7rem] 2xl:text-[6.25rem] font-semibold leading-[1.08] tracking-tight text-foreground text-balance mb-7">
            Understand your
            <br />
            <span className="italic" style={{ color: "oklch(0.46 0.12 152)" }}>
              thoughts
            </span>{" "}
            clearly.
          </h1>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-lg mx-auto leading-relaxed mb-11 text-balance">
            Most people can&apos;t tell the difference between a fact and a
            story their mind creates. ThoughtLens.ai helps you see the difference.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/tool"
            className="inline-flex items-center justify-center rounded-full bg-primary px-9 py-3 text-base font-semibold uppercase tracking-[0.15em] text-primary-foreground transition hover:bg-primary/90"
            style={{
              boxShadow:
                "0 4px 20px oklch(0.46 0.12 152 / 0.35), 0 1px 4px oklch(0.46 0.12 152 / 0.2)",
            }}
          >
            Launch the tool
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
          <button
            type="button"
            data-ocid="hero.link"
            onClick={() => scrollTo("how-it-works")}
            className="text-muted-foreground hover:text-foreground text-base underline underline-offset-4 transition-colors"
          >
            See how it works
          </button>
        </div>
        </FadeUp>

        {/* --- Premium product preview card --- */}
        <FadeUp delay={0.45}>
          <div className="mt-20 relative mx-auto max-w-[480px]">
            {/* Ambient glow behind the card */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-3xl scale-110 blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 80%, oklch(0.78 0.10 150 / 0.35) 0%, transparent 70%)",
              }}
            />

            {/* Floating background card for depth */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-3xl -rotate-2 scale-[0.97]"
              style={{
                background: "oklch(0.90 0.06 150 / 0.4)",
                boxShadow: "0 16px 48px oklch(0.22 0.018 248 / 0.08)",
              }}
            />

            {/* Main card */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.025 150) 100%)",
                boxShadow:
                  "0 24px 64px oklch(0.22 0.018 248 / 0.14), 0 4px 16px oklch(0.22 0.018 248 / 0.07), inset 0 1px 0 oklch(1 0 0 / 0.8)",
                border: "1px solid oklch(0.88 0.025 150 / 0.6)",
              }}
            >
              {/* Card header */}
              <div
                className="px-7 pt-6 pb-5 border-b"
                style={{
                  borderColor: "oklch(0.88 0.025 150 / 0.5)",
                  background: "oklch(0.975 0.012 88 / 0.8)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.46 0.12 152 / 0.14)" }}
                  >
                    <Brain
                      className="w-4 h-4"
                      style={{ color: "oklch(0.46 0.12 152)" }}
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Your thought
                    </p>
                    <p className="text-foreground text-sm leading-snug font-medium mt-0.5">
                      &ldquo;My manager said &lsquo;let&rsquo;s talk tomorrow&rsquo;. I feel like I&rsquo;m about to be fired.&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Analysis chips */}
              <div className="px-7 py-5 grid grid-cols-2 gap-2.5">
                {[
                  {
                    label: "Fact",
                    value: "Manager scheduled a meeting tomorrow",
                    bg: "oklch(0.93 0.025 220 / 0.7)",
                    dot: "oklch(0.55 0.10 220)",
                  },
                  {
                    label: "Story",
                    value: "I might be getting fired",
                    bg: "oklch(0.93 0.05 30 / 0.5)",
                    dot: "oklch(0.58 0.14 30)",
                  },
                  {
                    label: "Emotion",
                    value: "Anxiety",
                    bg: "oklch(0.93 0.05 30 / 0.5)",
                    dot: "oklch(0.58 0.14 30)",
                  },
                  {
                    label: "Pattern",
                    value: "Fortune telling",
                    bg: "oklch(0.92 0.04 150 / 0.6)",
                    dot: "oklch(0.46 0.12 152)",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl px-3.5 py-3"
                    style={{ background: item.bg }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: item.dot }}
                      />
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: item.dot }}
                      >
                        {item.label}
                      </p>
                    </div>
                    <p className="text-xs text-foreground font-medium leading-snug">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Problem Section ───────────────────────────────────────────────────────────
function ProblemSection() {
  const thoughts = [
    "My career is finished.",
    "Nobody respects me.",
    "This will never work out.",
    "I will end up alone.",
  ];

  return (
    <section
      id="problem"
      data-ocid="section.problem"
      className="py-28 px-6 scroll-mt-16"
      style={{ background: "oklch(0.945 0.008 88)" }}
    >
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <SectionLabel>The Problem</SectionLabel>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground text-balance leading-tight mb-6">
            Your mind creates stories.
            <br />
            <span className="italic" style={{ color: "oklch(0.46 0.12 152)" }}>
              Fast.
            </span>
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed mb-14">
            When something stressful happens, the mind instantly generates
            conclusions. These feel completely real — but they&apos;re usually
            thinking patterns, not facts.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {thoughts.map((thought, i) => (
            <FadeUp key={thought} delay={i * 0.08}>
              <div
                className="rounded-2xl p-6 border border-border bg-card"
                style={{
                  boxShadow: "0 2px 16px oklch(0.22 0.018 248 / 0.05)",
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.90 0.06 29 / 0.35)" }}
                  >
                    <Brain
                      className="w-3.5 h-3.5"
                      style={{ color: "oklch(0.52 0.15 30)" }}
                    />
                  </div>
                    <p className="text-foreground font-medium text-sm leading-snug lg:text-base">
                      &ldquo;{thought}&rdquo;
                    </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp>
            <div
              className="rounded-2xl p-6 border"
              style={{
                background: "oklch(0.46 0.12 152 / 0.07)",
                borderColor: "oklch(0.46 0.12 152 / 0.22)",
              }}
            >
              <p className="text-foreground text-base lg:text-lg leading-relaxed">
              These feel real. But they are often{" "}
              <strong>thinking patterns — not facts.</strong> Most people get
              stuck here because no tool helps them see the difference.
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Product Section ───────────────────────────────────────────────────────────
const capabilities = [
  {
    icon: Eye,
    title: "What actually happened",
    desc: "Separates the objective situation from the interpretation your mind added.",
  },
  {
    icon: Brain,
    title: "How your mind interpreted it",
    desc: "Surfaces the invisible story layer that shapes how you feel.",
  },
  {
    icon: Heart,
    title: "What emotion was triggered",
    desc: "Names the feeling so you can work with it instead of being overwhelmed.",
  },
  {
    icon: Layers,
    title: "Which thinking pattern is at play",
    desc: "Labels cognitive distortions like catastrophizing or mind-reading.",
  },
];

function ProductSection() {
  return (
    <section
      id="product"
      data-ocid="section.product"
      className="py-28 px-6 bg-background scroll-mt-16"
    >
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <SectionLabel>The Product</SectionLabel>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground text-balance leading-tight mb-4">
            Meet your thinking
            <br />
            clarity tool.
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed mb-14">
            Write a thought. ThoughtLens.ai breaks it into its components so you
            can finally see what&apos;s happening inside your mind.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {capabilities.map((cap, i) => (
            <FadeUp key={cap.title} delay={i * 0.08}>
              <div
                className="rounded-2xl p-7 border border-border h-full"
                style={{
                  background:
                    "linear-gradient(145deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.022 150) 100%)",
                  boxShadow: "0 2px 20px oklch(0.22 0.018 248 / 0.05)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "oklch(0.46 0.12 152 / 0.12)" }}
                >
                  <cap.icon
                    className="w-5 h-5"
                    style={{ color: "oklch(0.46 0.12 152)" }}
                  />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-lg lg:text-xl">
                  {cap.title}
                </h3>
                <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                  {cap.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp>
          <p className="text-muted-foreground text-base lg:text-lg leading-relaxed">
            Over time, ThoughtLens.ai detects your{" "}
            <strong className="text-foreground">recurring triggers</strong>,{" "}
            <strong className="text-foreground">thinking patterns</strong>, and
            possible <strong className="text-foreground">core beliefs</strong>.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
const analysisPhases = [
  {
    phase: "What happened",
    phaseColor: "oklch(0.50 0.10 220)",
    phaseBg: "oklch(0.93 0.03 220 / 0.5)",
    rows: [
      { label: "Situation", value: "Manager scheduled a meeting for tomorrow" },
      { label: "Fact", value: "No reason for the meeting was given" },
    ],
  },
  {
    phase: "Mind's interpretation",
    phaseColor: "oklch(0.52 0.15 30)",
    phaseBg: "oklch(0.92 0.06 30 / 0.35)",
    rows: [
      { label: "Story", value: "Something bad might happen" },
      {
        label: "Automatic thought",
        value: "I might be getting fired",
      },
      { label: "Emotion", value: "Anxiety, dread" },
      { label: "Thinking Pattern", value: "Fortune telling" },
    ],
  },
  {
    phase: "Path forward",
    phaseColor: "oklch(0.40 0.10 152)",
    phaseBg: "oklch(0.92 0.05 152 / 0.35)",
    rows: [
      {
        label: "Reflection",
        value: "Is it possible the meeting is about something routine?",
      },
      {
        label: "Balanced Thought",
        value: "A meeting request doesn't mean something bad will happen.",
        isHero: true,
      },
    ],
  },
];

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      data-ocid="section.how_it_works"
      className="py-28 px-6 scroll-mt-16"
      style={{ background: "oklch(0.945 0.008 88)" }}
    >
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <SectionLabel>How it works</SectionLabel>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground text-balance leading-tight mb-4">
            One thought.
            <br />
            <span className="italic" style={{ color: "oklch(0.46 0.12 152)" }}>
              Full clarity.
            </span>
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed mb-14">
            Write any thought. ThoughtLens.ai walks you through a structured
            analysis inspired by Cognitive Behavioral Therapy.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div
            data-ocid="how_it_works.card"
            className="rounded-3xl overflow-hidden"
            style={{
              background: "oklch(0.995 0.004 88)",
              boxShadow:
                "0 24px 72px oklch(0.22 0.018 248 / 0.12), 0 4px 16px oklch(0.22 0.018 248 / 0.06)",
              border: "1px solid oklch(0.88 0.015 88)",
            }}
          >
            {/* ── Card header: the raw thought ── */}
            <div
              className="px-8 py-6 border-b"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.975 0.012 88) 0%, oklch(0.958 0.020 150) 100%)",
                borderColor: "oklch(0.88 0.015 88)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "oklch(0.46 0.12 152 / 0.14)" }}
                >
                  <Brain
                    className="w-4 h-4"
                    style={{ color: "oklch(0.46 0.12 152)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: "oklch(0.55 0.05 248)" }}
                  >
                    Your thought
                  </p>
                  <p className="text-foreground text-[15px] lg:text-base leading-relaxed font-medium">
                    &ldquo;My manager said &lsquo;let&rsquo;s talk tomorrow&rsquo;. I feel like I&apos;m about to be fired.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* ── Phased analysis ── */}
            <div className="px-8 py-7 space-y-7">
              {analysisPhases.map((phase, pi) => (
                <motion.div
                  key={phase.phase}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: 0.15 + pi * 0.15,
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                >
                  {/* Phase label */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="h-px flex-1 rounded-full"
                      style={{ background: `${phase.phaseColor} / 0.2` }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: phase.phaseColor }}
                    >
                      {phase.phase}
                    </span>
                    <div
                      className="h-px flex-1 rounded-full"
                      style={{ background: `${phase.phaseColor} / 0.2` }}
                    />
                  </div>

                  {/* Rows */}
                  <div className="space-y-2">
                    {phase.rows.map((row, ri) => (
                      <motion.div
                        key={row.label}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          delay: 0.2 + pi * 0.15 + ri * 0.07,
                          duration: 0.4,
                          ease: "easeOut",
                        }}
                        className="flex items-start gap-4 rounded-xl px-4 py-3.5 border-l-2"
                        style={{
                          background: phase.phaseBg,
                          borderLeftColor: phase.phaseColor,
                        }}
                      >
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider w-32 flex-shrink-0 pt-0.5"
                          style={{ color: phase.phaseColor }}
                        >
                          {row.label}
                        </span>
                        <span
                          className={`text-sm lg:text-base leading-relaxed ${
                            "isHero" in row && row.isHero
                              ? "font-semibold text-foreground"
                              : "text-foreground/80"
                          }`}
                        >
                          {row.value}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Footer bar ── */}
            <div
              className="px-8 py-4 border-t flex items-center gap-2.5"
              style={{
                background: "oklch(0.46 0.12 152 / 0.07)",
                borderColor: "oklch(0.46 0.12 152 / 0.18)",
              }}
            >
              <CheckCircle2
                className="w-3.5 h-3.5"
                style={{ color: "oklch(0.46 0.12 152)" }}
              />
              <p
                className="text-xs font-medium"
                style={{ color: "oklch(0.40 0.10 152)" }}
              >
                Analyzed with ThoughtLens.ai · CBT-inspired framework
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── What Makes It Different ───────────────────────────────────────────────────
function DifferentSection() {
  return (
    <section
      id="different"
      data-ocid="section.different"
      className="py-28 px-6 bg-background scroll-mt-16"
    >
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <SectionLabel>What makes it different</SectionLabel>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground text-balance leading-tight mb-14">
            Not another
            <br />
            meditation app.
          </h2>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {/* Most apps */}
          <FadeUp delay={0}>
            <div
              className="rounded-2xl p-8 border border-border h-full"
              style={{ background: "oklch(0.945 0.008 88)" }}
            >
              <div className="flex items-center gap-3 mb-7">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.88 0.02 248 / 0.5)" }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-muted-foreground">
                  Most apps
                </h3>
              </div>
              <ul className="space-y-3.5">
                {[
                  "Guided meditation sessions",
                  "Mood tracking & journaling",
                  "Chatbot conversations",
                  "Breathing exercises",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm lg:text-base text-muted-foreground"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>

        {/* ThoughtLens.ai */}
          <FadeUp delay={0.1}>
            <div
              className="rounded-2xl p-8 border h-full"
              style={{
                background:
                  "linear-gradient(145deg, oklch(0.995 0.004 88) 0%, oklch(0.960 0.040 150) 100%)",
                borderColor: "oklch(0.46 0.12 152 / 0.28)",
                boxShadow: "0 4px 28px oklch(0.46 0.12 152 / 0.09)",
              }}
            >
              <div className="flex items-center gap-3 mb-7">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.46 0.12 152 / 0.15)" }}
                >
                  <CheckCircle2
                    className="w-4 h-4"
                    style={{ color: "oklch(0.46 0.12 152)" }}
                  />
                </div>
          <h3 className="font-semibold text-foreground">ThoughtLens.ai</h3>
              </div>
              <ul className="space-y-3.5">
                {[
                  "Thinking structure & analysis",
                  "Pattern detection over time",
                  "Core belief discovery",
                  "CBT-inspired framework",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm lg:text-base text-foreground font-medium"
                  >
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "oklch(0.46 0.12 152)" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        </div>

        {/* Insight chain */}
        <FadeUp delay={0.2}>
          <div
            className="rounded-2xl p-8 border border-border"
            style={{
              background: "oklch(0.975 0.010 88)",
              boxShadow: "0 2px 16px oklch(0.22 0.018 248 / 0.04)",
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-6">
              The insight chain
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {["Thought", "Pattern", "Trigger", "Belief"].map(
                (step, i, arr) => (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className="rounded-full px-5 py-2.5 text-sm font-semibold"
                      style={{
                        background: `oklch(${0.92 - i * 0.015} ${0.04 + i * 0.01} 152)`,
                        color: "oklch(0.32 0.10 152)",
                      }}
                    >
                      {step}
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight
                        className="w-3.5 h-3.5"
                        style={{ color: "oklch(0.46 0.12 152 / 0.5)" }}
                      />
                    )}
                  </div>
                ),
              )}
            </div>
            <p
              className="text-sm lg:text-lg mt-6 leading-relaxed"
              style={{ color: "oklch(0.48 0.04 248)" }}
            >
              We don&apos;t replace therapy. We give you{" "}
              <strong className="text-foreground font-semibold">clarity</strong>
              .
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Long-Term Vision ──────────────────────────────────────────────────────────
const visionPills = [
  { label: "Thinking Pattern Reports", icon: TrendingUp },
  { label: "Emotional Trigger Detection", icon: Sparkles },
  { label: "Belief Discovery", icon: Layers },
  { label: "Personal Thinking Profile", icon: User },
];

function VisionSection() {
  return (
    <section
      id="vision"
      data-ocid="section.vision"
      className="py-28 px-6 scroll-mt-16"
      style={{ background: "oklch(0.945 0.008 88)" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <FadeUp>
              <SectionLabel>Long-term vision</SectionLabel>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground text-balance leading-tight mb-6">
                Your personal
                <br />
                <span
                  className="italic"
                  style={{ color: "oklch(0.46 0.12 152)" }}
                >
                  thinking
                </span>{" "}
                profile.
              </h2>
              <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
                ThoughtLens.ai is evolving into a full cognitive insight platform.
                Over time, it builds a deep understanding of how your unique
                mind works — your patterns, triggers, and the beliefs that shape
                your experience.
              </p>
            </FadeUp>
          </div>

          <div className="space-y-3.5">
            {visionPills.map(({ label, icon: Icon }, i) => (
              <FadeUp key={label} delay={i * 0.09}>
                <div
                  className="rounded-2xl px-6 py-5 border border-border flex items-center gap-4"
                  style={{
                    background: "oklch(0.995 0.004 88)",
                    boxShadow: "0 2px 14px oklch(0.22 0.018 248 / 0.05)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.46 0.12 152 / 0.12)" }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: "oklch(0.46 0.12 152)" }}
                    />
                  </div>
                  <span className="text-sm lg:text-base font-semibold text-foreground">
                    {label}
                  </span>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Waitlist CTA ─────────────────────────────────────────────────────────────
function WaitlistSection() {
  return (
    <section
      id="waitlist"
      data-ocid="section.waitlist"
      className="py-32 px-6 relative overflow-hidden bg-background scroll-mt-16"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.82 0.09 150 / 0.28) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-xl mx-auto text-center">
        <FadeUp>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground text-balance leading-tight mb-5">
            Open the Thought Work tool
          </h2>
          <p className="text-lg text-muted-foreground mb-11">
            Jump into the reflection process directly — no waitlist, just the guided clarity experience built for you.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <Link
            href="/tool"
            className="inline-flex items-center justify-center rounded-full bg-primary px-10 py-3 text-base font-semibold uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90"
            style={{
              boxShadow: "0 10px 30px oklch(0.46 0.12 152 / 0.25)",
            }}
          >
            Launch the tool
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-display text-lg font-semibold text-foreground">
          ThoughtLens.ai
        </span>
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
          <span>&copy; {year} ThoughtLens.ai</span>
          <span className="hidden sm:inline opacity-30">&middot;</span>
         
        </div>
      </div>
    </footer>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <ProductSection />
        <HowItWorksSection />
        <DifferentSection />
        <VisionSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
}

"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const fallbackSuggestionChips = [
  "Maybe I'm overthinking this",
  "I'm worried something went wrong",
  "I'm unsure what this means",
  "I keep thinking about this situation"
];

const exampleThoughts = [
  "Maybe I messed something up.",
  "They probably think I did something wrong.",
  "Maybe they're upset with me.",
  "I'm not good enough for this.",
  "Everyone else probably did better.",
  "Maybe I said something wrong."
];

function getRandomExample() {
  return exampleThoughts[
    Math.floor(Math.random() * exampleThoughts.length)
  ];
}

type ThoughtAnalysisResult = {
  situation: string;
  fact: string;
  story: string;
  emotion: string;
  pattern: string;
  patternExplanation: string;
  automaticThought: string;
  coreBelief: string;
  normalization: string;
  trigger: string;
  reflectionQuestion: string;
  balancedThought: string;
  context?: string[];
  suggestions: string[];
};

type ThreadInsight = {
  dominantPattern: string | null;
  dominantPatternCount: number;
  dominantEmotion: string | null;
  dominantEmotionCount: number;
  dominantBelief: string | null;
  dominantBeliefCount: number;
  thoughtCount: number;
};

type ComputedThreadInsights = {
  dominantPattern: string | null;
  dominantPatternCount: number;
  dominantEmotion: string | null;
  dominantEmotionCount: number;
  dominantBelief: string | null;
  dominantBeliefCount: number;
  balancedPerspective: string | null;
  coreBelief: string;
  coreBeliefConfidence: number;
};

const patternToInsight = (pattern: string) => {
  const normalized = pattern.toLowerCase();
  if (normalized.includes("fortune")) {
    return "Your mind often predicts negative outcomes.";
  }
  if (normalized.includes("mind reading")) {
    return "Your mind seems to assume what others might be thinking.";
  }
  if (normalized.includes("catastroph")) {
    return "Your mind tends to jump to the worst possible outcome.";
  }
  if (normalized.includes("self") && normalized.includes("criticism")) {
    return "Your mind is being quite hard on you.";
  }
  if (normalized.includes("overgeneral")) {
    return "Your mind draws broad conclusions from one event.";
  }
  return "Your mind keeps returning to similar worries.";
};

const getBalancedPerspective = (pattern: string | null) => {
  if (!pattern) return null;
  const normalized = pattern.toLowerCase();
  if (normalized.includes("fortune")) {
    return "The outcome is still uncertain. Not hearing back yet doesn't mean the worst happened.";
  }
  if (normalized.includes("mind reading")) {
    return "We cannot know what others are thinking without clear evidence.";
  }
  if (normalized.includes("self") && normalized.includes("criticism")) {
    return "One difficult moment does not define your abilities.";
  }
  return null;
};

const CORE_BELIEF_MAP: Record<string, string> = {
  "self criticism": "I am not good enough",
  "comparison thinking": "Others are better than me",
  "fortune telling": "I might fail",
  "mind reading": "People will judge me",
  "catastrophizing": "Things will go badly",
};

const inferCoreBelief = (
  thoughts: { thought: string; analysis: ThoughtAnalysisResult }[],
): { belief: string; confidence: number } => {
  const recent = thoughts.slice(-8);
  const patternCounts: Record<string, number> = {};

  recent.forEach((entry) => {
    const normalized = entry.analysis.pattern?.trim().toLowerCase();
    if (!normalized || normalized === "none identified yet") return;
    patternCounts[normalized] = (patternCounts[normalized] || 0) + 1;
  });

  const sorted = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]);
  const [dominantPattern, count] = sorted[0] || [null, 0];
  if (dominantPattern && count >= 3) {
    const matchedKey = Object.keys(CORE_BELIEF_MAP).find((key) =>
      dominantPattern.includes(key),
    );
    if (matchedKey) {
      return { belief: CORE_BELIEF_MAP[matchedKey], confidence: 0.7 };
    }
  }

  return { belief: "not clear yet", confidence: 0 };
};

const computeThreadInsights = (
  thoughts: { thought: string; analysis: ThoughtAnalysisResult }[],
): ComputedThreadInsights => {
  const patternCounts: Record<string, { key: string; count: number }> = {};
  const emotionCounts: Record<string, number> = {};
  const beliefCounts: Record<string, number> = {};

  thoughts.forEach((entry) => {
    const pattern = entry.analysis.pattern?.trim();
    if (pattern && pattern.toLowerCase() !== "none identified yet") {
      const normalized = pattern.toLowerCase();
      if (!patternCounts[normalized]) {
        patternCounts[normalized] = { key: pattern, count: 0 };
      }
      patternCounts[normalized].count += 1;
    }
    const emotion = entry.analysis.emotion?.trim();
    if (emotion) {
      emotionCounts[emotion] = (emotionCounts[emotion] ?? 0) + 1;
    }
    const belief = entry.analysis.coreBelief?.trim();
    if (belief && belief.toLowerCase() !== "not clear yet") {
      beliefCounts[belief] = (beliefCounts[belief] ?? 0) + 1;
    }
  });

  const selectDominant = <T extends { count: number }>(
    source: Record<string, T>,
  ): [string | null, number] => {
    const entries = Object.values(source);
    if (!entries.length) return [null, 0];
    const winner = entries.reduce((prev, current) =>
      current.count > prev.count ? current : prev,
    );
    return ["key" in winner ? (winner as any).key : null, winner.count];
  };

    const [dominantPattern, dominantPatternCount] = selectDominant(patternCounts);
    const [dominantEmotion, dominantEmotionCount] = selectDominant(
      Object.fromEntries(
        Object.entries(emotionCounts).map(([key, count]) => [key, { key, count }]),
      ),
    );
    const [dominantBelief, dominantBeliefCount] = selectDominant(
      Object.fromEntries(
        Object.entries(beliefCounts).map(([key, count]) => [key, { key, count }]),
      ),
    );

    const coreBelief = inferCoreBelief(thoughts);

    return {
      dominantPattern,
      dominantPatternCount,
      dominantEmotion,
      dominantEmotionCount,
      dominantBelief,
      dominantBeliefCount,
      balancedPerspective: getBalancedPerspective(dominantPattern),
      coreBelief: coreBelief.belief,
      coreBeliefConfidence: coreBelief.confidence,
    };
};

type ClarificationState = {
  message: string;
  questions: string[];
};

const createUUID = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

// ── Design helpers ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </p>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const, delay },
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
      animate="visible"
      custom={delay}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Analysis card configs ─────────────────────────────────────────────────────
type AnalysisCardConfig = {
  key: keyof ThoughtAnalysisResult;
  label: string;
  bg: string;
  border: string;
  dot: string;
  patternKey?: keyof ThoughtAnalysisResult;
};

const analysisCards: AnalysisCardConfig[] = [
  {
    key: "situation" as const,
    label: "What happened",
    bg: "oklch(0.93 0.03 220 / 0.5)",
    border: "oklch(0.50 0.10 220 / 0.3)",
    dot: "oklch(0.50 0.10 220)",
  },
  {
    key: "story" as const,
    label: "What your mind concluded",
    bg: "oklch(0.92 0.06 30 / 0.35)",
    border: "oklch(0.52 0.15 30 / 0.3)",
    dot: "oklch(0.52 0.15 30)",
  },
  {
    key: "emotion" as const,
    label: "How this might be making you feel",
    bg: "oklch(0.92 0.05 300 / 0.25)",
    border: "oklch(0.55 0.1 300 / 0.3)",
    dot: "oklch(0.55 0.1 300)",
  },
  {
    key: "patternExplanation" as const,
    label: "What your mind might be doing",
    patternKey: "pattern" as const,
    bg: "oklch(0.92 0.06 20 / 0.3)",
    border: "oklch(0.52 0.15 20 / 0.3)",
    dot: "oklch(0.52 0.15 20)",
  },
  {
    key: "balancedThought" as const,
    label: "A more balanced way to look at this",
    bg: "oklch(0.92 0.05 152 / 0.35)",
    border: "oklch(0.46 0.12 152 / 0.3)",
    dot: "oklch(0.46 0.12 152)",
  },
];

// ── ThoughtPage ───────────────────────────────────────────────────────────────
export default function Page() {
  const [thought, setThought] = useState("");
  const [analysis, setAnalysis] = useState<ThoughtAnalysisResult | null>(null);
  const [clarification, setClarification] = useState<ClarificationState | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [contextReady, setContextReady] = useState(false);
  const [step, setStep] = useState(0);
  const [thoughtHistory, setThoughtHistory] = useState<
    { thought: string; analysis: ThoughtAnalysisResult }[]
  >([]);
  const [suggestionOverride, setSuggestionOverride] = useState<string | undefined>(
    undefined,
  );
  const [exampleThought, setExampleThought] = useState("");
  const visitorIdRef = useRef("");
  const sessionIdRef = useRef("");
  const threadIdRef = useRef("");

  const computedThreadInsights = useMemo(() => {
    return computeThreadInsights(thoughtHistory);
  }, [thoughtHistory]);
  const {
    dominantPattern: computedPattern,
    dominantEmotion: computedEmotion,
    dominantBelief: computedBelief,
    balancedPerspective,
    coreBelief,
    coreBeliefConfidence,
  } = computedThreadInsights;

  const initializeContext = () => {
    if (typeof window === "undefined") return false;
    let storedVisitor = window.localStorage.getItem("thoughtlens_visitor_id");
    if (!storedVisitor) {
      storedVisitor = createUUID();
      window.localStorage.setItem("thoughtlens_visitor_id", storedVisitor);
    }
    visitorIdRef.current = storedVisitor;
    sessionIdRef.current = sessionIdRef.current || createUUID();
    threadIdRef.current = threadIdRef.current || createUUID();
    return true;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: initializeContext is stable
  useEffect(() => {
    if (initializeContext()) setContextReady(true);
  }, []);

  useEffect(() => {
    setExampleThought(getRandomExample());
  }, []);

  useEffect(() => {
    if (!analysis) {
      setStep(0);
      return;
    }
    setStep(1);
    const timers = [
      setTimeout(() => setStep(2), 300),
      setTimeout(() => setStep(3), 600),
      setTimeout(() => setStep(4), 900),
      setTimeout(() => setStep(5), 1200),
      setTimeout(() => setStep(6), 1500),
    ] as ReturnType<typeof setTimeout>[];
    return () => timers.forEach(clearTimeout);
  }, [analysis]);

  const handleSuggestionClick = (suggestion: string) => {
    setThought(suggestion);
    setHint("");
    setSuggestionOverride(suggestion);
  };

  const handleClarificationQuestion = (question: string) => {
    setClarification(null);
    processThought(question);
  };

  const startNewThoughtThread = () => {
    threadIdRef.current = createUUID();
    setAnalysis(null);
    setHint("");
    setClarification(null);
    setThought("");
    setStep(0);
    setThoughtHistory([]);
    setSuggestionOverride(undefined);
  };

  const processThought = async (overrideText?: string) => {
    const message = overrideText ?? thought;
    setThought(message);
    const trimmedThought = message.trim();
    const words = trimmedThought.split(/\s+/).filter(Boolean);

    if (!initializeContext()) {
      setHint("Hold on a second, we're setting up your session context.");
      return;
    }
    if (!contextReady) setContextReady(true);
    if (!overrideText && words.length < 6) {
      setHint(
        "Try describing what happened and the thought your mind jumped to.",
      );
      return;
    }

    setHint("");
    setClarification(null);
    setLoading(true);

    try {
      const res = await fetch("/api/process-thought", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thought: message,
          visitorId: visitorIdRef.current,
          sessionId: sessionIdRef.current,
          threadId: threadIdRef.current,
          threadTitle: message.slice(0, 80),
        }),
      });

      const data = await res.json();

      if (data.type === "clarification") {
        setClarification({
          message: data.message,
          questions: data.questions ?? [],
        });
        setLoading(false);
        return;
      }

      if (!data.valid) {
        setHint(data.message || "We couldn't understand that clearly.");
        setLoading(false);
        return;
      }

      if (data.type === "clarification") {
        setClarification({
          message: data.message,
          questions: data.questions ?? [],
        });
        return;
      }

      const typedResult: ThoughtAnalysisResult = {
        situation: String(data.situation || ""),
        fact: String(data.fact || ""),
        story: String(data.story || ""),
        emotion: String(data.emotion || ""),
        pattern: String(data.pattern || ""),
        patternExplanation: String(data.patternExplanation || ""),
        automaticThought: String(data.automaticThought || ""),
        coreBelief: String(data.coreBelief || ""),
        normalization: String(data.normalization || ""),
        trigger: String(data.trigger || ""),
        balancedThought: String(data.balancedThought || ""),
        reflectionQuestion: String(data.reflectionQuestion || ""),
        suggestions: Array.isArray(data.suggestions)
          ? data.suggestions
              .map((item: unknown) => String(item))
              .filter(Boolean)
          : [],
        context: Array.isArray(data.context)
          ? data.context.map((item: unknown) => String(item))
          : [],
      };

      setAnalysis(typedResult);
      setThoughtHistory((prev) => [
        ...prev,
        {
          thought: message,
          analysis: typedResult,
        },
      ]);
      setThought("");
    } catch (error) {
      console.error(error);
      setHint("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setSuggestionOverride(undefined);
    }
  };

  const renderTimelineEntry = (
    entry: { thought: string; analysis: ThoughtAnalysisResult },
    entryStep: number,
    index: number,
  ) => (
    <Fragment key={`entry-${index}-${entry.thought}`}>
      {entryStep >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-start gap-4 mb-8"
        >
          <div className="mt-2 flex-shrink-0">
            <span
              className="block h-3 w-3 rounded-full"
              style={{ background: "oklch(0.46 0.12 152)" }}
            />
          </div>
          <div
            className="flex-1 rounded-2xl p-6"
            style={{
              background:
                "linear-gradient(150deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.020 150) 100%)",
              border: "1px solid oklch(0.88 0.025 150 / 0.5)",
              boxShadow: "0 4px 20px oklch(0.22 0.018 248 / 0.06)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "oklch(0.52 0.018 248)" }}
            >
              Your thought
            </p>
            <p className="text-base font-semibold leading-relaxed text-foreground">
              &ldquo;{entry.thought}&rdquo;
            </p>
          </div>
        </motion.div>
      )}

      {analysisCards.map((card, idx) => {
        const stepNum = idx + 2;
        if (entryStep < stepNum) return null;
        const value = entry.analysis[card.key];
        const patternKey = card.patternKey;
        return (
          <motion.div
            key={`${card.key}-${index}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-start gap-4 mb-8"
          >
            <div className="mt-2 flex-shrink-0">
              <span
                className="block h-3 w-3 rounded-full"
                style={{ background: card.dot }}
              />
            </div>
            <div
              className="flex-1 rounded-2xl p-6"
              style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                boxShadow: "0 4px 20px oklch(0.22 0.018 248 / 0.04)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: card.dot }}
              >
                {card.label}
              </p>
              {patternKey && entry.analysis[patternKey] && (
                <span
                  className="inline-block rounded-full px-3 py-1 text-xs font-semibold mb-3"
                  style={{
                    background: "oklch(0.46 0.12 152 / 0.15)",
                    color: "oklch(0.32 0.10 152)",
                  }}
                >
                  {entry.analysis[patternKey]}
                </span>
              )}
              <p className="text-base leading-relaxed text-foreground">
                {value}
              </p>
            </div>
          </motion.div>
        );
      })}
    </Fragment>
  );

  const suggestionOptions =
    analysis?.suggestions && analysis.suggestions.length
      ? analysis.suggestions
      : fallbackSuggestionChips;
  const placeholderExample = exampleThought || exampleThoughts[0];

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.977 0.008 88)" }}
    >
      {/* ── Sticky top nav ── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b border-border"
        style={{ background: "oklch(0.977 0.008 88 / 0.92)" }}
      >
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-center">
          <span className="font-display text-xl font-semibold text-foreground tracking-tight">
            ThoughtLens
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 flex flex-col gap-12">
        {/* ── Page header ── */}
        <FadeUp>
          <header className="text-center space-y-4">
            <h1 className="font-display text-5xl md:text-6xl font-semibold text-foreground text-balance leading-tight">
              See the patterns in your
              <br />
              <span
                className="italic"
                style={{ color: "oklch(0.46 0.12 152)" }}
              >
                thinking
              </span>
            </h1>
          </header>
        </FadeUp>

        {/* ── Input section (before analysis) ── */}
        {!analysis && !clarification && !loading && (
          <FadeUp delay={0.1}>
            <section
              className="rounded-3xl p-8 space-y-6"
              style={{
                background:
                  "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.025 150) 100%)",
                boxShadow:
                  "0 24px 64px oklch(0.22 0.018 248 / 0.12), 0 4px 16px oklch(0.22 0.018 248 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.7)",
                border: "1px solid oklch(0.88 0.025 150 / 0.5)",
              }}
            >
              <div>
                <SectionLabel>Start with one thought</SectionLabel>
                <textarea
                  data-ocid="thought_page.textarea"
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder={`What thought went through your mind? Example: "${placeholderExample}"`}
                  className="h-36 w-full rounded-2xl p-5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none"
                  style={{
                    background: "oklch(0.995 0.004 88 / 0.8)",
                    border: "1px solid oklch(0.88 0.015 88)",
                  }}
                />
              </div>

              {hint && (
                <p
                  data-ocid="thought_page.error_state"
                  className="text-sm"
                  style={{ color: "oklch(0.55 0.22 29)" }}
                >
                  {hint}
                </p>
              )}

              <Button
                data-ocid="thought_page.submit_button"
                onClick={() => processThought()}
                className="w-full rounded-full h-12 text-base font-semibold"
                style={{
                  boxShadow: "0 4px 20px oklch(0.46 0.12 152 / 0.30)",
                }}
              >
                Analyze my thought
              </Button>
            </section>
          </FadeUp>
        )}

        {/* ── Loading state ── */}
        {loading && !analysis && (
          <FadeUp>
            <section
              data-ocid="thought_page.loading_state"
              className="rounded-3xl p-10 text-center"
              style={{
                background:
                  "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.025 150) 100%)",
                boxShadow: "0 24px 64px oklch(0.22 0.018 248 / 0.10)",
                border: "1px solid oklch(0.88 0.025 150 / 0.5)",
              }}
            >
              <SectionLabel>Analyzing</SectionLabel>
              <div className="flex items-center justify-center gap-3 mt-4">
                <span
                  className="h-2.5 w-2.5 rounded-full animate-pulse"
                  style={{ background: "oklch(0.46 0.12 152)" }}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full animate-pulse"
                  style={{
                    background: "oklch(0.46 0.12 152)",
                    animationDelay: "150ms",
                  }}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full animate-pulse"
                  style={{
                    background: "oklch(0.46 0.12 152)",
                    animationDelay: "300ms",
                  }}
                />
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                We are working through your thought right now.
              </p>
            </section>
          </FadeUp>
        )}

        {/* ── Clarification ── */}
        {clarification && (
          <FadeUp>
            <section
              className="rounded-3xl p-8 space-y-5"
              style={{
                background:
                  "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.025 150) 100%)",
                boxShadow: "0 24px 64px oklch(0.22 0.018 248 / 0.10)",
                border: "1px solid oklch(0.46 0.12 152 / 0.35)",
              }}
            >
              <p className="text-lg font-semibold text-foreground">
                {clarification.message}
              </p>
              <div className="flex flex-wrap gap-2">
                {clarification.questions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => handleClarificationQuestion(question)}
                    className="rounded-full px-4 py-2 text-sm transition-colors"
                    style={{
                      background: "oklch(0.93 0.025 150 / 0.5)",
                      border: "1px solid oklch(0.80 0.04 150 / 0.5)",
                      color: "oklch(0.38 0.08 152)",
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </section>
          </FadeUp>
        )}

        {/* ── Analysis timeline ── */}
        {thoughtHistory.length > 0 && (
          <section className="space-y-10">
            <div className="relative pl-8">
              <div
                className="absolute left-3 top-0 bottom-0 w-px"
                style={{ background: "oklch(0.88 0.015 88)" }}
              />

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <div className="flex items-start gap-4 mb-8">
                    <div className="mt-2">
                      <span className="block h-3 w-3 rounded-full border border-primary bg-transparent" />
                    </div>
                    <div className="flex-1 rounded-[24px] border border-border/70 bg-background/70 p-5 shadow-soft">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Analyzing your thought…
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary delay-150" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary delay-300" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {thoughtHistory.map((entry, idx) => {
                const isLatest = idx === thoughtHistory.length - 1;
                if (!isLatest) return null;

                return renderTimelineEntry(entry, step, idx);
              })}

              {thoughtHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex items-start gap-4 mb-8"
                >
                  <div className="mt-2 flex-shrink-0">
                    <span
                      className="block h-3 w-3 rounded-full"
                      style={{ background: "oklch(0.46 0.12 152)" }}
                    />
                  </div>
                <Card
                  className="flex-1 space-y-6 w-full max-w-full sm:max-w-2xl"
                  style={{
                    background:
                      "linear-gradient(160deg, oklch(0.96 0.04 90) 0%, oklch(0.93 0.06 150) 100%)",
                    borderColor: "oklch(0.88 0.07 150 / 0.6)",
                    boxShadow: "0 15px 45px oklch(0.22 0.02 248 / 0.15)",
                  }}
                >
                  <div className="space-y-6">
                    <p className="text-2xl md:text-3xl font-semibold mb-6 text-foreground">
                      What we're noticing in your thinking
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <span>🧠</span>
                        Thinking pattern
                      </p>
                      <p className="text-lg leading-relaxed font-medium text-foreground">
                        {computedPattern
                          ? patternToInsight(computedPattern)
                          : "We are still watching how your thoughts unfold."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <span>❤️</span>
                        Emotion that appears most often
                      </p>
                      <p className="text-lg font-medium text-foreground">
                        {computedEmotion ?? "Still tracking the feeling"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <span>🌱</span>
                        Possible deeper belief
                      </p>
                      <p className="text-lg font-medium text-foreground">
                        {coreBeliefConfidence >= 0.6 && coreBelief
                          ? coreBelief
                          : "Not clear yet"}
                      </p>
                    </div>
                  </div>
                  {Boolean(balancedPerspective || analysis?.balancedThought) && (
                    <div className="rounded-xl bg-muted/40 p-5 mt-6">
                      <p className="text-sm text-muted-foreground mb-2">
                        A more balanced perspective
                      </p>
                      <p className="text-lg font-medium leading-relaxed text-foreground">
                        {balancedPerspective || analysis?.balancedThought}
                      </p>
                    </div>
                  )}
                </Card>
                </motion.div>
              )}

              <div className="flex items-start gap-4">
                <div className="mt-2">
                  <span
                    className="block h-3 w-3 rounded-full border-2"
                    style={{
                      borderColor: "oklch(0.46 0.12 152)",
                      background: "oklch(0.977 0.008 88)",
                    }}
                  />
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="flex-1 rounded-2xl p-6 space-y-5"
                  style={{
                    background:
                      "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.025 150) 100%)",
                    border: "1px solid oklch(0.88 0.025 150 / 0.5)",
                    boxShadow: "0 8px 32px oklch(0.22 0.018 248 / 0.07)",
                  }}
                >
                  <div>
                    <SectionLabel>What thought came next?</SectionLabel>
                    <textarea
                      data-ocid="thought_page.next_thought.textarea"
                      value={thought}
                      onChange={(e) => {
                        setThought(e.target.value);
                        setSuggestionOverride(undefined);
                      }}
                      placeholder="Share the next thought in this situation…"
                      className="mt-2 h-32 w-full rounded-xl p-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none"
                      style={{
                        background: "oklch(0.995 0.004 88 / 0.8)",
                        border: "1px solid oklch(0.88 0.015 88)",
                      }}
                    />
                  </div>

                  {hint && (
                    <p className="text-sm" style={{ color: "oklch(0.55 0.22 29)" }}>
                      {hint}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {suggestionOptions.map((chip, idx) => (
                      <button
                        key={`${chip}-${idx}`}
                        type="button"
                        data-ocid={`thought_page.suggestion.button.${idx + 1}`}
                        onClick={() => handleSuggestionClick(chip)}
                        className="rounded-full px-4 py-2 text-sm transition-colors"
                        style={{
                          background: "oklch(0.93 0.025 150 / 0.5)",
                          border: "1px solid oklch(0.80 0.04 150 / 0.5)",
                          color: "oklch(0.38 0.08 152)",
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <Button
                    data-ocid="thought_page.next_thought.submit_button"
                    onClick={() => processThought(suggestionOverride)}
                    disabled={loading || thought.trim().length < 6}
                    className="w-full rounded-full h-11 text-base font-semibold"
                    style={{
                      boxShadow: "0 4px 20px oklch(0.46 0.12 152 / 0.25)",
                    }}
                  >
                    {loading ? "Analyzing…" : "Add this thought"}
                  </Button>

                  <button
                    type="button"
                    data-ocid="thought_page.new_thread_button"
                    onClick={startNewThoughtThread}
                    className="w-full text-sm font-semibold transition-colors"
                    style={{ color: "oklch(0.46 0.12 152)" }}
                  >
                    Start a new thought
                  </button>
                </motion.div>
              </div>
            </div>
          </section>
        )}
      </main>

    </div>
  );
}

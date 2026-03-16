"use client"
import ThoughtTimeline from "@/components/reflection/ThoughtTimeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { validateSimpleInput } from "@/lib/simpleValidation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

const placeholderExamples = [
  "It's been 3 days since my interview — maybe I wasn't selected",
  "They haven't replied to my message — maybe they're upset with me",
  "They saw my text but didn't respond — maybe they're losing interest",
  "I said something awkward earlier — now they probably think I'm weird",
  "Everyone else seems more confident than me",
  "Maybe I'm just not good enough for this",
  "My parents sounded disappointed — maybe I let them down",
  "What if this headache means something serious",
  "What if I fail again like last time",
  "Maybe people only tolerate me, they don't actually like me",
];

type ThoughtAnalysisResult = {
  situation: string;
  story: string;
  emotion: string;
  emotions: string[];
  pattern: string;
  patternExplanation: string;
  automaticThought: string;
  coreBelief: string;
  normalization: string;
  trigger: string;
  reflectionQuestion: string;
  balancedThought: string;
  thought?: string | null;
  context?: string[];
  suggestions: string[];
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

type ThoughtHistoryEntry = {
  thought: string;
  analysis: ThoughtAnalysisResult;
  createdAt: string;
};

const patternToInsight = (pattern: string) => {
  const normalized = pattern.toLowerCase();
  if (normalized.includes("fortune"))
    return "Your mind often predicts negative outcomes.";
  if (normalized.includes("mind reading"))
    return "Your mind seems to assume what others might be thinking.";
  if (normalized.includes("catastroph"))
    return "Your mind tends to jump to the worst possible outcome.";
  if (normalized.includes("self") && normalized.includes("criticism"))
    return "Your mind is being quite hard on you.";
  if (normalized.includes("overgeneral"))
    return "Your mind draws broad conclusions from one event.";
  return "Your mind keeps returning to similar worries.";
};

const getBalancedPerspective = (pattern: string | null) => {
  if (!pattern) return null;
  const normalized = pattern.toLowerCase();
  if (normalized.includes("fortune"))
    return "The outcome is still uncertain. Not hearing back yet doesn't mean the worst happened.";
  if (normalized.includes("mind reading"))
    return "We cannot know what others are thinking without clear evidence.";
  if (normalized.includes("self") && normalized.includes("criticism"))
    return "One difficult moment does not define your abilities.";
  return null;
};

const INSIGHT_CARD_STYLES: Record<
  string,
  { bg: string; border: string; dot: string }
> = {
  fact: {
    bg: "oklch(0.93 0.03 220 / 0.5)",
    border: "oklch(0.50 0.10 220 / 0.3)",
    dot: "oklch(0.50 0.10 220)",
  },
  story: {
    bg: "oklch(0.92 0.06 30 / 0.35)",
    border: "oklch(0.52 0.15 30 / 0.3)",
    dot: "oklch(0.52 0.15 30)",
  },
  emotion: {
    bg: "oklch(0.92 0.05 300 / 0.25)",
    border: "oklch(0.55 0.1 300 / 0.3)",
    dot: "oklch(0.55 0.1 300)",
  },
  pattern: {
    bg: "oklch(0.92 0.06 20 / 0.3)",
    border: "oklch(0.52 0.15 20 / 0.3)",
    dot: "oklch(0.52 0.15 20)",
  },
  balanced: {
    bg: "oklch(0.92 0.05 152 / 0.35)",
    border: "oklch(0.46 0.12 152 / 0.3)",
    dot: "oklch(0.46 0.12 152)",
  },
};

type AnalysisCard = {
  key: string;
  title: string;
  value: string;
  style: { bg: string; border: string; dot: string };
};

const buildAnalysisCards = (
  analysis: ThoughtAnalysisResult,
  options?: { includeSituation?: boolean },
): AnalysisCard[] => {
  const includeSituation = options?.includeSituation ?? true;
  const patternValue =
    analysis.patternExplanation?.trim() ||
    (analysis.pattern ? patternToInsight(analysis.pattern) : "") ||
    "";
  return [
    includeSituation
      ? {
          key: "fact",
          title: "What actually happened",
          value: analysis.situation ?? "",
          style: INSIGHT_CARD_STYLES.fact,
        }
      : null,
    {
      key: "story",
      title: "What I assumed it meant",
      value: analysis.story ?? "",
      style: INSIGHT_CARD_STYLES.story,
    },
    {
      key: "emotion",
      title: "How this made me feel",
      value: analysis.emotion ?? "",
      style: INSIGHT_CARD_STYLES.emotion,
    },
    {
      key: "pattern",
      title: "A thinking pattern that might be happening",
      value: patternValue,
      style: INSIGHT_CARD_STYLES.pattern,
    },
    {
      key: "balanced",
      title: "A more balanced way to see this",
      value: analysis.balancedThought ?? "",
      style: INSIGHT_CARD_STYLES.balanced,
    },
  ].filter((card): card is AnalysisCard => card !== null);
};

type InsightCardProps = {
  title: string;
  value: string;
  style: { bg: string; border: string; dot: string };
};

function InsightCard({ title, value, style }: InsightCardProps) {
  return (
    <div
      className="flex-1 rounded-2xl p-6"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: "0 4px 20px oklch(0.22 0.018 248 / 0.04)",
      }}
    >
      <p
        className="text-sm font-bold uppercase tracking-widest mb-3"
        style={{ color: style.dot }}
      >
        {title}
      </p>
      <p className="text-base leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

const CORE_BELIEF_MAP: Record<string, string> = {
  "self criticism": "I am not good enough",
  "comparison thinking": "Others are better than me",
  "fortune telling": "I might fail",
  "mind reading": "People will judge me",
  catastrophizing: "Things will go badly",
};

const inferCoreBelief = (
  thoughts: ThoughtHistoryEntry[],
): { belief: string; confidence: number } => {
  const recent = thoughts.slice(-8);
  const patternCounts: Record<string, number> = {};
  for (const entry of recent) {
    const normalized = entry.analysis.pattern?.trim().toLowerCase();
    if (!normalized || normalized === "none identified yet") continue;
    patternCounts[normalized] = (patternCounts[normalized] || 0) + 1;
  }
  const sorted = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]);
  const [dominantPattern, count] = sorted[0] || [null, 0];
  if (dominantPattern && count >= 3) {
    const matchedKey = Object.keys(CORE_BELIEF_MAP).find((key) =>
      dominantPattern.includes(key),
    );
    if (matchedKey)
      return { belief: CORE_BELIEF_MAP[matchedKey], confidence: 0.7 };
  }
  return { belief: "not clear yet", confidence: 0 };
};

const computeThreadInsights = (
  thoughts: ThoughtHistoryEntry[],
): ComputedThreadInsights => {
  const patternCounts: Record<string, { key: string; count: number }> = {};
  const emotionCounts: Record<string, number> = {};
  const beliefCounts: Record<string, number> = {};

  for (const entry of thoughts) {
    const pattern = entry.analysis.pattern?.trim();
    if (pattern && pattern.toLowerCase() !== "none identified yet") {
      const normalized = pattern.toLowerCase();
      if (!patternCounts[normalized])
        patternCounts[normalized] = { key: pattern, count: 0 };
      patternCounts[normalized].count += 1;
    }
    const emotion = entry.analysis.emotion?.trim();
    if (emotion) emotionCounts[emotion] = (emotionCounts[emotion] ?? 0) + 1;
    const belief = entry.analysis.coreBelief?.trim();
    if (belief && belief.toLowerCase() !== "not clear yet")
      beliefCounts[belief] = (beliefCounts[belief] ?? 0) + 1;
  }

  const selectDominant = <T extends { count: number; key?: string | null }>(
    source: Record<string, T>,
  ): [string | null, number] => {
    const entries = Object.values(source);
    if (!entries.length) return [null, 0];
    const winner = entries.reduce((prev, current) =>
      current.count > prev.count ? current : prev,
    );
    return [winner.key ?? null, winner.count];
  };

  const [dominantPattern, dominantPatternCount] = selectDominant(patternCounts);
  const [dominantEmotion, dominantEmotionCount] = selectDominant(
    Object.fromEntries(
      Object.entries(emotionCounts).map(([key, count]) => [
        key,
        { key, count },
      ]),
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

type ClarificationState = { message: string; questions: string[] };

const createUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-sm font-semibold uppercase tracking-widest mb-4"
      style={{ color: "oklch(0.42 0.11 152)" }}
    >
      {children}
    </p>
  );
}

type InsightSummaryProps = {
  patternSummaryText: string;
  emotionSummaryText: string;
  beliefDisplay: string;
  dominantPattern: string | null;
  dominantEmotion: string | null;
};

function InsightSummary({
  patternSummaryText,
  emotionSummaryText,
  beliefDisplay,
  dominantPattern,
  dominantEmotion,
}: InsightSummaryProps) {
  return (
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
            What we&apos;re noticing in your thinking
          </p>
          <div className="space-y-2">
            <p
              className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2"
              style={{ color: "oklch(0.42 0.11 152)" }}
            >
              <span>🧠</span> Thinking pattern
            </p>
            <p className="text-lg leading-relaxed font-medium text-foreground">
              {patternSummaryText}
            </p>
            {dominantPattern && (
              <p className="text-sm text-muted-foreground">
                Dominant pattern: {dominantPattern}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p
              className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2"
              style={{ color: "oklch(0.42 0.11 152)" }}
            >
              <span>❤️</span> Emotion that appears most often
            </p>
            <p className="text-lg font-medium text-foreground">
              {emotionSummaryText}
            </p>
            {dominantEmotion && (
              <p className="text-sm text-muted-foreground">
                Dominant emotion: {dominantEmotion}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p
              className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2"
              style={{ color: "oklch(0.42 0.11 152)" }}
            >
              <span>🌱</span> Possible deeper belief
            </p>
            <p className="text-lg font-medium text-foreground">
              {beliefDisplay}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
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
}: { children: React.ReactNode; delay?: number; className?: string }) {
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

export default function ThoughtPage({ onBack }: { onBack?: () => void }) {
  const [thought, setThought] = useState("");
  const [analysis, setAnalysis] = useState<ThoughtAnalysisResult | null>(null);
  const [clarification, setClarification] = useState<ClarificationState | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [guidanceMessage, setGuidanceMessage] = useState<string | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [pass, setPass] = useState(1);
  const [revealCount, setRevealCount] = useState(1);
  const [thoughtHistory, setThoughtHistory] = useState<ThoughtHistoryEntry[]>(
    [],
  );
  const [suggestionOverride, setSuggestionOverride] = useState<
    string | undefined
  >(undefined);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const visitorIdRef = useRef("");
  const sessionIdRef = useRef("");
  const threadIdRef = useRef("");

  const computedThreadInsights = useMemo(
    () => computeThreadInsights(thoughtHistory),
    [thoughtHistory],
  );
  const {
    dominantPattern,
    dominantEmotion,
    dominantBelief: computedBelief,
    coreBelief,
    coreBeliefConfidence,
  } = computedThreadInsights;
  const beliefDisplay =
    coreBeliefConfidence >= 0.6 && coreBelief
      ? coreBelief
      : computedBelief
        ? computedBelief
        : "Not clear yet";
  const patternSummaryText = dominantPattern
    ? patternToInsight(dominantPattern)
    : "We are still watching how your thoughts unfold.";
  const emotionSummaryText = dominantEmotion || "Still tracking the feeling";

  const latestAnalysisCards = useMemo(
    () =>
      analysis
        ? buildAnalysisCards(analysis, {
            includeSituation: thoughtHistory.length <= 1,
          })
        : [],
    [analysis, thoughtHistory.length],
  );
  const latestVisibleCards = useMemo(
    () => latestAnalysisCards.filter((card) => card.value.trim()),
    [latestAnalysisCards],
  );
  const suggestionStabilized = useMemo(() => {
    if (thoughtHistory.length < 3) return false;
    const lastThreePatterns = thoughtHistory
      .slice(-3)
      .map((entry) => entry.analysis.pattern?.trim() ?? "");
    if (lastThreePatterns.some((pattern) => !pattern)) return false;
    return lastThreePatterns.every(
      (pattern) => pattern === lastThreePatterns[0],
    );
  }, [thoughtHistory]);

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
    const id = window.setInterval(
      () =>
        setPlaceholderIndex(
          (current) => (current + 1) % placeholderExamples.length,
        ),
      4000,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!analysis) {
      setRevealCount(1);
      return;
    }
    if (
      latestVisibleCards.length === 0 ||
      revealCount >= latestVisibleCards.length
    )
      return;
    const timer = window.setTimeout(
      () => setRevealCount((current) => current + 1),
      600,
    );
    return () => window.clearTimeout(timer);
  }, [analysis, latestVisibleCards.length, revealCount]);

  const handleSuggestionClick = (suggestion: string) => {
    setThought(suggestion);
    setHint("");
    setSuggestionOverride(suggestion);
    setValidationMessage("");
    setGuidanceMessage(null);
  };
  const handleClarificationQuestion = (question: string) => {
    setClarification(null);
    processThought(question);
  };
  const handleThoughtBlur = () => {
    const result = validateSimpleInput(thought);
    setValidationMessage(result.message ?? "");
  };

  const startNewThoughtThread = (options?: { threadId?: string }) => {
    threadIdRef.current = options?.threadId ?? createUUID();
    setAnalysis(null);
    setHint("");
    setClarification(null);
    setThought("");
    setPass(1);
    setRevealCount(1);
    setThoughtHistory([]);
    setSuggestionOverride(undefined);
    setValidationMessage("");
    setGuidanceMessage(null);
  };

  const processThought = async (overrideText?: string) => {
    const message = overrideText ?? thought;
    setThought(message);
    if (!initializeContext()) {
      setHint("Hold on a second, we're setting up your session context.");
      return;
    }
    if (!contextReady) setContextReady(true);
    setGuidanceMessage(null);
    const validation = validateSimpleInput(message);
    setValidationMessage(validation.message ?? "");
    if (!validation.valid) return;
    setHint("");
    setClarification(null);
    setGuidanceMessage(null);
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

      if (data?.status === "guidance" || data?.status === "safety") {
        setGuidanceMessage(
          data.message || "We couldn't identify a clear thought.",
        );
        setLoading(false);
        return;
      }
      if (data?.status !== "success") {
        setHint("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const responseThreadId =
        typeof data.threadId === "string" ? data.threadId : threadIdRef.current;
      if (data.threadReset && responseThreadId) {
        startNewThoughtThread({ threadId: responseThreadId });
        setHint(
          "This thought felt like a different situation, so we started a fresh thread.",
        );
      } else if (responseThreadId) {
        threadIdRef.current = responseThreadId;
      }

      const payload = data.analysis ?? data;
      const asString = (value: unknown) =>
        typeof value === "string" ? value : "";
      const asStringArray = (value: unknown) =>
        Array.isArray(value)
          ? value
              .map((item) => (typeof item === "string" ? item.trim() : ""))
              .filter((item): item is string => item.length > 0)
          : [];

      const typedResult: ThoughtAnalysisResult = {
        situation: asString(payload.situation),
        story: asString(payload.story),
        emotion: asString(payload.emotion),
        emotions: asStringArray(payload.emotions),
        pattern: asString(payload.pattern),
        patternExplanation: asString(payload.patternExplanation),
        automaticThought: asString(payload.automaticThought),
        coreBelief: asString(payload.coreBelief),
        normalization: asString(payload.normalization),
        trigger: asString(payload.trigger),
        reflectionQuestion: asString(payload.reflectionQuestion),
        balancedThought: asString(payload.balancedThought),
        suggestions: asStringArray(payload.suggestions),
        context: Array.isArray(payload.context)
          ? payload.context.map((item: unknown) => String(item))
          : [],
        thought: typeof payload.thought === "string" ? payload.thought : null,
      };

      setAnalysis(typedResult);
      setPass((prev) => Math.min(prev + 1, 4));
      setRevealCount(1);
      setThoughtHistory((prev) => [
        ...prev,
        {
          thought: message,
          analysis: typedResult,
          createdAt: new Date().toISOString(),
        },
      ]);
      setThought("");
      setValidationMessage("");
    } catch (error) {
      console.error(error);
      setHint("Something went wrong. Please try again.");
      setValidationMessage("");
    } finally {
      setLoading(false);
      setSuggestionOverride(undefined);
    }
  };

  const renderTimelineEntry = (entry: ThoughtHistoryEntry, index: number) => {
    const cards = buildAnalysisCards(entry.analysis, {
      includeSituation: thoughtHistory.length <= 1,
    });
    const visibleCards = cards.filter((card) => card.value.trim());
    return (
      <Fragment key={`entry-${index}-${entry.thought}`}>
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
              className="text-sm font-bold uppercase tracking-widest mb-3"
              style={{ color: "oklch(0.42 0.11 152)" }}
            >
              Your thought
            </p>
            <p className="text-base font-semibold leading-relaxed text-foreground">
              &ldquo;{entry.thought}&rdquo;
            </p>
          </div>
        </motion.div>
        {visibleCards.map((card, cardIdx) => {
          if (cardIdx >= revealCount) return null;
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
                  style={{ background: card.style.dot }}
                />
              </div>
              <InsightCard
                title={card.title}
                value={card.value.trim()}
                style={card.style}
              />
            </motion.div>
          );
        })}
      </Fragment>
    );
  };

  const suggestionOptions = analysis?.suggestions ?? [];
  const showSuggestionChips =
    suggestionOptions.length > 0 && !suggestionStabilized;
  const placeholderExample = placeholderExamples[placeholderIndex];
  const inlineMessage = guidanceMessage ?? validationMessage ?? hint;
  const showInsights = pass >= 4 && Boolean(analysis);
  const orderedThoughtsForTimeline = useMemo(
    () =>
      [...thoughtHistory]
        .slice(0, -1)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((entry, index) => ({
          id: `${index}-${entry.createdAt}`,
          thought: entry.analysis.story?.trim() || entry.thought,
        })),
    [thoughtHistory],
  );
  const situationForTimeline =
    analysis?.situation ?? thoughtHistory.at(-1)?.analysis.situation;

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.977 0.008 88)" }}
    >
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b border-border"
        style={{ background: "oklch(0.977 0.008 88 / 0.92)" }}
      >
        <nav className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div className="w-20" />
          )}
          <span className="font-display text-xl font-semibold text-foreground tracking-tight">
            ThoughtLens.ai
          </span>
          <div className="w-20" />
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-8 pb-4 md:px-6 md:py-16 flex flex-col gap-8 md:gap-12">
        <FadeUp>
          <header className="text-center space-y-2 md:space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-semibold text-foreground text-balance leading-tight">
              Notice how your mind
              <br />
              interprets situations
            </h1>
            <p className="text-base text-muted-foreground md:text-xl">
              What worrying thought came to mind?
            </p>
          </header>
        </FadeUp>

        {!analysis && !clarification && !loading && (
          <FadeUp delay={0.1}>
            <section
              className="rounded-3xl p-5 sm:p-8 space-y-6"
              style={{
                background:
                  "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.025 150) 100%)",
                boxShadow:
                  "0 24px 64px oklch(0.22 0.018 248 / 0.12), 0 4px 16px oklch(0.22 0.018 248 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.7)",
                border: "1px solid oklch(0.88 0.025 150 / 0.5)",
              }}
            >
              <div>
                <textarea
                  data-ocid="thought_page.textarea"
                  value={thought}
                  onChange={(e) => {
                    setThought(e.target.value);
                    if (guidanceMessage) setGuidanceMessage(null);
                    if (validationMessage) setValidationMessage("");
                  }}
                  onBlur={handleThoughtBlur}
                  placeholder={placeholderExample}
                  className="h-40 md:h-36 w-full rounded-2xl p-5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none"
                  style={{
                    background: "oklch(0.995 0.004 88 / 0.8)",
                    border: "1px solid oklch(0.88 0.015 88)",
                  }}
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  We&apos;ll help you see the thinking pattern behind it.
                </p>
              </div>
              {inlineMessage && (
                <div
                  data-ocid="thought_page.error_state"
                  className="mt-3 rounded-xl p-4 text-sm"
                  style={{
                    background: "oklch(0.93 0.025 150 / 0.4)",
                    border: "1px solid oklch(0.80 0.04 150 / 0.5)",
                    color: "oklch(0.35 0.08 152)",
                  }}
                >
                  {inlineMessage}
                </div>
              )}
              <Button
                data-ocid="thought_page.submit_button"
                onClick={() => processThought()}
                className="w-full rounded-full h-12 text-base font-semibold"
                style={{ boxShadow: "0 4px 20px oklch(0.46 0.12 152 / 0.30)" }}
              >
                Analyze my thought
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                This is not advice. It&apos;s a mirror of your worrying thinking.
              </p>
            </section>
          </FadeUp>
        )}

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
              <p className="mt-5 text-base text-muted-foreground">
                We are working through your thought right now.
              </p>
            </section>
          </FadeUp>
        )}

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

        {thoughtHistory.length > 0 && (
          <section className="space-y-10">
            {thoughtHistory.length > 1 && (
              <ThoughtTimeline
                situation={situationForTimeline}
                thoughts={orderedThoughtsForTimeline}
              />
            )}
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
                    <div className="flex-1 rounded-2xl border border-border/70 bg-background/70 p-5">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Analyzing your thought…
                      </p>
                      <div className="mt-3 flex items-center gap-2">
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
                return renderTimelineEntry(entry, idx);
              })}
              {showInsights && analysis && (
                <InsightSummary
                  patternSummaryText={patternSummaryText}
                  emotionSummaryText={emotionSummaryText}
                  beliefDisplay={beliefDisplay}
                  dominantPattern={dominantPattern}
                  dominantEmotion={dominantEmotion}
                />
              )}
              <div className="flex items-start gap-4">
                <div className="mt-2">
                  <span
                    className="block h-3 w-3 rounded-full border-2"
                    style={{
                      borderColor: "oklch(0.48 0.08 310)",
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
                      "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.962 0.025 310) 100%)",
                    border: "1px solid oklch(0.86 0.035 310 / 0.55)",
                    boxShadow: "0 8px 32px oklch(0.22 0.018 248 / 0.07)",
                  }}
                >
                  <div>
                    <p
                      className="text-sm font-semibold uppercase tracking-widest mb-4"
                      style={{ color: "oklch(0.39 0.09 310)" }}
                    >
                      What thought came next?
                    </p>
                    <textarea
                      data-ocid="thought_page.next_thought.textarea"
                      value={thought}
                      onChange={(e) => {
                        setThought(e.target.value);
                        setSuggestionOverride(undefined);
                      }}
                      placeholder="Share the next thought in this situation…"
                      className="mt-2 h-36 md:h-32 w-full rounded-xl p-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none"
                      style={{
                        background: "oklch(0.995 0.004 88 / 0.8)",
                        border: "1px solid oklch(0.86 0.03 310 / 0.6)",
                      }}
                    />
                  </div>
                  {hint && (
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.55 0.22 29)" }}
                    >
                      {hint}
                    </p>
                  )}
                  {showSuggestionChips && (
                    <div className="flex flex-wrap gap-2">
                      {suggestionOptions.map((chip, idx) => (
                        <button
                          key={chip}
                          type="button"
                          data-ocid={`thought_page.suggestion.button.${idx + 1}`}
                          onClick={() => handleSuggestionClick(chip)}
                          className="rounded-full px-4 py-2 text-sm transition-colors"
                          style={{
                            background: "oklch(0.935 0.03 310 / 0.5)",
                            border: "1px solid oklch(0.82 0.04 310 / 0.65)",
                            color: "oklch(0.35 0.08 310)",
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
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
                    onClick={() => startNewThoughtThread()}
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

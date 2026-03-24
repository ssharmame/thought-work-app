"use client"
import ThoughtTimeline from "@/components/reflection/ThoughtTimeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { validateSimpleInput } from "@/lib/simpleValidation";
import { PATTERN_DISPLAY } from "@/lib/ai";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";


// Safety-net: convert noun-form emotions to adjective form in case AI returns the wrong form
const EMOTION_NOUN_TO_ADJECTIVE: Record<string, string> = {
  anxiety: "anxious",
  sadness: "sad",
  fear: "afraid",
  anger: "angry",
  hopelessness: "hopeless",
  overwhelm: "overwhelmed",
  frustration: "frustrated",
  helplessness: "helpless",
  guilt: "guilty",
  shame: "ashamed",
  loneliness: "lonely",
  grief: "grieving",
  panic: "panicked",
  stress: "stressed",
  worry: "worried",
}

function toEmotionAdjective(emotion: string): string {
  const lower = emotion.toLowerCase().trim()
  return EMOTION_NOUN_TO_ADJECTIVE[lower] ?? lower
}


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
  mode: ResponseMode;
  createdAt: string;
};

type ResponseMode = "short" | "medium" | "deep";

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
  // Neutral cards — near-white, almost no tint
  fact: {
    bg: "oklch(0.997 0.003 88)",
    border: "oklch(0.88 0.012 88 / 0.7)",
    dot: "oklch(0.52 0.08 220)",
  },
  story: {
    bg: "oklch(0.997 0.003 88)",
    border: "oklch(0.88 0.012 88 / 0.7)",
    dot: "oklch(0.52 0.12 30)",
  },
  emotion: {
    bg: "oklch(0.997 0.003 88)",
    border: "oklch(0.88 0.012 88 / 0.7)",
    dot: "oklch(0.52 0.09 300)",
  },
  // Pattern — very subtle rose warmth, the key insight card
  pattern: {
    bg: "linear-gradient(150deg, oklch(0.997 0.003 88) 0%, oklch(0.985 0.015 20) 100%)",
    border: "oklch(0.84 0.06 20 / 0.5)",
    dot: "oklch(0.52 0.15 20)",
  },
  // Balanced — very subtle sage, the resolution card
  balanced: {
    bg: "linear-gradient(150deg, oklch(0.997 0.003 88) 0%, oklch(0.982 0.018 152) 100%)",
    border: "oklch(0.84 0.07 152 / 0.45)",
    dot: "oklch(0.46 0.12 152)",
  },
};

type AnalysisCard = {
  key: string;
  title: string;
  value: string;
  style: { bg: string; border: string; dot: string };
  patternKey?: string;
  question?: string;
};

const selectResponseMode = (
  thought: string,
  historyLength: number,
): ResponseMode => {
  if (historyLength >= 3) return "deep";
  if (historyLength >= 1 || thought.trim().length > 140) return "medium";
  return "short";
};

const toNaturalPatternLine = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^this looks like/i.test(trimmed)) return trimmed;
  return `This looks like your mind focusing on what might go wrong while the outcome is still unclear.`;
};

const buildAnalysisCards = (
  analysis: ThoughtAnalysisResult,
  options?: { includeSituation?: boolean; mode?: ResponseMode },
): AnalysisCard[] => {
  const includeSituation = options?.includeSituation ?? true;
  const mode = options?.mode ?? "short";
  // Use contextual AI message (patternExplanation) directly —
  // no fallback to generic patternToInsight string matching
  const patternValue = toNaturalPatternLine(analysis.patternExplanation ?? "");
  const emotionValue = analysis.emotion?.trim()
    ? `It makes sense this could feel ${toEmotionAdjective(analysis.emotion)}.`
    : "";

  const storyAndEmotion =
    mode === "short" && emotionValue
      ? `${analysis.story ?? ""} ${emotionValue}`.trim()
      : analysis.story ?? "";

  const cards: (AnalysisCard | null)[] = [
    includeSituation
      ? {
          key: "fact",
          title: "What happened",
          value: analysis.situation ?? "",
          style: INSIGHT_CARD_STYLES.fact,
        }
      : null,
    {
      key: "story",
      title: "Where your mind went next",
      value: storyAndEmotion,
      style: INSIGHT_CARD_STYLES.story,
    },
    mode === "short"
      ? null
      : {
          key: "emotion",
          title: "How it feels right now",
          value: analysis.emotion ?? "",
          style: INSIGHT_CARD_STYLES.emotion,
        },
    patternValue
      ? {
          key: "pattern",
          title: "A clearer view",
          value: patternValue,
          style: INSIGHT_CARD_STYLES.pattern,
          patternKey: analysis.pattern ?? undefined,
        }
      : null,
    {
      key: "balanced",
      title: "A steadier way to hold this",
      value: analysis.balancedThought ?? "",
      style: INSIGHT_CARD_STYLES.balanced,
      question: analysis.reflectionQuestion?.trim() || undefined,
    },
  ];
  return cards.filter((card): card is AnalysisCard => card !== null);
};

type InsightCardProps = {
  title: string;
  value: string;
  style: { bg: string; border: string; dot: string };
  patternKey?: string;
  question?: string;
};

function InsightCard({ title, value, style, patternKey, question }: InsightCardProps) {
  const display = patternKey
    ? PATTERN_DISPLAY[patternKey.toLowerCase()]
    : null;

  return (
    <div
      className="flex-1 rounded-2xl p-6"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: "0 4px 20px oklch(0.22 0.018 248 / 0.04)",
      }}
    >
      {/* Human-friendly label if pattern */}
      {display ? (
        <>
          <p
            className="text-xs font-semibold tracking-wide mb-1"
            style={{ color: style.dot, opacity: 0.75 }}
          >
            A clearer view
          </p>
          <p
            className="text-base font-semibold mb-3 leading-snug"
            style={{ color: style.dot }}
          >
            {display.label}
          </p>
          {/* Contextual AI message */}
          <p className="text-base leading-relaxed text-foreground mb-4">
            {value}
          </p>
          {/* Reflection question moved to standalone beat before clarity check */}
        </>
      ) : (
        <>
          <p
            className="text-xs font-semibold tracking-wide mb-2"
            style={{ color: style.dot }}
          >
            {title}
          </p>
          <p className="text-base leading-relaxed text-foreground">
            {title === "How it feels right now"
              ? `This thought left you feeling ${toEmotionAdjective(value)}.`
              : value}
          </p>
          {question && (
            <>
              <div
                className="my-4"
                style={{ borderTop: `1px solid ${style.border}` }}
              />
              <p className="text-sm leading-relaxed italic" style={{ color: "oklch(0.48 0.025 248)" }}>
                {question}
              </p>
            </>
          )}
        </>
      )}
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
  beliefDisplay: string | null;
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
      <div
        className="flex-1 rounded-2xl p-6 space-y-5"
        style={{
          background:
            "linear-gradient(150deg, oklch(0.995 0.004 88) 0%, oklch(0.960 0.022 260) 100%)",
          border: "1px solid oklch(0.84 0.04 260 / 0.45)",
          boxShadow: "0 4px 20px oklch(0.22 0.018 248 / 0.06)",
        }}
      >
        <p
          className="text-xs font-semibold tracking-wide"
          style={{ color: "oklch(0.42 0.10 260)" }}
        >
          What your thinking reveals
        </p>

        {/* Pattern */}
        <div className="space-y-1">
          <p
            className="text-xs font-semibold tracking-wide"
            style={{ color: "oklch(0.50 0.08 260)" }}
          >
            How your mind works
          </p>
          <p className="text-base leading-relaxed text-foreground">
            {patternSummaryText}
          </p>
          {dominantPattern && (
            <p className="text-xs" style={{ color: "oklch(0.52 0.06 260)" }}>
              {dominantPattern}
            </p>
          )}
        </div>

        {/* Emotion */}
        <div className="space-y-1">
          <p
            className="text-xs font-semibold tracking-wide"
            style={{ color: "oklch(0.50 0.08 260)" }}
          >
            What kept surfacing
          </p>
          <p className="text-base text-foreground capitalize">
            {emotionSummaryText}
          </p>
        </div>

        {/* Deeper belief — only shown when something meaningful is detected */}
        {beliefDisplay && (
          <div className="space-y-1">
            <p
              className="text-xs font-semibold tracking-wide"
              style={{ color: "oklch(0.50 0.08 260)" }}
            >
              A possible belief underneath
            </p>
            <p className="text-base leading-relaxed text-foreground">
              {beliefDisplay}
            </p>
          </div>
        )}
      </div>
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

function UserMenu({ email, role }: { email: string; role: string | null }) {
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  // First letter of email as avatar
  const initial = email[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-foreground/10 border border-border flex items-center justify-center text-sm font-medium text-foreground hover:bg-foreground/15 transition-colors"
        title={email}
      >
        {initial}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-50 w-52 rounded-xl bg-background border border-border shadow-lg py-1 text-sm">
            <div className="px-4 py-2.5 border-b border-border">
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
            {role === "PRACTITIONER" && (
              <a
                href="/dashboard"
                className="flex items-center px-4 py-2.5 text-foreground hover:bg-muted transition-colors"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </a>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left flex items-center px-4 py-2.5 text-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ThoughtPage({ onBack }: { onBack?: () => void }) {
  const [thought, setThought] = useState("");
  const [analysis, setAnalysis] = useState<ThoughtAnalysisResult | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clarification, setClarification] = useState<ClarificationState | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [guidanceMessage, setGuidanceMessage] = useState<string | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [pass, setPass] = useState(1);
  // revealGroup controls which card group is visible:
  // 0 = nothing, 1 = fact, 2 = story+emotion, 3 = pattern, 4 = balanced
  const [revealGroup, setRevealGroup] = useState(0);
  const [thoughtHistory, setThoughtHistory] = useState<ThoughtHistoryEntry[]>(
    [],
  );
  const [balancedRevealed, setBalancedRevealed] = useState(false);
  const [acknowledgement, setAcknowledgement] = useState("");
  const [reassurance, setReassurance] = useState("");
  const [clarityChoice, setClarityChoice] = useState<"yes" | "not-yet" | null>(null);
  const [situationAmbiguity, setSituationAmbiguity] = useState<{
    pendingThought: string;
    newThreadId: string;
  } | null>(null);
  const [isAnalyzingFollowUp, setIsAnalyzingFollowUp] = useState(false);
  const [insightUnlocked, setInsightUnlocked] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>("short");
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
        : null;
  const patternSummaryText = dominantPattern
    ? patternToInsight(dominantPattern)
    : "We are still watching how your thoughts unfold.";
  const emotionSummaryText = dominantEmotion || "Still tracking the feeling";

  const latestAnalysisCards = useMemo(
    () =>
      analysis
        ? buildAnalysisCards(analysis, {
            includeSituation: thoughtHistory.length <= 1,
            mode: responseMode,
          })
        : [],
    [analysis, thoughtHistory.length, responseMode],
  );
  const latestVisibleCards = useMemo(
    () => latestAnalysisCards.filter((card) => card.value.trim()),
    [latestAnalysisCards],
  );

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

  // Fetch current auth user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null);
        // Fetch role from API
        fetch("/api/me")
          .then((r) => r.json())
          .then((d) => setUserRole(d.role ?? null))
          .catch(() => {});
      }
    });
  }, []);


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
    setRevealGroup(0);
    setThoughtHistory([]);
    setValidationMessage("");
    setGuidanceMessage(null);
    setBalancedRevealed(false);
    setAcknowledgement("");
    setReassurance("");
    setClarityChoice(null);
    setSituationAmbiguity(null);
    setIsAnalyzingFollowUp(false);
    setInsightUnlocked(false);
    setResponseMode("short");
  };

  // User signals their next thought is about a different situation entirely.
  // Resets the thread context (new threadId, cleared history) but preserves
  // whatever they've typed so it submits as the first thought of a fresh thread.
  const handleDifferentSituation = () => {
    const currentThought = thought;
    threadIdRef.current = createUUID();
    setHint("");
    setClarification(null);
    setPass(1);
    setRevealGroup(0);
    setThoughtHistory([]);
    setValidationMessage("");
    setGuidanceMessage(null);
    setBalancedRevealed(false);
    setClarityChoice(null);
    setSituationAmbiguity(null);
    // If they've typed something, submit it as a new thread immediately.
    // If the textarea is empty, fall through to the clean initial input state.
    if (currentThought.trim().length >= 6) {
      processThought(currentThought);
    } else {
      setAnalysis(null);
      setAcknowledgement("");
      setReassurance("");
    }
  };

  const processThought = async (overrideText?: string, forceSameThread?: boolean, forceFirstThought?: boolean) => {
    // Capture before any state changes — reliable even with async React batching.
    const isFollowUp = !forceFirstThought && clarityChoice === "not-yet";

    const message = overrideText ?? thought;
    setThought(message);
    if (!initializeContext()) {
      setHint("Hold on a second, we're setting up your session context.");
      return;
    }
    if (!contextReady) setContextReady(true);
    setGuidanceMessage(null);
    // Only reset thread-level state for first thought — for follow-up, keep
    // clarityChoice/"not-yet" and situationAmbiguity visible until classify resolves.
    if (!isFollowUp) {
      setClarityChoice(null);
      setSituationAmbiguity(null);
    }
    const validation = validateSimpleInput(message);
    setValidationMessage(validation.message ?? "");
    if (!validation.valid) return;
    setHint("");
    setClarification(null);
    setGuidanceMessage(null);

    if (!isFollowUp) {
      // First thought: show loading card immediately — instant feedback.
      setAnalysis(null);
      setAcknowledgement("");
      setReassurance("");
      setLoading(true);
    } else {
      // Follow-up thought: stay in the form but disable it while classifying.
      setIsAnalyzingFollowUp(true);
    }

    // Phase 1 — classify the input (~400-600ms).
    let classifyResult: { status: string; message?: string };
    try {
      const existingSituation = analysis?.situation || thoughtHistory.at(-1)?.analysis.situation || null;
      const threadHistory = thoughtHistory.map(
        (e) => e.analysis.story?.trim() || e.thought
      );
      const classifyRes = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thought: message,
          situation: forceSameThread ? null : existingSituation,
          previousThoughts: forceSameThread ? [] : threadHistory,
        }),
      });
      classifyResult = await classifyRes.json();
    } catch {
      classifyResult = { status: "guidance", message: "Something went wrong. Please try again." };
    }

    // Classify done — always clear the analyzing state.
    setIsAnalyzingFollowUp(false);

    if (classifyResult.status === "guidance" || classifyResult.status === "safety") {
      setGuidanceMessage(classifyResult.message || "We couldn't identify a clear thought.");
      setLoading(false);
      return;
    }

    if (classifyResult.status === "different_situation") {
      // Follow-up: show ambiguity inline inside the "not-yet" form card.
      // First thought: swap loading card for ambiguity card (rare — no prior situation to compare).
      setSituationAmbiguity({
        pendingThought: message,
        newThreadId: createUUID(),
      });
      setLoading(false);
      return;
    }

    // Confirmed valid thought — now clear previous analysis and start the loading screen.
    setClarityChoice(null);
    setSituationAmbiguity(null);
    setAnalysis(null);
    setAcknowledgement("");
    setReassurance("");
    setLoading(true);

    // Phase 2 — confirmed distorted thought.
    // Fire /api/acknowledge now — the AI-written line is the first and only
    // acknowledgement shown. No string-matching fallback needed.
    fetch("/api/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thought: message }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.acknowledgement) setAcknowledgement(result.acknowledgement);
        if (result.reassurance) setReassurance(result.reassurance);
      })
      .catch(() => {
        // acknowledge failed — loading card stays on "One moment…", that's fine
      });

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
          forceSameThread: forceSameThread ?? false,
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
        // Continuity check in process-thought also detected a new situation (safety net).
        // Surface ambiguity — analysis already ran but we discard it. User decides first.
        setSituationAmbiguity({
          pendingThought: message,
          newThreadId: responseThreadId,
        });
        setLoading(false);
        return;
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
        context: Array.isArray(payload.context)
          ? payload.context.map((item: unknown) => String(item))
          : [],
        thought: typeof payload.thought === "string" ? payload.thought : null,
      };
      const mode = selectResponseMode(message, thoughtHistory.length);
      setResponseMode(mode);

      setAnalysis(typedResult);
      setPass((prev) => Math.min(prev + 1, 4));
      setRevealGroup(1);
      setBalancedRevealed(false);
      setThoughtHistory((prev) => [
        ...prev,
        {
          thought: message,
          analysis: typedResult,
          mode,
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
      }
  };

  const renderTimelineEntry = (entry: ThoughtHistoryEntry, index: number) => {
    const cards = buildAnalysisCards(entry.analysis, {
      includeSituation: thoughtHistory.length <= 1,
      mode: entry.mode,
    });
    const visibleCards = cards.filter((card) => card.value.trim());

    // Group cards into 3 phases:
    // Group 1: fact only
    // Group 2: story + emotion
    // Group 3: pattern
    // Group 4: balanced (already user-gated separately)
    const GROUP_MAP: Record<string, number> = {
      fact: 1,
      story: 2,
      emotion: 2,
      pattern: 3,
      balanced: 4,
    }

    // Continue button labels per group
    const CONTINUE_LABELS: Record<number, string> = {
      1: "I see — what did my mind make of this?",
      2: "Why does my mind do this?",
      3: "Show me a clearer way to see this",
    }

    // Which groups are present in this entry
    const groupsPresent = Array.from(
      new Set(visibleCards.map((c) => GROUP_MAP[c.key] ?? 1))
    ).sort()

    // Highest group that has cards (excluding balanced which is self-gated)
    const maxNonBalancedGroup = Math.max(
      ...groupsPresent.filter((g) => g < 4),
      0
    )

    return (
      <Fragment key={`entry-${index}-${entry.thought}`}>

        {/* Thought bubble */}
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
              className="text-xs font-semibold tracking-wide mb-2"
              style={{ color: "oklch(0.50 0.08 152)" }}
            >
              You wrote
            </p>
            <p className="text-base font-semibold leading-relaxed text-foreground">
              &ldquo;{entry.thought}&rdquo;
            </p>
          </div>
        </motion.div>

        {/* Grounding line — appears as its own progressive beat after the thought bubble */}
        {revealGroup >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-start gap-4 mb-6"
          >
            <div className="mt-2 flex-shrink-0">
              <span
                className="block h-2 w-2 rounded-full"
                style={{ background: "oklch(0.46 0.12 152 / 0.4)" }}
              />
            </div>
            <p
              className="flex-1 text-sm leading-relaxed pt-0.5"
              style={{ color: "oklch(0.42 0.025 248)" }}
            >
              Let&apos;s walk through this one step at a time.
            </p>
          </motion.div>
        )}

        {/* Cards grouped — each group reveals on user tap */}
        {visibleCards.map((card) => {
          const cardGroup = GROUP_MAP[card.key] ?? 1
          const isBalanced = card.key === "balanced"

          // Don't show cards beyond current group
          if (cardGroup > revealGroup) return null

          // Stagger index within this group — so cards in the same group arrive one by one
          const cardsInSameGroup = visibleCards.filter(
            (c) => (GROUP_MAP[c.key] ?? 1) === cardGroup
          )
          const indexInGroup = cardsInSameGroup.findIndex((c) => c.key === card.key)
          const isFirstGroup = cardGroup === 1
          // First group: cards arrive after the grounding line (0.6s + stagger)
          // Other groups: cards arrive quickly after tap with stagger
          const cardDelay = isFirstGroup
            ? 0.6 + indexInGroup * 0.18
            : 0.05 + indexInGroup * 0.18

          // Balanced card — keep existing user-gated behaviour
          if (isBalanced) {
            if (!balancedRevealed) {
              // Only show balanced gate when group 3 is revealed
              if (revealGroup < 3) return null
              return (
                <motion.div
                  key={`balanced-gate-${index}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: cardDelay, ease: "easeOut" }}
                  className="flex items-start gap-4 mb-8"
                >
                  <div className="mt-2 flex-shrink-0">
                    <span
                      className="block h-3 w-3 rounded-full"
                      style={{ background: "oklch(0.46 0.12 152 / 0.4)" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setBalancedRevealed(true)}
                    className="flex-1 rounded-2xl p-5 text-left transition-all"
                    style={{
                      background: "oklch(0.92 0.05 152 / 0.25)",
                      border: "1px dashed oklch(0.46 0.12 152 / 0.4)",
                    }}
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "oklch(0.42 0.11 152)" }}
                    >
                      Ready to see a more balanced perspective? →
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tap when you feel ready.
                    </p>
                  </button>
                </motion.div>
              )
            }
            return (
              <motion.div
                key={`${card.key}-${index}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: cardDelay, ease: "easeOut" }}
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
                  patternKey={card.patternKey}
                  question={card.question}
                />
              </motion.div>
            )
          }

          return (
            <motion.div
              key={`${card.key}-${index}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: cardDelay, ease: "easeOut" }}
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
                patternKey={card.patternKey}
                question={card.question}
              />
            </motion.div>
          )
        })}

        {/* Continue button — shows after each group if more groups remain */}
        {revealGroup > 0 &&
          revealGroup <= maxNonBalancedGroup &&
          CONTINUE_LABELS[revealGroup] && (
            <motion.div
              key={`continue-${revealGroup}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: revealGroup === 1 ? 1.0 : 0.35 }}
              className="flex items-start gap-4 mb-8"
            >
              <div className="mt-2 flex-shrink-0">
                <span
                  className="block h-3 w-3 rounded-full"
                  style={{ background: "oklch(0.46 0.12 152 / 0.3)" }}
                />
              </div>
              <button
                type="button"
                onClick={() => setRevealGroup((g) => g + 1)}
                className="flex-1 rounded-2xl px-5 py-4 text-left transition-all"
                style={{
                  background: "oklch(0.975 0.010 152 / 0.4)",
                  border: "1px solid oklch(0.46 0.12 152 / 0.25)",
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.42 0.11 152)" }}
                >
                  {CONTINUE_LABELS[revealGroup]} →
                </p>
              </button>
            </motion.div>
          )}

      </Fragment>
    )
  };

  const inlineMessage = guidanceMessage ?? validationMessage ?? hint;
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
            Thoughtlensai
          </span>
          <div className="w-20 flex justify-end">
            {userEmail ? (
              <UserMenu email={userEmail} role={userRole} />
            ) : (
              <div />
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-8 pb-4 md:px-6 md:py-16 flex flex-col gap-8 md:gap-12">
        <FadeUp>
          <header className="text-center space-y-2 md:space-y-3">
            <h1 className="font-display text-2xl sm:text-3xl md:text-5xl font-semibold text-foreground text-balance leading-tight">
              What&apos;s been on your mind?
            </h1>
            <p className="text-sm sm:text-base md:text-lg" style={{ color: "oklch(0.48 0.020 248)" }}>
              The fear, the spiral, the worry that keeps coming back.
            </p>
          </header>
        </FadeUp>

        {thoughtHistory.length === 0 && !loading && !clarification && (
          <FadeUp delay={0.1}>
            <section
              className="rounded-3xl space-y-5 sm:space-y-6 p-5 sm:p-8 input-card"
              style={{
                background: "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.025 150) 100%)",
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
                  placeholder="Something that's been weighing on you…"
                  className="h-40 md:h-36 w-full rounded-2xl p-5 text-base text-foreground placeholder:text-[oklch(0.70_0.012_248)] focus:outline-none focus:ring-2 resize-none transition-all duration-200"
                  style={{
                    background: "oklch(1 0 0)",
                    border: guidanceMessage
                      ? "1.5px solid oklch(0.55 0.12 152)"
                      : "1.5px solid oklch(0.78 0.025 88)",
                    boxShadow: guidanceMessage
                      ? "0 0 0 3px oklch(0.82 0.08 152 / 0.28)"
                      : "none",
                  }}
                />
              </div>
              {inlineMessage && (
                <div
                  data-ocid="thought_page.error_state"
                  className="mt-3 rounded-xl p-4 text-sm"
                  style={{
                    background: "oklch(0.93 0.025 150 / 0.5)",
                    border: "1px solid oklch(0.72 0.06 150 / 0.6)",
                    color: "oklch(0.28 0.08 152)",
                  }}
                >
                  {inlineMessage.split("\n\n").map((para, i) => (
                    <p key={i} className={i > 0 ? "mt-2" : ""}>{para}</p>
                  ))}
                  {guidanceMessage && (
                    <p className="mt-2 text-xs font-semibold" style={{ color: "oklch(0.38 0.10 152)" }}>
                      ↑ You can add or edit your answer, then continue
                    </p>
                  )}
                </div>
              )}
              <Button
                data-ocid="thought_page.submit_button"
                onClick={() => processThought()}
                className="w-full rounded-full h-12 text-base font-semibold"
                style={{
                  background: "oklch(0.13 0.012 248)",
                  color: "oklch(0.97 0.004 88)",
                  boxShadow: "0 4px 20px oklch(0.13 0.012 248 / 0.25)",
                }}
              >
                {guidanceMessage ? "Continue" : "Explore this"}
              </Button>
              <p className="text-xs text-center" style={{ color: "oklch(0.65 0.010 248)" }}>
                This is a thinking tool, not therapy.
              </p>
            </section>
          </FadeUp>
        )}


        {loading && (
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
              <div className="flex items-center justify-center gap-3">
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

              {/* Acknowledgement — appears once /api/acknowledge responds */}
              <motion.p
                key={acknowledgement}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-6 text-lg font-semibold leading-snug max-w-xs mx-auto"
                style={{ color: "oklch(0.22 0.018 248)" }}
              >
                {acknowledgement || "One moment…"}
              </motion.p>

              {/* Reassurance — grounding, appears with acknowledgement */}
              {reassurance && (
                <motion.p
                  key={reassurance}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="mt-3 text-base leading-relaxed max-w-xs mx-auto"
                  style={{ color: "oklch(0.38 0.022 248)" }}
                >
                  {reassurance}
                </motion.p>
              )}

              {/* Transition — fixed, always shown */}
              <p
                className="mt-5 text-sm font-medium"
                style={{ color: "oklch(0.36 0.10 152)" }}
              >
                Let&apos;s look at what your mind is doing with this.
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

        {thoughtHistory.length > 0 && !loading && (
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

              {/* Thread progress signal + clarity choice — appear after balanced card is revealed */}
              {analysis && balancedRevealed && !loading && (
                <>
                  {/* Progress signal — honest location info, no judgment */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                    className="flex items-start gap-4 mb-6"
                  >
                    <div className="mt-2 flex-shrink-0">
                      <span
                        className="block h-2 w-2 rounded-full"
                        style={{ background: "oklch(0.46 0.12 152 / 0.4)" }}
                      />
                    </div>
                    <p
                      className="flex-1 text-sm leading-relaxed pt-0.5"
                      style={{ color: "oklch(0.40 0.025 248)" }}
                    >
                      {thoughtHistory.length === 1
                        ? "You've explored one angle of this situation."
                        : `You've now looked at this from ${thoughtHistory.length} angles.`}
                    </p>
                  </motion.div>

                  {/* Clarity choice — user decides when the thread is complete */}
                  {clarityChoice === null && !situationAmbiguity && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="flex items-start gap-4 mb-8"
                    >
                      <div className="mt-2 flex-shrink-0">
                        <span
                          className="block h-3 w-3 rounded-full border-2"
                          style={{
                            borderColor: "oklch(0.48 0.08 310)",
                            background: "oklch(0.977 0.008 88)",
                          }}
                        />
                      </div>
                      <div
                        className="flex-1 rounded-2xl p-6 space-y-4"
                        style={{
                          background:
                            "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.962 0.025 310) 100%)",
                          border: "1px solid oklch(0.86 0.035 310 / 0.55)",
                          boxShadow: "0 8px 32px oklch(0.22 0.018 248 / 0.07)",
                        }}
                      >
                        <p
                          className="text-base font-semibold leading-snug"
                          style={{ color: "oklch(0.22 0.018 248)" }}
                        >
                          Does this feel clearer than when you started?
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setClarityChoice("yes")}
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-left transition-all"
                            style={{
                              background: "oklch(0.92 0.05 152 / 0.4)",
                              border: "1px solid oklch(0.46 0.12 152 / 0.35)",
                              color: "oklch(0.32 0.09 152)",
                            }}
                          >
                            Yes, I have more clarity →
                          </button>
                          <button
                            type="button"
                            onClick={() => setClarityChoice("not-yet")}
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-left transition-all"
                            style={{
                              background: "oklch(0.96 0.012 310 / 0.4)",
                              border: "1px solid oklch(0.84 0.03 310 / 0.4)",
                              color: "oklch(0.39 0.09 310)",
                            }}
                          >
                            Not yet — there&apos;s still something here →
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Completion — user says they have clarity */}
                  {clarityChoice === "yes" && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-start gap-4 mb-8"
                    >
                      <div className="mt-2 flex-shrink-0">
                        <span
                          className="block h-3 w-3 rounded-full"
                          style={{ background: "oklch(0.46 0.12 152)" }}
                        />
                      </div>
                      <div
                        className="flex-1 rounded-2xl p-6 space-y-4"
                        style={{
                          background:
                            "linear-gradient(160deg, oklch(0.995 0.004 88) 0%, oklch(0.965 0.025 150) 100%)",
                          border: "1px solid oklch(0.88 0.025 150 / 0.5)",
                          boxShadow: "0 8px 32px oklch(0.22 0.018 248 / 0.06)",
                        }}
                      >
                        <p
                          className="text-base font-semibold leading-relaxed"
                          style={{ color: "oklch(0.22 0.018 248)" }}
                        >
                          You&apos;ve worked through this situation and found a clearer way to see it.
                        </p>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "oklch(0.40 0.025 248)" }}
                        >
                          That&apos;s the work.
                        </p>
                        <div className="flex flex-col gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => startNewThoughtThread()}
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-left transition-all"
                            style={{
                              background: "oklch(0.92 0.05 152 / 0.4)",
                              border: "1px solid oklch(0.46 0.12 152 / 0.35)",
                              color: "oklch(0.32 0.09 152)",
                            }}
                          >
                            Explore a different situation →
                          </button>
                          <button
                            type="button"
                            onClick={() => setClarityChoice("not-yet")}
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-left transition-all"
                            style={{
                              background: "oklch(0.96 0.012 310 / 0.4)",
                              border: "1px solid oklch(0.84 0.03 310 / 0.4)",
                              color: "oklch(0.39 0.09 310)",
                            }}
                          >
                            There&apos;s still something here I want to explore →
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </>
              )}


              {/* Insight unlock — available after 2 passes, user-initiated */}
              {analysis && thoughtHistory.length >= 2 && balancedRevealed && !loading && (
                <>
                  {!insightUnlocked ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 }}
                      className="flex items-start gap-4 mb-6"
                    >
                      <div className="mt-2 flex-shrink-0">
                        <span
                          className="block h-2 w-2 rounded-full"
                          style={{ background: "oklch(0.52 0.14 260 / 0.5)" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setInsightUnlocked(true)}
                        className="flex-1 text-left text-sm leading-relaxed pt-0.5 transition-opacity hover:opacity-70"
                        style={{ color: "oklch(0.42 0.08 260)" }}
                      >
                        You&apos;ve explored this from {thoughtHistory.length} angles. See what your thinking reveals →
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="flex items-start gap-4 mb-6"
                    >
                      <div className="mt-2 flex-shrink-0">
                        <span
                          className="block h-3 w-3 rounded-full"
                          style={{ background: "oklch(0.52 0.14 260)" }}
                        />
                      </div>
                      <InsightSummary
                        patternSummaryText={patternSummaryText}
                        emotionSummaryText={emotionSummaryText}
                        beliefDisplay={beliefDisplay}
                        dominantPattern={dominantPattern}
                        dominantEmotion={dominantEmotion}
                      />
                    </motion.div>
                  )}
                </>
              )}
              {!loading && clarityChoice === "not-yet" && (
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
                    {situationAmbiguity ? (
                      /* ── Ambiguous state: thought shown, user picks same or different ── */
                      <div className="space-y-4">
                        <div
                          className="rounded-xl px-4 py-3"
                          style={{
                            background: "oklch(0.96 0.012 310 / 0.5)",
                            border: "1px solid oklch(0.84 0.03 310 / 0.5)",
                          }}
                        >
                          <p
                            className="text-xs font-semibold uppercase tracking-wider mb-1"
                            style={{ color: "oklch(0.46 0.08 310)" }}
                          >
                            You wrote
                          </p>
                          <p
                            className="text-sm leading-relaxed font-medium"
                            style={{ color: "oklch(0.22 0.018 248)" }}
                          >
                            &ldquo;{situationAmbiguity.pendingThought}&rdquo;
                          </p>
                        </div>
                        <p
                          className="text-base font-semibold leading-snug"
                          style={{ color: "oklch(0.22 0.018 248)" }}
                        >
                          What you wrote feels like it might be about a different situation.
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: "oklch(0.40 0.025 248)" }}
                        >
                          How does this feel to you?
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const pending = situationAmbiguity;
                              setSituationAmbiguity(null);
                              processThought(pending.pendingThought, true);
                            }}
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-left transition-all"
                            style={{
                              background: "oklch(0.92 0.05 152 / 0.4)",
                              border: "1px solid oklch(0.46 0.12 152 / 0.35)",
                              color: "oklch(0.32 0.09 152)",
                            }}
                          >
                            It&apos;s still about the same thing →
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const pending = situationAmbiguity;
                              startNewThoughtThread({ threadId: pending.newThreadId });
                              processThought(pending.pendingThought, true, true);
                            }}
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-left transition-all"
                            style={{
                              background: "oklch(0.96 0.012 310 / 0.4)",
                              border: "1px solid oklch(0.84 0.03 310 / 0.4)",
                              color: "oklch(0.39 0.09 310)",
                            }}
                          >
                            This is something different →
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal / analyzing state ── */
                      <>
                        <div>
                          <p
                            className="text-sm font-semibold tracking-wide mb-3"
                            style={{ color: "oklch(0.39 0.09 310)" }}
                          >
                            What else is coming up?
                          </p>

                          {/* Thread situation anchor */}
                          {analysis?.situation && (
                            <div
                              className="mb-4 rounded-xl px-4 py-3"
                              style={{
                                background: "oklch(0.96 0.012 310 / 0.5)",
                                border: "1px solid oklch(0.84 0.03 310 / 0.5)",
                              }}
                            >
                              <p
                                className="text-xs font-semibold uppercase tracking-wider mb-1"
                                style={{ color: "oklch(0.46 0.08 310)" }}
                              >
                                Still exploring
                              </p>
                              <p
                                className="text-sm leading-relaxed"
                                style={{ color: "oklch(0.30 0.06 310)" }}
                              >
                                &ldquo;{analysis.situation}&rdquo;
                              </p>
                            </div>
                          )}

                          <textarea
                            data-ocid="thought_page.next_thought.textarea"
                            value={thought}
                            onChange={(e) => {
                              setThought(e.target.value);
                              if (guidanceMessage) setGuidanceMessage(null);
                              if (validationMessage) setValidationMessage("");
                            }}
                            disabled={isAnalyzingFollowUp}
                            placeholder="What's coming up for you now…"
                            className="h-36 md:h-32 w-full rounded-xl p-4 text-base text-foreground placeholder:text-[oklch(0.70_0.012_248)] focus:outline-none focus:ring-2 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                              background: "oklch(1 0 0)",
                              border: "1.5px solid oklch(0.82 0.03 310 / 0.7)",
                            }}
                          />
                        </div>
                        {/* Inline feedback */}
                        {(guidanceMessage || hint) && !isAnalyzingFollowUp && (
                          <div
                            className="rounded-xl p-4 text-sm"
                            style={{
                              background: "oklch(0.93 0.025 150 / 0.5)",
                              border: "1px solid oklch(0.72 0.06 150 / 0.6)",
                              color: "oklch(0.28 0.08 152)",
                            }}
                          >
                            {(guidanceMessage || hint || "").split("\n\n").map((para, i) => (
                              <p key={i} className={i > 0 ? "mt-2" : ""}>{para}</p>
                            ))}
                          </div>
                        )}
                        <Button
                          data-ocid="thought_page.next_thought.submit_button"
                          onClick={() => processThought()}
                          disabled={isAnalyzingFollowUp || thought.trim().length < 6}
                          className="w-full rounded-full h-11 text-base font-semibold"
                          style={{
                            boxShadow: "0 4px 20px oklch(0.13 0.012 248 / 0.18)",
                          }}
                        >
                          {isAnalyzingFollowUp ? "Analyzing…" : "Go deeper"}
                        </Button>
                      </>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

   
    </div>
  );
}

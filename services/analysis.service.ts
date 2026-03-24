import type {
  BalancedStage,
  FactStoryStage,
  PatternStage,
  RecognitionStage,
} from "@/services/reflectionValidator.service"

export type MergedAnalysis = {
  thought: string | null
  situation: string | null
  story: string | null
  emotions: string[]
  emotion: string
  automaticThought: string | null
  pattern: string | null
  patternExplanation: string | null
  balancedThought: string | null
  steadierWay: string | null
  situationalBelief: string | null
  situationalBeliefConfidence: string | null
  observedAcrossPatterns: string | null
  beliefType: string | null
  whyThisLevel: string | null
  deeperBelief: string | null
  deeperBeliefConfidence: string | null
  deeperBeliefReason: string | null
  reasoningBridge: string | null
  alternativePossibility: string | null
  beliefExample: string | null
  reflectionQuestion: string | null
  normalization: string | null
  coreBelief: string | null
  trigger: string | null
  context: string[]
}

type AnalysisStages = {
  fact_story: FactStoryStage
  recognition: RecognitionStage
  pattern: PatternStage
  balanced: BalancedStage
}

const ensureStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0)
}

export function mergeAnalysisStages(
  stages: AnalysisStages,
  context: string[] = [],
  threadSituation: string | null = null
): MergedAnalysis {
  const { fact_story, recognition, pattern, balanced } = stages

  const emotions = ensureStringArray(fact_story.emotions)
  const finalSituation = threadSituation ?? fact_story.situation ?? null

  return {
    thought: fact_story.thought ?? null,
    situation: finalSituation,
    story: fact_story.story ?? null,
    emotions,
    emotion: emotions[0] ?? "",
    automaticThought: fact_story.story ?? null,
    pattern: pattern.pattern ?? null,
    // patternMessage is the contextual AI message shown to user.
    // Falls back to explanation for backwards compatibility.
    patternExplanation: pattern.patternMessage?.trim() || pattern.explanation?.trim() || null,
    balancedThought: balanced.balancedThought ?? null,
    steadierWay: balanced.steadierWay ?? null,
    situationalBelief: balanced.situationalBelief?.trim() || null,
    situationalBeliefConfidence: balanced.situationalBeliefConfidence ?? null,
    observedAcrossPatterns: balanced.observedAcrossPatterns?.trim() || null,
    beliefType: balanced.beliefType ?? null,
    whyThisLevel: balanced.whyThisLevel?.trim() || null,
    deeperBelief: balanced.deeperBelief?.trim() || null,
    deeperBeliefConfidence: balanced.deeperBeliefConfidence ?? null,
    deeperBeliefReason: balanced.deeperBeliefReason?.trim() || null,
    reasoningBridge: balanced.reasoningBridge?.trim() || null,
    alternativePossibility: balanced.alternativePossibility?.trim() || null,
    beliefExample: balanced.beliefExample?.trim() || null,
    reflectionQuestion: recognition.reflection ?? recognition.prompt ?? null,
    normalization: null,
    coreBelief: balanced.deeperBelief?.trim() || null,
    trigger: null,
    context,
  }
}

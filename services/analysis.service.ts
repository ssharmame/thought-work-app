import type {
  BalancedStage,
  FactStoryStage,
  NextThoughtStage,
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
  suggestions: string[]
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
  next_thought: NextThoughtStage
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
  const { fact_story, recognition, pattern, balanced, next_thought } = stages

  const emotions = ensureStringArray(fact_story.emotions)
  const balancedExists = Boolean(balanced.balancedThought?.trim())
  const suggestions =
    balancedExists && next_thought.suggestions
      ? ensureStringArray(next_thought.suggestions)
      : []
  const coreBelief = next_thought.coreBelief ?? null

  const finalSituation =
    threadSituation ?? fact_story.situation ?? null

  return {
    thought: fact_story.thought ?? null,
    situation: finalSituation,
    story: fact_story.story ?? null,
    emotions,
    emotion: emotions[0] ?? "",
    automaticThought: fact_story.story ?? null,
    pattern: pattern.pattern ?? null,
    patternExplanation: pattern.explanation ?? null,
    balancedThought: balanced.balancedThought ?? null,
    suggestions,
    reflectionQuestion: recognition.prompt ?? null,
    normalization: null,
    coreBelief,
    trigger: null,
    context,
  }
}

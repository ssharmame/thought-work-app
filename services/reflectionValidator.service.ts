import {
  generateFactStoryStage,
  generateRecognitionStage,
  generatePatternStage,
  generateBalancedStage,
  generateNextThoughtStage,
  type RecognitionContext,
  type ThoughtContext,
} from "@/lib/ai"

export type ThoughtStage =
  | FactStoryStage
  | RecognitionStage
  | PatternStage
  | BalancedStage
  | NextThoughtStage

export type FactStoryStage = {
  stage: "fact_story"
  thought: string
  situation: string
  story: string
  emotions: string[]
}

export type RecognitionStage = {
  stage: "recognition"
  prompt: string
  suggestions: string[]
}

export type PatternStage = {
  stage: "pattern"
  pattern: string | null
  explanation: string | null  // kept for backwards compat — maps to patternMessage
  patternMessage?: string | null
}

export type BalancedStage = {
  stage: "balanced"
  balancedThought: string
}

export type NextThoughtStage = {
  stage: "next_thought"
  prompt?: string
  suggestions: string[]
  coreBelief?: string | null
}

function isEmotionArray(emotions: unknown): emotions is string[] {
  return Array.isArray(emotions) && emotions.every((e) => typeof e === "string")
}

function validateFactStory(stage: FactStoryStage) {
  if (!stage.situation?.trim()) return false
  if (!stage.story) return false
  // Story can be a cleaned interpretation and may not reuse exact source tokens.
  // Require semantic structure only: non-empty story and a distinct situation.
  if (stage.story.trim().toLowerCase() === stage.situation.trim().toLowerCase()) {
    return false
  }
  if (!isEmotionArray(stage.emotions)) {
    return false
  }
  return true
}

function validateRecognition(stage: RecognitionStage) {
  if (!stage.prompt) return false
  if (!Array.isArray(stage.suggestions)) return false
  return stage.suggestions.length > 0
}

function validatePattern(stage: PatternStage) {
  if (stage.pattern === null) return true
  if (typeof stage.pattern !== "string") return false
  return true
}

function validateBalanced(stage: BalancedStage) {
  if (!stage.balancedThought) return false
  return true
}

function validateNextThought(stage: NextThoughtStage) {
  if (!Array.isArray(stage.suggestions)) return false
  return stage.suggestions.every((item) => typeof item === "string")
}

export const fallbackFactStoryStage: FactStoryStage = {
  stage: "fact_story",
  thought: "",
  situation: "You described a situation that is still unfolding.",
  story: "Your mind may be interpreting this situation in a discouraging way.",
  emotions: ["uncertainty"],
}

export const fallbackRecognitionStage: RecognitionStage = {
  stage: "recognition",
  prompt:
    "When your mind says this thought, what feels closest to your experience?",
  suggestions: [
    "Maybe I'm assuming the worst",
    "I'm probably overthinking this",
    "I'm worried something went wrong",
    "I'm not sure what it means yet",
  ],
}

export const fallbackPatternStage: PatternStage = {
  stage: "pattern",
  pattern: null,
  explanation: null,
  patternMessage: null,
}

export const fallbackBalancedStage: BalancedStage = {
  stage: "balanced",
  balancedThought:
    "Another way to see this moment could be that the situation is still unfolding.",
}

export const fallbackNextThoughtStage: NextThoughtStage = {
  stage: "next_thought",
  prompt:
    "When your mind keeps going with this situation, what thought shows up next?",
  suggestions: [
    "Maybe I'm scared this says something about my worth",
    "Maybe there's another explanation I haven't considered",
    "Maybe I could take one small step to find out more",
  ],
}

export async function validateFactStoryStage(
  thought: string,
  previousThoughts: string[],
  initial: FactStoryStage
): Promise<FactStoryStage> {
  if (validateFactStory(initial)) {
    return initial
  }

  console.log("fact_story validation failed, retrying generation")

  const retry = await generateFactStoryStage(thought, previousThoughts)

  if (validateFactStory(retry)) {
    return retry
  }

  console.log("fact_story retry failed, returning fallback")

  return {
    ...fallbackFactStoryStage,
    thought,
  }
}

export async function validateRecognitionStage(
  thought: string,
  previousThoughts: string[],
  initial: RecognitionStage,
  context: RecognitionContext
): Promise<RecognitionStage> {
  if (validateRecognition(initial)) {
    return initial
  }

  console.log("recognition validation failed, retrying")

  const retry = await generateRecognitionStage(context)

  if (validateRecognition(retry)) {
    return retry
  }

  console.log("recognition retry failed, returning fallback")

  return { ...fallbackRecognitionStage }
}

export async function validatePatternStage(
  thought: string,
  previousThoughts: string[],
  initial: PatternStage,
  context: ThoughtContext
): Promise<PatternStage> {
  if (validatePattern(initial)) {
    return initial
  }

  console.log("pattern validation failed, retrying")

  const retry = await generatePatternStage(context)

  if (validatePattern(retry)) {
    return retry
  }

  console.log("pattern retry failed, returning fallback")

  return { ...fallbackPatternStage }
}

export async function validateBalancedStage(
  thought: string,
  previousThoughts: string[],
  initial: BalancedStage,
  context: ThoughtContext
): Promise<BalancedStage> {
  if (validateBalanced(initial)) {
    return initial
  }

  console.log("balanced validation failed, retrying")

  const retry = await generateBalancedStage(context)

  if (validateBalanced(retry)) {
    return retry
  }

  console.log("balanced retry failed, returning fallback")

  return { ...fallbackBalancedStage }
}

export async function validateNextThoughtStage(
  thought: string,
  previousThoughts: string[],
  initial: NextThoughtStage,
  context: ThoughtContext
): Promise<NextThoughtStage> {
  if (validateNextThought(initial)) {
    return initial
  }

  console.log("next_thought validation failed, retrying")

  const retry = await generateNextThoughtStage(context)

  if (validateNextThought(retry)) {
    return retry
  }

  console.log("next_thought retry failed, returning fallback")

  return { ...fallbackNextThoughtStage }
}

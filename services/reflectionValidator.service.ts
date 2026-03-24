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
  reflection: string
  // Backwards compatibility while old payloads may still send prompt.
  prompt?: string
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
  steadierWay: string
  situationalBelief?: string | null
  situationalBeliefConfidence?: "medium" | null
  observedAcrossPatterns?: string | null
  beliefType?: "situational" | null
  whyThisLevel?: string | null
  deeperBelief?: string | null
  deeperBeliefConfidence?: "low" | "strong" | null
  deeperBeliefReason?: string | null
  reasoningBridge?: string | null
  alternativePossibility?: string | null
  beliefExample?: string | null
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
  if (!stage.reflection) return false
  const reflection = stage.reflection.trim()
  if (reflection.length < 8) return false
  return true
}

function validatePattern(stage: PatternStage) {
  if (stage.pattern === null) return true
  if (typeof stage.pattern !== "string") return false
  return true
}

function validateBalanced(stage: BalancedStage) {
  if (!stage.balancedThought) return false
  if (!stage.steadierWay) return false
  if (stage.reasoningBridge !== undefined && stage.reasoningBridge !== null && !stage.reasoningBridge.trim()) {
    return false
  }
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
  emotions: [],
}

export const fallbackRecognitionStage: RecognitionStage = {
  stage: "recognition",
  reflection: "What do you know for certain right now?",
}

function ensureQuestion(prompt: string) {
  const trimmed = prompt.trim()
  if (!trimmed) return "What do you know for certain right now?"
  const lastChar = trimmed[trimmed.length - 1]
  if (lastChar === "?" || lastChar === "." || lastChar === "!") {
    return lastChar === "?" ? trimmed : `${trimmed.slice(0, -1)}?`
  }
  return `${trimmed}?`
}

function normalizePromptForMatch(prompt: string) {
  return prompt
    .toLowerCase()
    .replace(/[?!.\s]+/g, " ")
    .trim()
}

function isGenericRecognitionPrompt(prompt: string) {
  const normalized = normalizePromptForMatch(prompt)
  return (
    normalized === "what do you actually know for certain right now" ||
    normalized === "what do you know for certain right now" ||
    normalized.startsWith("what do you actually know for certain right now ") ||
    normalized.startsWith("what do you know for certain right now ")
  )
}

function contextualRecognitionPrompt(context: RecognitionContext) {
  const story = context.story?.trim()
  if (!story) return fallbackRecognitionStage.reflection
  return `When your mind says "${story}", what fact can you stand on right now?`
}

function normalizeRecognition(
  stage: RecognitionStage & { suggestions?: string[] },
  context: RecognitionContext
): RecognitionStage {
  const rawPrompt =
    typeof stage.reflection === "string"
      ? stage.reflection
      : typeof stage.prompt === "string"
        ? stage.prompt
        : ""
  const isGenericPrompt = isGenericRecognitionPrompt(rawPrompt)
  const promptBase = isGenericPrompt
    ? contextualRecognitionPrompt(context)
    : rawPrompt

  return {
    stage: "recognition",
    reflection: ensureQuestion(promptBase),
  }
}

function buildRecognitionFallback(context: RecognitionContext): RecognitionStage {
  const story = context.story?.trim()
  const contextualPrompt = story
    ? `When your mind says "${story}", what do you know for certain right now?`
    : fallbackRecognitionStage.reflection

  return {
    stage: "recognition",
    reflection: ensureQuestion(contextualPrompt),
  }
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
    "This is hard right now.\nBut the thought I am having might not be the full picture.",
  steadierWay:
    "This is a really heavy situation to be in.\nIt makes sense this feels hard.",
  situationalBelief: null,
  situationalBeliefConfidence: "medium",
  observedAcrossPatterns: null,
  beliefType: "situational",
  whyThisLevel: null,
  deeperBelief: null,
  deeperBeliefConfidence: null,
  deeperBeliefReason: null,
  reasoningBridge: null,
  alternativePossibility: null,
  beliefExample: null,
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
  const normalizedInitial = normalizeRecognition(initial, context)
  if (validateRecognition(normalizedInitial)) {
    return normalizedInitial
  }

  console.log("recognition validation failed, retrying")

  const retry = await generateRecognitionStage(context)
  const normalizedRetry = normalizeRecognition(retry, context)

  if (validateRecognition(normalizedRetry)) {
    return normalizedRetry
  }

  console.log("recognition retry failed, returning fallback")

  return buildRecognitionFallback(context)
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

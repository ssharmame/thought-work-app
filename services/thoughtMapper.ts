import { thoughtAnalysisSchema, type ThoughtAnalysis } from "@/schemas/thought.schema"

export function mapThoughtForPersistence(
  rawAnalysis: unknown,
): ThoughtAnalysis {
  // Validate AI payload using Zod; strips any extra keys via strict schema
  const parsed = thoughtAnalysisSchema.parse(rawAnalysis)
  return parsed
}

export type ThoughtEntryFields = Pick<ThoughtAnalysis, "situation" | "automaticThought" | "story" | "emotion" | "pattern" | "patternExplanation" | "normalization" | "coreBelief" | "reflectionQuestion" | "balancedThought">

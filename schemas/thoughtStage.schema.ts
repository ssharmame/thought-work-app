import { z } from "zod"

export const factStoryStageSchema = z.object({
  stage: z.literal("fact_story"),
  thought: z.string(),
  situation: z.string(),
  story: z.string(),
  emotions: z.array(z.string()),
})

export const recognitionStageSchema = z.object({
  stage: z.literal("recognition"),
  reflection: z.string(),
  prompt: z.string().optional(),
})

export const patternStageSchema = z.object({
  stage: z.literal("pattern"),
  pattern: z.string().nullable(),
  explanation: z.string().nullable(),
})

export const balancedStageSchema = z.object({
  stage: z.literal("balanced"),
  balancedThought: z.string(),
})

export const nextThoughtStageSchema = z.object({
  stage: z.literal("next_thought"),
  prompt: z.string().optional(),
  suggestions: z.array(z.string()),
  coreBelief: z.string().nullable().optional(),
})

export const reflectionCompleteStageSchema = z.object({
  stage: z.literal("reflection_complete"),
  message: z.string(),
})

export const thoughtStageSchema = z.union([
  factStoryStageSchema,
  recognitionStageSchema,
  patternStageSchema,
  balancedStageSchema,
  nextThoughtStageSchema,
  reflectionCompleteStageSchema,
])

export type ThoughtStage = z.infer<typeof thoughtStageSchema>

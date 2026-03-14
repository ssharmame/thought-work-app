import { z } from "zod"

// Schema to validate AI analysis output before saving to Prisma.
export const thoughtAnalysisSchema = z.object({
  situation: z.string(),
  automaticThought: z.string(),
  story: z.string(),
  emotion: z.string(),
  pattern: z.string().nullable().optional(),
  patternExplanation: z.string().nullable().optional(),
  normalization: z.string().nullable().optional(),
  coreBelief: z.string().nullable().optional(),
  reflectionQuestion: z.string(),
  balancedThought: z.string(),
  suggestions: z.array(z.string()).optional(),
})

export type ThoughtAnalysis = z.infer<typeof thoughtAnalysisSchema>

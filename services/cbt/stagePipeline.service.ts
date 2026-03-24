import {
  generateBalancedStage,
  generateFactStoryStage,
  generateNextThoughtStage,
  generatePatternStage,
  generateRecognitionStage,
  generateReflectionCompletion,
  generateStoryEmotionStage,
  validateThoughtSuggestions,
  type ThoughtContext,
} from "@/lib/ai"
import {
  balancedStageSchema,
  factStoryStageSchema,
  nextThoughtStageSchema,
  patternStageSchema,
  recognitionStageSchema,
  reflectionCompleteStageSchema,
  ThoughtStage,
} from "@/schemas/thoughtStage.schema"
import type { MergedAnalysis } from "@/services/analysis.service"
import type { NextThoughtStage } from "@/services/reflectionValidator.service"
import {
  fetchThreadContext,
  updateThreadSituation,
} from "@/services/thought.service"

export async function buildThoughtStages(
  thought: string,
  analysis: MergedAnalysis,
  threadId: string
): Promise<ThoughtStage[]> {
  const thread = await fetchThreadContext(threadId)
  console.log("THREAD SITUATION", thread.situation)
  const previousThoughts = analysis.context ?? []
  const previousPatterns =
    (thread.thoughts ?? [])
      .map((entry) => entry.pattern ?? "")
      .filter((pattern): pattern is string => pattern.trim().length > 0)
  let situation: string | null = thread.situation ?? null
  let story = thought
  let emotions: string[] = []
  const factStoryPayload = await generateFactStoryStage(
    thought,
    previousThoughts,
    thread.situation,
    previousPatterns
  )
  const extractedStory = factStoryPayload.story || thought
  story = extractedStory
  emotions = factStoryPayload.emotions

  if (!thread.situation) {
    situation = factStoryPayload.situation?.trim() || null
    if (situation) {
      await updateThreadSituation(threadId, situation)
      thread.situation = situation
    }
  } else {
    situation = thread.situation
  }

  const storyEmotion = await generateStoryEmotionStage({
    situation: situation ?? thought,
    thought: extractedStory,
    previousThoughts,
    previousPatterns,
  })
  emotions = storyEmotion.emotions

  if (thread.situation) {
    situation = thread.situation
  }

  const factStory = factStoryStageSchema.parse({
    stage: "fact_story",
    thought: analysis.automaticThought || thought,
    situation: thread.situation || situation,
    story,
    emotions,
  })

  const recognitionContext = {
    situation: factStory.situation,
    story: factStory.story,
    emotion: factStory.emotions[0] ?? "",
  }

  const recognition = recognitionStageSchema.parse(
    await generateRecognitionStage(recognitionContext),
  )

  const baseContext: ThoughtContext = {
    situation: factStory.situation,
    interpretation: factStory.story,
    emotion: factStory.emotions[0] ?? "",
  }

  const pattern = patternStageSchema.parse(
    await generatePatternStage(baseContext),
  )

  const contextWithPattern: ThoughtContext = {
    ...baseContext,
    pattern: pattern.pattern,
  }

  const balanced = balancedStageSchema.parse(
    await generateBalancedStage(contextWithPattern),
  )

  const completionDecision = await generateReflectionCompletion({
    situation: factStory.situation,
    story: factStory.story,
    pattern: pattern.pattern,
    balancedThought: balanced.balancedThought,
    thoughtHistory: previousThoughts,
  })

  if (completionDecision === "complete") {
    const reflectionComplete = reflectionCompleteStageSchema.parse({
      stage: "reflection_complete",
      message:
        "You have explored several interpretations of this situation. You may pause here and notice how the balanced perspective feels.",
    })

    return [factStory, recognition, pattern, balanced, reflectionComplete]
  }

  const contextWithBalance: ThoughtContext = {
    ...contextWithPattern,
    balancedThought: balanced.balancedThought,
    previousThoughts,
    previousPatterns,
    historyLength: previousPatterns.length,
    thoughtHistory: previousThoughts,
  }

  const nextThoughtCandidate = await produceValidatedNextThought(
    contextWithBalance
  )

  const nextThought = nextThoughtStageSchema.parse(nextThoughtCandidate)

  return [factStory, recognition, pattern, balanced, nextThought]
}

async function produceValidatedNextThought(
  context: ThoughtContext
): Promise<NextThoughtStage> {
  let attempts = 0
  let history = context.thoughtHistory ?? []
  let lastStage: NextThoughtStage | null = null

  while (attempts < 3) {
    const stage = await generateNextThoughtStage({
      ...context,
      thoughtHistory: history,
    })
    lastStage = stage

    if (!stage.suggestions.length) {
      return stage
    }

    const validation = await validateThoughtSuggestions({
      situation: context.situation,
      suggestions: stage.suggestions,
      pattern: context.pattern ?? null,
    })

    if (validation.valid) {
      return stage
    }

    history = [...history, ...stage.suggestions]
    attempts += 1
  }

  return lastStage ??
    (await generateNextThoughtStage({
      ...context,
      thoughtHistory: history,
    }))
}

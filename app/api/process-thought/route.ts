import {
  classifyInput,
  detectPatternFromText,
  generateFactStoryStage,
  generateRecognitionStage,
  generateStoryEmotionStage,
  generatePatternStage,
  generateBalancedStage,
  generateNextThoughtStage,
  getDistortionProgression,
  inferEmotionFromText,
  type RecognitionContext,
  type ThoughtContext,
} from "@/lib/ai"
import { randomUUID } from "crypto"

import { detectSelfHarm } from "@/services/safety.service"
import { handleClassification } from "@/services/decision.service"

import {
  ensureThreadContext,
  fetchThreadContext,
  saveThoughtReflection,
  updateThreadSituation,
} from "@/services/thought.service"

import { updateThreadInsight } from "@/services/threadInsight.service"

import {
  validateFactStoryStage,
  validateRecognitionStage,
  validatePatternStage,
  validateBalancedStage,
  validateNextThoughtStage,
  fallbackFactStoryStage,
  fallbackRecognitionStage,
  fallbackPatternStage,
  fallbackBalancedStage,
  fallbackNextThoughtStage,
} from "@/services/reflectionValidator.service"
import {
  factStoryStageSchema,
} from "@/schemas/thoughtStage.schema"

import { mergeAnalysisStages } from "@/services/analysis.service"
import { validateInput } from "@/services/validation.service"

const safetyMessage =
  "I'm really sorry you're feeling this way. You don't have to go through this alone. If you're in immediate danger, please contact local emergency services or a crisis support line."

const fallbackGuidanceMessage =
  "Something went wrong while processing your thought. Please try again."

function createGuidanceResponse(message: string) {
  return {
    status: "guidance",
    valid: false,
    type: "clarification",
    message,
  }
}

type SchemaValidator = Record<
  string,
  (value: unknown) => boolean
>

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isStringArray(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  )
}

function validateAIResponse<T>(
  schema: SchemaValidator,
  data: unknown,
  stageName: string
): data is T {
  if (!data || typeof data !== "object") {
    console.error(`AI PARSE ERROR: ${stageName} returned non-object`, data)
    return false
  }

  const record = data as Record<string, unknown>

  for (const [key, validator] of Object.entries(schema)) {
    if (!validator(record[key])) {
      console.error(
        `AI PARSE ERROR: ${stageName} missing or invalid ${key}`,
        record[key]
      )
      return false
    }
  }

  return true
}

const factStorySchema: SchemaValidator = {
  stage: (value) => value === "fact_story",
  situation: isNonEmptyString,
  story: isNonEmptyString,
  emotions: isStringArray,
}

const recognitionSchema: SchemaValidator = {
  stage: (value) => value === "recognition",
  prompt: isNonEmptyString,
  suggestions: (value) =>
    Array.isArray(value) &&
    (value.length === 0 ||
      value.every((item) => typeof item === "string" && item.trim().length > 0)),
}

const patternSchema: SchemaValidator = {
  stage: (value) => value === "pattern",
  pattern: (value) => value === null || typeof value === "string",
  explanation: (value) => value === null || typeof value === "string",
}

const balancedSchema: SchemaValidator = {
  stage: (value) => value === "balanced",
  balancedThought: isNonEmptyString,
}

const nextThoughtSchema: SchemaValidator = {
  stage: (value) => value === "next_thought",
  prompt: (value) =>
    value === undefined ||
    (typeof value === "string" && value.trim().length > 0),
  suggestions: (value) =>
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0),
  coreBelief: (value) =>
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim().length > 0),
}

const storyEmotionSchema: SchemaValidator = {
  story: isNonEmptyString,
  emotions: isStringArray,
}

async function safeGenerateStage<T>(
  generator: () => Promise<T>,
  fallback: () => T,
  schema: SchemaValidator,
  stageName: string
): Promise<T> {
  try {
    const response = await generator()
    // Protect the pipeline from malformed AI payloads by validating each stage.
    if (!validateAIResponse<T>(schema, response, stageName)) {
      return fallback()
    }
    return response
  } catch (error) {
    // Any AI/network failure should degrade gracefully to stage-specific fallback data.
    console.error(`${stageName} stage error`, error)
    return fallback()
  }
}

async function runClassificationWithRetry(text: string) {
  let lastError: unknown

  // Classification is cheap but critical for routing, so we retry once before failing.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await classifyInput(text)
    } catch (error) {
      lastError = error
      console.error("classification attempt failed", attempt + 1, error)
    }
  }

  throw lastError ?? new Error("classification failed")
}

export async function POST(req: Request) {
  try {
    const { thought, visitorId, sessionId, threadId, threadTitle } =
      await req.json()

    if (!thought || !visitorId || !sessionId) {
      return Response.json(
        createGuidanceResponse("Missing context identifiers"),
        { status: 400 }
      )
    }

    const normalizedThought = thought.trim()

    if (detectSelfHarm(normalizedThought)) {
      return Response.json({
        status: "safety",
        valid: false,
        type: "clarification",
        message: safetyMessage,
      })
    }

    const validation = validateInput(normalizedThought)

    if (!validation.valid) {
      return Response.json(
        createGuidanceResponse(validation.message ?? fallbackGuidanceMessage)
      )
    }

    let classification

    try {
      classification = await runClassificationWithRetry(normalizedThought)
    } catch (error) {
      console.error("intent classification failed", error)

      return Response.json(createGuidanceResponse(fallbackGuidanceMessage), {
        status: 500,
      })
    }

    const decision = handleClassification(classification.type, normalizedThought)

    if (decision.status === "guidance") {
      return Response.json(createGuidanceResponse(decision.message))
    }

    if (decision.status === "safety") {
      return Response.json({
        status: "safety",
        valid: false,
        type: "clarification",
        message: decision.message,
      })
    }
 console.log("classification", classification);
    const classificationValid =
      classification.valid ?? classification.type === "THOUGHT"

    if (!classificationValid) {
      return Response.json(
        createGuidanceResponse(
          "Please describe what your mind is telling you about the situation."
        )
      )
    }

    // Thread lifecycle is explicit: no threadId -> create new thread, else continue existing thread.
    const requestedThreadId =
      typeof threadId === "string" && threadId.trim().length > 0
        ? threadId.trim()
        : null
    const threadIdForAnalysis = requestedThreadId ?? randomUUID()

    // Ensure visitor/session/thread rows exist before reading or writing analysis output.
    await ensureThreadContext({
      visitorId,
      sessionId,
      threadId: threadIdForAnalysis,
      threadTitle,
    })

    const threadContext = await fetchThreadContext(threadIdForAnalysis)
    const originalThreadHistory = threadContext.thoughts ?? []
    const existingSituation =
      threadContext.situation?.trim().length ? threadContext.situation!.trim() : null
    let threadSituation = existingSituation
    const effectiveThreadHistory = originalThreadHistory
    const previousPatterns = effectiveThreadHistory
      .map((entry) => entry.pattern?.trim())
      .filter((pattern): pattern is string => Boolean(pattern))
    const isExistingThread = effectiveThreadHistory.length > 0

    const previousPattern =
      effectiveThreadHistory.length > 0
        ? effectiveThreadHistory[effectiveThreadHistory.length - 1].pattern?.trim() ?? null
        : null

    const previousThoughts = effectiveThreadHistory
      .map(
        (entry) =>
          entry.story?.trim() ||
          entry.automaticThought?.trim() ||
          entry.thought?.trim() ||
          ""
      )
      .filter((item): item is string => item.length > 0)

    try {
      /* -----------------------------
       FACT vs STORY
      -----------------------------*/

      let situation = threadSituation
      let story = normalizedThought
      let emotions: string[] = []
      const generatedFactStory = await safeGenerateStage(
        () =>
          generateFactStoryStage(
            normalizedThought,
            previousThoughts,
            threadSituation,
            previousPatterns
          ),
        () => ({ ...fallbackFactStoryStage, thought: normalizedThought }),
        factStorySchema,
        "fact_story"
      )

      const validatedFactStory = isExistingThread
        ? generatedFactStory
        : await validateFactStoryStage(
            normalizedThought,
            previousThoughts,
            generatedFactStory
          )

      const extractedStory = validatedFactStory.story || normalizedThought
      story = extractedStory
      emotions = validatedFactStory.emotions

      if (!threadSituation) {
        situation = validatedFactStory.situation?.trim() || normalizedThought
        threadSituation = situation
        if (threadSituation) {
          // Persist situation once so all later passes keep the same event context.
          await updateThreadSituation(threadIdForAnalysis, threadSituation)
        }
      } else {
        situation = threadSituation
      }

      // Emotion detection always runs on the current interpretation text, not raw event text.
      const storyEmotion = await safeGenerateStage(
        () =>
          generateStoryEmotionStage({
            situation: threadSituation ?? situation ?? normalizedThought,
            thought: extractedStory,
            previousThoughts,
            previousPatterns,
          }),
        () => ({
          story: extractedStory,
          emotions: [inferEmotionFromText(extractedStory) ?? "anxiety"],
        }),
        storyEmotionSchema,
        "story_emotion"
      )

      emotions = storyEmotion.emotions

      if (!emotions.length) {
        emotions = [inferEmotionFromText(extractedStory) ?? "anxiety"]
      }

      const currentSituation = threadSituation ?? situation ?? normalizedThought

      const factStory = factStoryStageSchema.parse({
        stage: "fact_story",
        thought: normalizedThought,
        situation: currentSituation,
        story,
        emotions,
      })

      /* -----------------------------
       RECOGNITION
      ------------------------------*/

      const recognitionContext: RecognitionContext = {
        situation: factStory.situation,
        story: factStory.story,
        emotion: factStory.emotions?.[0]?.trim() || "uncertainty",
      }

      const recognition = await validateRecognitionStage(
        normalizedThought,
        previousThoughts,
        await safeGenerateStage(
          () => generateRecognitionStage(recognitionContext),
          () => ({ ...fallbackRecognitionStage }),
          recognitionSchema,
          "recognition"
        ),
        recognitionContext
      )

      /* -----------------------------
       PATTERN
      ------------------------------*/

      const baseContext: ThoughtContext = {
        situation: currentSituation,
        interpretation: story,
        emotion: factStory.emotions?.[0]?.trim() || "uncertainty",
        previousThoughts,
        previousPatterns,
        historyLength: effectiveThreadHistory.length,
      }

      const pattern = await validatePatternStage(
        normalizedThought,
        previousThoughts,
        await safeGenerateStage(
          () => generatePatternStage(baseContext),
          () => ({ ...fallbackPatternStage }),
          patternSchema,
          "pattern"
        ),
        baseContext
      )

      const contextWithPattern: ThoughtContext = {
        ...baseContext,
        pattern: pattern.pattern,
      }

      /* -----------------------------
       BALANCED PERSPECTIVE
      ------------------------------*/

      const balanced = await validateBalancedStage(
        normalizedThought,
        previousThoughts,
        await safeGenerateStage(
          () => generateBalancedStage(contextWithPattern),
          () => ({ ...fallbackBalancedStage }),
          balancedSchema,
          "balanced"
        ),
        contextWithPattern
      )

      /* -----------------------------
       NEXT THOUGHT
      ------------------------------*/

      const contextWithBalance: ThoughtContext = {
        ...contextWithPattern,
        balancedThought: balanced.balancedThought,
        previousThoughts,
        previousPatterns,
        historyLength: effectiveThreadHistory.length,
        thoughtHistory: previousThoughts,
      }

      const nextThought = await validateNextThoughtStage(
        normalizedThought,
        previousThoughts,
        await safeGenerateStage(
          () => generateNextThoughtStage(contextWithBalance),
          () => ({ ...fallbackNextThoughtStage }),
          nextThoughtSchema,
          "next_thought"
        ),
        contextWithBalance
      )

      const suggestionCandidates = Array.isArray(nextThought.suggestions)
        ? nextThought.suggestions
        : []
      const balancedExists = Boolean(balanced.balancedThought?.trim())
      let filteredSuggestions = suggestionCandidates

      const progressionTargets = getDistortionProgression(previousPattern)
      const normalizedTargets = progressionTargets?.map((value) =>
        value.toLowerCase()
      )

      // Keep suggestions aligned with expected CBT progression when we have a prior pattern.
      if (normalizedTargets?.length) {
        const matched = suggestionCandidates.filter((suggestion) => {
          const detectedPattern = detectPatternFromText(suggestion)
          return (
            detectedPattern &&
            normalizedTargets.includes(detectedPattern.trim().toLowerCase())
          )
        })
        if (matched.length > 0) {
          filteredSuggestions = matched
        }
      }

      const nextThoughtWithSuggestions = balancedExists
        ? { ...nextThought, suggestions: filteredSuggestions }
        : { ...nextThought, suggestions: [] }

      // Flatten stage outputs into the stable API response shape consumed by the UI.
      const analysis = mergeAnalysisStages(
        {
          fact_story: factStory,
          recognition,
          pattern,
          balanced,
          next_thought: nextThoughtWithSuggestions,
        },
        previousThoughts,
        threadSituation
      )

      /* -----------------------------
       SAVE REFLECTION
      ------------------------------*/

      await saveThoughtReflection({
        thought: normalizedThought,
        intent: classification.type,
        status: "REFLECTION_COMPLETE",
        threadId: threadIdForAnalysis,
        sessionId,
        visitorId,
        analysis: {
          situation: analysis.situation ?? "",
          automaticThought: analysis.automaticThought ?? "",
          story: analysis.story ?? "",
          emotion: analysis.emotion ?? "",
          pattern: analysis.pattern,
          patternExplanation: analysis.patternExplanation,
          normalization: analysis.normalization,
          coreBelief: analysis.coreBelief ?? "",
          reflectionQuestion: analysis.reflectionQuestion ?? "",
          balancedThought: analysis.balancedThought ?? "",
        },
      })

      /* -----------------------------
       THREAD INSIGHT
      ------------------------------*/

      const insight = await updateThreadInsight(threadIdForAnalysis)

      return Response.json({
        status: "success",
        valid: true,
        type: "analysis",
        context: previousThoughts,
        analysis,

        stages: {
          factStory,
          recognition,
          pattern,
          balanced,
          nextThought: nextThoughtWithSuggestions,
        },

        threadInsights: insight,
        threadReset: false,
        threadId: threadIdForAnalysis,
      })
    } catch (error) {
      console.error("AI pipeline error", error)

      return Response.json(
        createGuidanceResponse(fallbackGuidanceMessage),
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("/api/process-thought error", error)

    return Response.json(createGuidanceResponse(fallbackGuidanceMessage), {
      status: 500,
    })
  }
}

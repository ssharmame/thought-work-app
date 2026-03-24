import {
  classifyInput,
  classifySituationContinuity,
  generateFactStoryStage,
  generateRecognitionStage,
  generateStoryEmotionStage,
  generatePatternStage,
  generateBalancedStage,
  type RecognitionContext,
  type ThoughtContext,
} from "@/lib/ai"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"

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
  fallbackFactStoryStage,
  fallbackRecognitionStage,
  fallbackPatternStage,
  fallbackBalancedStage,
} from "@/services/reflectionValidator.service"
import {
  factStoryStageSchema,
} from "@/schemas/thoughtStage.schema"

import { mergeAnalysisStages } from "@/services/analysis.service"
import { validateInput } from "@/services/validation.service"

const safetyMessage =
  "I'm really sorry you're feeling this way. You don't have to go through this alone. If you're in immediate danger, please contact local emergency services or a crisis support line."

const fallbackGuidanceMessage =
  "Something went wrong on our end. Please try again."

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
  reflection: isNonEmptyString,
  prompt: (value) => value === undefined || isNonEmptyString(value),
}

const patternSchema: SchemaValidator = {
  stage: (value) => value === "pattern",
  pattern: (value) => value === null || typeof value === "string",
  // Accept either patternMessage (new) or explanation (legacy)
  patternMessage: (value) => value === undefined || value === null || typeof value === "string",
  explanation: (value) => value === undefined || value === null || typeof value === "string",
}

const balancedSchema: SchemaValidator = {
  stage: (value) => value === "balanced",
  balancedThought: isNonEmptyString,
  steadierWay: isNonEmptyString,
  situationalBelief: (value) => value === undefined || value === null || isNonEmptyString(value),
  situationalBeliefConfidence: (value) =>
    value === undefined || value === null || value === "medium",
  observedAcrossPatterns: (value) => value === undefined || value === null || isNonEmptyString(value),
  beliefType: (value) => value === undefined || value === null || value === "situational",
  whyThisLevel: (value) => value === undefined || value === null || isNonEmptyString(value),
  deeperBelief: (value) => value === undefined || value === null || isNonEmptyString(value),
  deeperBeliefConfidence: (value) =>
    value === undefined || value === null || value === "low" || value === "strong",
  deeperBeliefReason: (value) => value === undefined || value === null || isNonEmptyString(value),
  reasoningBridge: (value) => value === undefined || value === null || isNonEmptyString(value),
  alternativePossibility: (value) => value === undefined || value === null || isNonEmptyString(value),
  beliefExample: (value) => value === undefined || value === null || isNonEmptyString(value),
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

async function runClassificationWithRetry(text: string, situation?: string | null) {
  let lastError: unknown

  // Classification is cheap but critical for routing, so we retry once before failing.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await classifyInput(text, situation)
    } catch (error) {
      lastError = error
      console.error("classification attempt failed", attempt + 1, error)
    }
  }

  throw lastError ?? new Error("classification failed")
}

export async function POST(req: Request) {
  try {
    const { thought, visitorId, sessionId, threadId, threadTitle, forceSameThread } =
      await req.json()

    if (!thought || !visitorId || !sessionId) {
      return Response.json(
        createGuidanceResponse("Missing context identifiers"),
        { status: 400 }
      )
    }

    // Resolve authenticated userId if available — used to associate thoughts with
    // a real user account (practitioners can then see their clients' patterns).
    // Falls back to null for anonymous/unauthenticated sessions.
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch {
      // Auth check failure is non-fatal — continue anonymously
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

    // Pre-fetch existing situation when a threadId is present so the classifier
    // has context for short follow-up inputs like "what about cameras?"
    const requestedThreadIdEarly =
      typeof threadId === "string" && threadId.trim().length > 0
        ? threadId.trim()
        : null
    let earlyThreadSituation: string | null = null
    if (requestedThreadIdEarly) {
      try {
        const earlyContext = await fetchThreadContext(requestedThreadIdEarly)
        earlyThreadSituation = earlyContext.situation?.trim() || null
      } catch {
        // If early fetch fails, proceed without context — not critical
      }
    }

    let classification

    try {
      classification = await runClassificationWithRetry(normalizedThought, earlyThreadSituation)
    } catch (error) {
      console.error("intent classification failed", error)

      return Response.json(createGuidanceResponse(fallbackGuidanceMessage), {
        status: 500,
      })
    }

    const decision = await handleClassification(
      classification.type,
      normalizedThought,
      classification.valid,
      earlyThreadSituation
    )

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
          "Can you share a bit more? Tell us the worry or fear underneath — what's your mind telling you?"
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
      userId,
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

    // Situation continuity check — only runs when there's an existing situation to compare against.
    // If the user's new thought is about a completely different situation, we surface the ambiguity
    // to the frontend (threadReset: true + new threadId) rather than silently mixing situations.
    let isNewSituation = false
    let analysisThreadId = threadIdForAnalysis

    // Skip continuity check when the user has explicitly confirmed it's the same thread
    // (i.e. they already saw the ambiguity card and chose "It's still about the same thing")
    if (!forceSameThread && isExistingThread && existingSituation && previousThoughts.length >= 1) {
      try {
        const continuity = await classifySituationContinuity({
          situation: existingSituation,
          thought: normalizedThought,
          threadHistory: previousThoughts,
        })
        isNewSituation = !continuity.sameSituation
      } catch {
        // Classification failure → assume same situation, don't disrupt the user
        isNewSituation = false
      }
    }

    // If a new situation is detected, create a fresh thread so analysis is saved separately.
    if (isNewSituation) {
      analysisThreadId = randomUUID()
      await ensureThreadContext({
        visitorId,
        sessionId,
        threadId: analysisThreadId,
        threadTitle: normalizedThought.slice(0, 80),
      })
      // Reset situation context so the new thread extracts its own situation
      threadSituation = null
    }

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
          await updateThreadSituation(analysisThreadId, threadSituation)
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
          emotions: [],
        }),
        storyEmotionSchema,
        "story_emotion"
      )

      emotions = storyEmotion.emotions

      if (!emotions.length) {
        emotions = []
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
        emotion: factStory.emotions?.[0]?.trim() || "",
        previousThoughts,
        previousPatterns,
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
        originalThought: normalizedThought,
        emotion: factStory.emotions?.[0]?.trim() || "",
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

      // Flatten stage outputs into the stable API response shape consumed by the UI.
      const analysis = mergeAnalysisStages(
        {
          fact_story: factStory,
          recognition,
          pattern,
          balanced,
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
        threadId: analysisThreadId,
        sessionId,
        visitorId,
        userId,
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

      const insight = await updateThreadInsight(analysisThreadId)

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
        },

        threadInsights: insight,
        threadReset: isNewSituation,
        threadId: analysisThreadId,
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

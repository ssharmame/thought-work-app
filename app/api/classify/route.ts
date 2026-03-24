import { classifyInput, classifySituationContinuity } from "@/lib/ai"
import { detectSelfHarm } from "@/services/safety.service"
import { handleClassification } from "@/services/decision.service"
import { validateInput } from "@/services/validation.service"

const safetyMessage =
  "I'm really sorry you're feeling this way. You don't have to go through this alone. If you're in immediate danger, please contact local emergency services or a crisis support line."

const fallbackGuidanceMessage =
  "Something went wrong while classifying your thought. Please try again."

/**
 * POST /api/classify
 *
 * Lightweight pre-classification step. Runs safety checks, input validation,
 * and AI intent classification — without executing any analysis pipeline.
 *
 * The tool page calls this first so it knows whether to:
 *   - "continue" → show acknowledgement + fire /api/process-thought
 *   - "guidance"  → show guidance message inline, no acknowledgement
 *   - "safety"    → show safety message, no acknowledgement
 *
 * This keeps /api/acknowledge from appearing on non-thought inputs.
 */
export async function POST(req: Request) {
  try {
    const { thought, situation, previousThoughts } = await req.json()

    if (!thought || typeof thought !== "string") {
      return Response.json({
        status: "guidance",
        message: "Please share a thought to continue.",
      })
    }

    const normalizedThought = thought.trim()

    // Safety gate — same check as process-thought
    if (detectSelfHarm(normalizedThought)) {
      return Response.json({
        status: "safety",
        message: safetyMessage,
      })
    }

    // Length / content validation — same check as process-thought
    const validation = validateInput(normalizedThought)
    if (!validation.valid) {
      return Response.json({
        status: "guidance",
        message: validation.message ?? fallbackGuidanceMessage,
      })
    }

    // AI classification with one retry (cheap but critical for routing)
    let classification: Awaited<ReturnType<typeof classifyInput>> | undefined

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        classification = await classifyInput(normalizedThought, situation)
        break
      } catch (error) {
        console.error(`classify: attempt ${attempt + 1} failed`, error)
        if (attempt === 1) {
          return Response.json(
            { status: "guidance", message: fallbackGuidanceMessage },
            { status: 500 }
          )
        }
      }
    }

    if (!classification) {
      return Response.json(
        { status: "guidance", message: fallbackGuidanceMessage },
        { status: 500 }
      )
    }

    // Route the classification type — mirrors process-thought decision logic
    const decision = await handleClassification(
      classification.type,
      normalizedThought,
      classification.valid,
      situation
    )

    if (decision.status === "guidance") {
      return Response.json({ status: "guidance", message: decision.message })
    }

    if (decision.status === "safety") {
      return Response.json({ status: "safety", message: decision.message })
    }

    // Final validity check — mirrors the explicit check in process-thought
    const classificationValid =
      classification.valid ?? classification.type === "THOUGHT"

    if (!classificationValid) {
      return Response.json({
        status: "guidance",
        message:
          "Please describe what your mind is telling you about the situation.",
      })
    }

    // Continuity check — runs only when thread context is provided (2nd+ thought in a thread).
    // If the new thought is about a different situation, return early before any analysis runs.
    // The frontend will show the ambiguity card and only call process-thought after the user decides.
    if (
      typeof situation === "string" &&
      situation.trim().length > 0 &&
      Array.isArray(previousThoughts) &&
      previousThoughts.length >= 1
    ) {
      try {
        const continuity = await classifySituationContinuity({
          situation: situation.trim(),
          thought: normalizedThought,
          threadHistory: previousThoughts,
        })
        if (!continuity.sameSituation) {
          return Response.json({ status: "different_situation" })
        }
      } catch {
        // Continuity check failed — proceed normally, don't block the user
      }
    }

    return Response.json({ status: "continue" })
  } catch (error) {
    console.error("/api/classify error", error)
    return Response.json(
      { status: "guidance", message: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}

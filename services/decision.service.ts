import { classifyThoughtIntent } from "@/lib/ai"

export type DecisionResult =
  | { status: "continue" }
  | { status: "guidance"; message: string }
  | { status: "safety"; message: string }

const safetyMessage =
  "I'm really sorry you're feeling this way. You don't have to go through this alone. If you're in immediate danger, please contact local emergency services or a crisis support line."

export async function handleClassification(
  type: string,
  text: string,
  valid: boolean,
  situation?: string | null
): Promise<DecisionResult> {
  const normalized = (type || "").toUpperCase().trim()
  switch (normalized) {
    case "THOUGHT": {
      const thoughtIntent = await classifyThoughtIntent(text, situation)
      if (thoughtIntent.shouldRunReflection && thoughtIntent.hasContext !== false) {
        return { status: "continue" }
      }
      return {
        status: "guidance",
        message:
          thoughtIntent.message ||
          (thoughtIntent.hasContext === false
            ? "That sounds like a heavy thought to carry. Sometimes thoughts like this come from something that happened recently. Was there a moment or situation that brought this up for you?"
            : "Got it. What feels like the main worry behind this?"),
      }
    }
    case "SELF_HARM_RISK":
      return { status: "safety", message: safetyMessage }
    case "SOLUTION_SEEKING":
      if (valid) {
        const thoughtIntent = await classifyThoughtIntent(text, situation)
        if (thoughtIntent.shouldRunReflection && thoughtIntent.hasContext !== false) {
          return { status: "continue" }
        }
        return {
          status: "guidance",
          message:
            thoughtIntent.message ||
            (thoughtIntent.hasContext === false
              ? "That sounds like a heavy thought to carry. Sometimes thoughts like this come from something that happened recently. Was there a moment or situation that brought this up for you?"
              : "Got it. What feels like the main worry behind this?"),
        }
      }
      return {
        status: "guidance",
        message:
          "It makes sense to want a solution here.\n\nBefore we jump to that, can we look at what's been going through your mind about it?",
      }
    case "SITUATION":
      return {
        status: "guidance",
        message:
          "That sounds really stressful to sit with.\n\nWhen you think about this, what's the main worry that comes up?",
      }
    case "EMOTIONAL_EXPRESSION":
      return {
        status: "guidance",
        message:
          "That feeling makes sense.\n\nUsually there's a worry underneath — what feels like the biggest concern here?",
      }
    case "GENERAL_QUESTION":
      if (situation?.trim()) {
        return {
          status: "guidance",
          message:
            "I notice your mind is finding another way this could go wrong. Right now, what do you know for sure?",
        }
      }
      return {
        status: "guidance",
        message:
          "We can look at this together — is there something in your own life that's been worrying you lately?",
      }
    default:
      return {
        status: "guidance",
        message:
          "It might help to focus on the worry underneath — something like 'maybe I'm not good enough' or 'what if this goes wrong?' Do any of these feel close?",
      }
  }
}

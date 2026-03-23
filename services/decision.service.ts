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
            : "Got it. What are you most worried this means?"),
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
              : "Got it. What are you most worried this means?"),
        }
      }
      return {
        status: "guidance",
        message:
          "It makes sense to want a solution here.\n\nBefore we get there, can we look at what your mind is saying about this?",
      }
    case "SITUATION":
      return {
        status: "guidance",
        message:
          "That sounds really stressful to sit with.\n\nWhen you think about this, what does your mind say it means?",
      }
    case "EMOTIONAL_EXPRESSION":
      return {
        status: "guidance",
        message:
          "That feeling makes sense.\n\nOften there's a specific worry underneath — what are you most afraid might be true here?",
      }
    case "GENERAL_QUESTION":
      return {
        status: "guidance",
        message:
          "We can look at this together — is there something in your own situation that's been worrying you lately?",
      }
    default:
      return {
        status: "guidance",
        message:
          "It might help to focus on the worry underneath — something like 'maybe I'm not good enough' or 'what if this goes wrong?'",
      }
  }
}

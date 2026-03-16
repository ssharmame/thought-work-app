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
  valid: boolean
): Promise<DecisionResult> {
  const normalized = (type || "").toUpperCase().trim()
  switch (normalized) {
    case "THOUGHT": {
      const thoughtIntent = await classifyThoughtIntent(text)
      if (thoughtIntent.shouldRunReflection) {
        return { status: "continue" }
      }
      return {
        status: "guidance",
        message:
          thoughtIntent.message ||
          "When this happened, did any worrying thought or concern come to mind?",
      }
    }
    case "SELF_HARM_RISK":
      return { status: "safety", message: safetyMessage }
    case "SOLUTION_SEEKING":
      if (valid) {
        const thoughtIntent = await classifyThoughtIntent(text)
        if (thoughtIntent.shouldRunReflection) {
          return { status: "continue" }
        }
        return {
          status: "guidance",
          message:
            thoughtIntent.message ||
            "When this happened, did any worrying thought or concern come to mind?",
        }
      }
      return {
        status: "guidance",
        message:
          "ThoughtLens focuses on understanding the thought behind a situation rather than giving advice. What thought or concern is on your mind right now?",
      }
    case "SITUATION":
      return {
        status: "guidance",
        message:
          "You described a situation. What thought or interpretation did your mind create about it?",
      }
    case "EMOTIONAL_EXPRESSION":
      return {
        status: "guidance",
        message:
          "I hear that you're feeling this way. What thought might be contributing to that feeling?",
      }
    case "GENERAL_QUESTION":
      return {
        status: "guidance",
        message:
          "This tool works best when you share a thought or interpretation about something happening in your life.",
      }
    default:
      return {
        status: "guidance",
        message:
          "We couldn't identify a clear thought. Try describing what your mind is making of the situation.",
      }
  }
}

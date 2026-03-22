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
          "What you wrote describes a situation rather than a thought about it.\n\nThoughtLens works with the story your mind creates — not the situation itself.\n\nWhat did your mind tell you this means?",
      }
    case "EMOTIONAL_EXPRESSION":
      return {
        status: "guidance",
        message:
          "What you wrote describes how you're feeling rather than the thought behind it.\n\nEmotions are real — but they're usually triggered by a specific thought.\n\nWhat is your mind telling you that's making you feel this way?",
      }
    case "GENERAL_QUESTION":
      return {
        status: "guidance",
        message:
          "ThoughtLens works with personal thoughts — the interpretations and conclusions your mind draws about your own life.\n\nWhat is your mind telling you about a situation you're in?",
      }
    default:
      return {
        status: "guidance",
        message:
          "We couldn't quite identify a clear thought here.\n\nTry describing what your mind is making of the situation — not just what happened, but what you concluded from it.",
      }
  }
}

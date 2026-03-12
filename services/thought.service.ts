import {
  analyzeThought,
  classifyInput,
  generateSuggestions,
} from "@/lib/ai"
import { clarificationQuestions } from "@/lib/clarification"
import { updateThreadInsight } from "@/services/threadInsight.service"
import {
  createThoughtEntry,
  getRecentThoughtsForSession,
  upsertSession,
  upsertThread,
  upsertVisitor
} from "@/repositories/thought.repositories"

type ThoughtPayload = {
  thought: string
  visitorId: string
  sessionId: string
  threadId: string
  threadTitle?: string
}

export async function processAndStoreThought(payload: ThoughtPayload) {
  const { thought, visitorId, sessionId, threadId, threadTitle } = payload

  const classification = await classifyInput(thought)
  const classificationType = (classification?.type ?? "").toUpperCase().trim()

  if (classificationType === "SOLUTION_SEEKING") {
    return {
      type: "clarification",
      message:
        "It sounds like you're looking for a solution. Before jumping to solutions, let's understand the situation more clearly.",
      questions: clarificationQuestions,
      valid: true,
    }
  }

  if (classificationType === "SITUATION") {
    return {
      type: "clarification",
      message:
        "Thank you for sharing the situation. What thought did your mind jump to when this happened?",
      questions: [
        "What did you think might happen?",
        "What meaning did your mind give to this situation?",
        "What worried you the most?",
      ],
      valid: true,
    }
  }

  if (classificationType === "INVALID" || classificationType === "") {
    return {
      valid: false,
      message: "Please describe a real situation or thought that is bothering you right now.",
      situation: "",
      fact: "",
      story: "",
      emotion: "",
      pattern: "",
      patternExplanation: "",
      normalization: "",
      reflectionQuestion: "",
      balancedThought: "",
      suggestions: [],
    }
  }

  await upsertVisitor(visitorId)
  await upsertSession(sessionId, visitorId)
  await upsertThread(threadId, sessionId, visitorId, threadTitle)

  const recentThoughts = await getRecentThoughtsForSession(sessionId)
  const previousThoughts = recentThoughts.map((entry) => entry.thought)

  const analysis = await analyzeThought(thought, previousThoughts)
  const suggestionsResponse = await generateSuggestions({
    situation: analysis.situation,
    automaticThought: analysis.automaticThought,
    emotion: analysis.emotion,
    pattern: analysis.pattern,
    previousThoughts,
  })

  const {
    situation,
    fact,
    automaticThought,
    story,
    emotion,
    pattern,
    patternExplanation,
    normalization,
    trigger,
    coreBelief,
    reflectionQuestion,
    balancedThought,
  } = analysis

  const cleanThought = String(thought)
  await createThoughtEntry({
    thought: cleanThought,
    situation,
    automaticThought,
    fact,
    story,
    emotion,
    coreBelief,
    reflectionQuestion,
    balancedThought,
    pattern,
    patternExplanation,
    thread: { connect: { id: threadId } },
    session: { connect: { id: sessionId } },
    visitor: { connect: { id: visitorId } },
  })

  const insight = await updateThreadInsight(threadId)

  const analysisPayload = {
    situation: String(situation ?? ""),
    fact: String(fact ?? ""),
    automaticThought: String(automaticThought ?? ""),
    story: String(story ?? ""),
    emotion: String(emotion ?? ""),
    pattern: String(pattern ?? ""),
    patternExplanation: String(patternExplanation ?? ""),
    normalization: String(normalization ?? ""),
    trigger: String(trigger ?? ""),
    coreBelief: String(coreBelief ?? ""),
    reflectionQuestion: String(reflectionQuestion ?? ""),
    balancedThought: String(balancedThought ?? ""),
  }

  const fallbackSuggestions = [
    "Maybe I'm overthinking this situation",
    "I'm worried something went wrong",
    "I'm unsure what this means",
    "I keep circling back to this thought",
  ]
  const suggestions = Array.isArray(suggestionsResponse?.suggestions)
    ? suggestionsResponse.suggestions.filter(Boolean)
    : []
  const finalSuggestions = suggestions.length ? suggestions : fallbackSuggestions

  return {
    valid: true,
    type: "analysis",
    message: "",
    context: previousThoughts,
    analysis: analysisPayload,
    suggestions: finalSuggestions,
    insight,
    threadInsights: insight,
    ...analysisPayload,
  }
}

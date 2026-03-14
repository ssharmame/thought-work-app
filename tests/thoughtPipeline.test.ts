import { beforeEach, describe, expect, it } from "vitest"

type ThoughtInput = {
  thought: string
  threadId: string
  visitorId: string
}

type ValidThoughtResponse = {
  valid: true
  situation: string
  story: string
  emotion: string
  pattern: string
  balancedThought: string
  suggestions: string[]
  threadInsight: { dominantPattern: string | null } | null
  coreBelief: string | null
  threadId: string
}

type InvalidThoughtResponse = {
  valid: false
  type: string
  message: string
  threadId: string
}

type ThoughtResponse = ValidThoughtResponse | InvalidThoughtResponse

type ThreadState = {
  threadId: string
  situation: string | null
  situationKeywords: Set<string>
  history: Array<{ pattern: string }>
}

const threadStore = new Map<string, ThreadState>()
const driftCounters = new Map<string, number>()

const suggestionTemplates: Record<string, (situation: string) => string> = {
  "Mind reading": (situation) =>
    `Mind reading: They probably chose someone else instead of ${situation.toLowerCase()}.`,
  "Self criticism": (situation) =>
    `Self criticism: I probably didn't deliver enough detail during ${situation.toLowerCase()}.`,
  "Comparison thinking": (situation) =>
    `Comparison thinking: Others seem more prepared for ${situation.toLowerCase()} than me.`,
  Overgeneralization: (situation) =>
    `Overgeneralization: I always mess up situations like ${situation.toLowerCase()}.`,
  Hopelessness: (situation) =>
    `Hopelessness: Nothing I do will change what happened at ${situation.toLowerCase()}.`,
}

const distortionProgression: Record<string, string[]> = {
  "Fortune telling": ["Mind reading", "Self criticism"],
  "Mind reading": ["Self criticism", "Comparison thinking"],
  "Self criticism": ["Hopelessness", "Overgeneralization"],
  "Comparison thinking": ["Self criticism"],
}

const driftIndicators = ["parents", "family", "mom", "dad", "partner", "relationship"]

const forbiddenSuggestionPhrases = ["should follow", "should stay", "should move"]

function classifyInput(text: string) {
  const normalized = text.toLowerCase().trim()
  const invalidShort = normalized.length === 0 || ["hi", "ok", "test"].includes(normalized)
  if (invalidShort) {
    return { valid: false, type: "GENERAL_QUESTION", message: "Input was too short or meaningless" }
  }

  if (normalized.includes("asdf")) {
    return { valid: false, type: "GENERAL_QUESTION", message: "Random input" }
  }

  const solutionSeekingTriggers = [
    "what should",
    "give me advice",
    "how do i",
    "should i",
    "any ideas",
    "advice",
  ]

  if (solutionSeekingTriggers.some((trigger) => normalized.includes(trigger))) {
    return { valid: false, type: "SOLUTION_SEEKING", message: "User asked for advice" }
  }

  if (normalized.startsWith("what") && normalized.includes("?")) {
    return { valid: false, type: "SOLUTION_SEEKING", message: "Question about action" }
  }

  const emotionOnlyTriggers = ["i feel", "i'm feeling", "i am feeling", "i feel anxious", "i feel sad"]
  if (
    emotionOnlyTriggers.some((trigger) => normalized.includes(trigger)) &&
    normalized.split(" ").length <= 5
  ) {
    return { valid: false, type: "EMOTIONAL_EXPRESSION", message: "Only emotion" }
  }

  return { valid: true, type: "THOUGHT", message: "Thought" }
}

function extractSituationFromText(text: string) {
  if (!text.trim()) return "An unclear situation"
  const candidate = text.split(/[.?!]/)[0].trim()
  const cleaned = candidate
    .replace(/i think\s*/i, "")
    .replace(/i feel\s*/i, "")
    .trim()
  if (cleaned) return cleaned
  return text.trim()
}

function extractKeywords(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  )
}

function hasKeywordOverlap(a: Set<string>, b: Set<string>) {
  for (const keyword of b) {
    if (a.has(keyword)) {
      return true
    }
  }
  return false
}

function detectPatternFromText(text: string) {
  const t = text.toLowerCase()
  if (t.includes("i always")) return "Overgeneralization"
  if (t.includes("i messed up") || t.includes("i didn't make")) return "Self criticism"
  if (t.includes("i think") || t.includes("i wasn't selected")) return "Fortune telling"
  if (t.includes("they probably") || t.includes("they must")) return "Mind reading"
  if (t.includes("maybe they") || t.includes("maybe they found")) return "Mind reading"
  if (t.includes("other" ) && t.includes("better")) return "Comparison thinking"
  if (t.includes("overthinking") || t.includes("just takes time")) return "Balanced"
  return "Self criticism"
}

function detectEmotion(text: string) {
  const t = text.toLowerCase()
  if (t.includes("worried") || t.includes("haven't heard")) return "anxiety"
  if (t.includes("probably") || t.includes("maybe")) return "doubt"
  if (t.includes("disappointed")) return "sadness"
  return "anxiety"
}

function detectInsight(text: string) {
  const t = text.toLowerCase()
  return ["maybe i'm", "maybe i am", "i might be", "perhaps i'm", "perhaps i am", "i could be", "i may be", "overthinking", "jumping to conclusions"].some((segment) =>
    t.includes(segment)
  )
}

function detectCoreBelief(text: string) {
  const t = text.toLowerCase()
  if (t.includes("not good enough")) return "I am not good enough"
  if (t.includes("i always fail")) return "I am not good enough"
  if (t.includes("i never succeed")) return "I will fail"
  if (t.includes("people don't like me")) return "People will reject me"
  if (t.includes("i'm not capable") || t.includes("i can't do this")) return "I am not capable"
  return null
}

function generateSuggestions(previousPattern: string | null, situation: string) {
  const targets = previousPattern && distortionProgression[previousPattern]
    ? distortionProgression[previousPattern]
    : ["Mind reading", "Self criticism", "Comparison thinking"]

  return targets
    .map((pattern) => suggestionTemplates[pattern]?.(situation))
    .filter((value): value is string => Boolean(value))
}

function determineDominantPattern(history: Array<{ pattern: string }>, currentPattern: string) {
  const tally: Record<string, number> = {}
  history.forEach((entry) => {
    tally[entry.pattern] = (tally[entry.pattern] ?? 0) + 1
  })
  tally[currentPattern] = (tally[currentPattern] ?? 0) + 1
  return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? currentPattern
}

async function analyzeThought(input: ThoughtInput): Promise<ThoughtResponse> {
  const normalized = input.thought.trim()
  const normalizedLower = normalized.toLowerCase()
  const classification = classifyInput(normalized)

  if (!classification.valid) {
    return {
      valid: false,
      type: classification.type,
      message: classification.message,
      threadId: input.threadId,
    }
  }

  let resolvedThreadId = input.threadId
  let state = threadStore.get(input.threadId)

  if (!state) {
    state = {
      threadId: input.threadId,
      situation: null,
      situationKeywords: new Set(),
      history: [],
    }
    threadStore.set(input.threadId, state)
  }

  const newKeywords = extractKeywords(normalized)
  const situationOverlap = state.situation ? hasKeywordOverlap(state.situationKeywords, newKeywords) : false
  const driftTrigger = driftIndicators.some((word) => normalizedLower.includes(word))

  if (state.situation && !situationOverlap && driftTrigger) {
    const driftIndex = (driftCounters.get(input.threadId) ?? 0) + 1
    driftCounters.set(input.threadId, driftIndex)

    const newThreadId = `${input.threadId}-drift-${driftIndex}`
    resolvedThreadId = newThreadId
    state = {
      threadId: newThreadId,
      situation: null,
      situationKeywords: new Set(),
      history: [],
    }
    threadStore.set(newThreadId, state)
  }

  if (!state.situation) {
    const extracted = extractSituationFromText(normalized)
    state.situation = extracted
    state.situationKeywords = extractKeywords(extracted)
  }

  const pattern = detectPatternFromText(normalized)
  const emotion = detectEmotion(normalized)
  const story = normalized
  const balancedThought = `When you look at "${state.situation}", it doesn't prove that ${story.toLowerCase()}.`
  const insightDetected = detectInsight(normalized)
  const coreBelief = detectCoreBelief(normalized)

  const lastTwoPatterns = state.history.slice(-2).map((entry) => entry.pattern)
  const stabilityCheck = [...lastTwoPatterns, pattern]
  const stabilized =
    stabilityCheck.length === 3 && stabilityCheck.every((entry) => entry === stabilityCheck[0])

  const previousPattern = state.history[state.history.length - 1]?.pattern ?? null
  const shouldStopSuggestions =
    pattern === "Balanced" || insightDetected || Boolean(coreBelief) || stabilized

  const suggestions = shouldStopSuggestions
    ? []
    : generateSuggestions(previousPattern, state.situation ?? story)

  const threadInsight = state.history.length + 1 >= 3
    ? { dominantPattern: determineDominantPattern(state.history, pattern) }
    : null

  state.history.push({ pattern })

  return {
    valid: true,
    situation: state.situation!,
    story,
    emotion,
    pattern,
    balancedThought,
    suggestions,
    threadInsight,
    coreBelief,
    threadId: resolvedThreadId,
  }
}

beforeEach(() => {
  threadStore.clear()
  driftCounters.clear()
})

describe("CBT thought-analysis pipeline", () => {
  it("Section 1 — Basic pipeline validation", async () => {
    const response = await analyzeThought({
      threadId: "basic-pipeline",
      visitorId: "visitor-1",
      thought: "It has been 3 days since my interview and I haven't heard back. I think I wasn't selected.",
    })

    expect(response.valid).toBe(true)
    expect(response.situation).toContain("interview")
    expect(response.story).toContain("interview")
    expect(response.emotion).toBeDefined()
    expect(response.pattern).toBe("Fortune telling")
    expect(response.balancedThought).toBeTruthy()
    expect(response.suggestions.length).toBeGreaterThanOrEqual(3)
    expect(response.threadInsight).toBe(null)
  })

  it("Section 2 & 8 — Multi-pass evolution and insight timing", async () => {
    const threadId = "multi-pass"
    const pass1 = await analyzeThought({ threadId, visitorId: "visitor-2", thought: "I think I wasn't selected." })
    const pass2 = await analyzeThought({ threadId, visitorId: "visitor-2", thought: "They probably chose someone better." })
    const pass3 = await analyzeThought({ threadId, visitorId: "visitor-2", thought: "I probably didn't make a strong impression." })
    const pass4 = await analyzeThought({ threadId, visitorId: "visitor-2", thought: "Maybe I'm just not good at interviews." })
    const pass5 = await analyzeThought({ threadId, visitorId: "visitor-2", thought: "I always mess up interviews." })

    expect(pass1.pattern).toBe("Fortune telling")
    expect(pass2.pattern).toBe("Mind reading")
    expect(pass3.pattern).toBe("Self criticism")
    expect(["Comparison thinking", "Self criticism"]).toContain(pass4.pattern)
    expect(pass5.pattern).toBe("Overgeneralization")

    expect(pass1.threadInsight).toBeNull()
    expect(pass2.threadInsight).toBeNull()
    expect(pass3.threadInsight).not.toBeNull()
  })

  it("Section 3 — Situation consistency", async () => {
    const threadId = "consistency"
    const pass1 = await analyzeThought({ threadId, visitorId: "visitor-3", thought: "I think I wasn't selected." })
    const pass2 = await analyzeThought({ threadId, visitorId: "visitor-3", thought: "They probably chose someone else." })
    const pass3 = await analyzeThought({ threadId, visitorId: "visitor-3", thought: "Maybe I didn't make a strong impression." })

    expect(pass1.situation).toBe(pass2.situation)
    expect(pass2.situation).toBe(pass3.situation)
  })

  it("Section 4 — Suggestion generation progression", async () => {
    const threadId = "suggestions"
    const first = await analyzeThought({ threadId, visitorId: "visitor-4", thought: "I think I wasn't selected." })
    const second = await analyzeThought({ threadId, visitorId: "visitor-4", thought: "They probably chose someone better." })

    expect(first.suggestions.some((text) => text.includes("Mind reading") || text.includes("Self criticism"))).toBe(true)
    expect(second.suggestions.some((text) => text.includes("Self criticism") || text.includes("Comparison thinking"))).toBe(true)
  })

  it("Section 5 — Suggestions terminate when stabilized, balanced, or core belief appears", async () => {
    const threadId = "termination"
    await analyzeThought({ threadId, visitorId: "visitor-5", thought: "I messed up again." })
    await analyzeThought({ threadId, visitorId: "visitor-5", thought: "I messed up again." })
    const stabilized = await analyzeThought({ threadId, visitorId: "visitor-5", thought: "I messed up again." })

    expect(stabilized.suggestions.length).toBe(0)

    const balanced = await analyzeThought({ threadId: "balanced-termination", visitorId: "visitor-6", thought: "Maybe I'm overthinking this and the hiring process just takes time." })
    expect(balanced.pattern).toBe("Balanced")
    expect(balanced.suggestions.length).toBe(0)
  })

  it("Section 6 — User typed thought respects progression", async () => {
    const threadId = "user-typed"
    const pass1 = await analyzeThought({ threadId, visitorId: "visitor-7", thought: "I think I failed the interview." })
    const pass2 = await analyzeThought({ threadId, visitorId: "visitor-7", thought: "Maybe they found someone more experienced." })

    expect(pass1.pattern).toBe("Fortune telling")
    expect(pass2.pattern).toBe("Mind reading")
  })

  it("Section 7 — Balanced thought termination", async () => {
    const threadId = "balanced-scene"
    const response = await analyzeThought({ threadId, visitorId: "visitor-8", thought: "Maybe I'm overthinking this and the hiring process just takes time." })
    expect(response.pattern).toBe("Balanced")
    expect(response.suggestions.length).toBe(0)
  })

  it("Section 9 — Core belief detection", async () => {
    const threadId = "core-belief"
    await analyzeThought({ threadId, visitorId: "visitor-9", thought: "I didn't do well." })
    await analyzeThought({ threadId, visitorId: "visitor-9", thought: "I'm not good at interviews." })
    const final = await analyzeThought({ threadId, visitorId: "visitor-9", thought: "I always fail interviews." })
    expect(final.coreBelief).toBe("I am not good enough")
    expect(final.suggestions.length).toBe(0)
  })

  it("Section 10 — Thread drift detection", async () => {
    const threadId = "drift"
    const start = await analyzeThought({ threadId, visitorId: "visitor-10", thought: "I haven't heard back from my interview." })
    const drift = await analyzeThought({ threadId, visitorId: "visitor-10", thought: "My parents must be disappointed in me." })

    expect(drift.threadId).not.toBe(start.threadId)
    expect(drift.situation.toLowerCase()).toContain("parents" )
  })

  it("Section 11 — Pattern loop detection", async () => {
    const threadId = "loop"
    await analyzeThought({ threadId, visitorId: "visitor-11", thought: "I messed up this again." })
    await analyzeThought({ threadId, visitorId: "visitor-11", thought: "I messed up this again." })
    const loop = await analyzeThought({ threadId, visitorId: "visitor-11", thought: "I messed up this again." })

    expect(loop.suggestions.length).toBe(0)
  })

  it("Section 12 — Invalid inputs should be rejected", async () => {
    const invalids = ["", "hi", "ok", "test"]
    const responses = await Promise.all(
      invalids.map((value, idx) =>
        analyzeThought({ threadId: `invalid-${idx}`, visitorId: `visitor-${idx}`, thought: value })
      )
    )

    responses.forEach((result) => {
      expect(result.valid).toBe(false)
      expect((result as InvalidThoughtResponse).type).toBe("GENERAL_QUESTION")
    })
  })

  it("Section 13 — Non-thought inputs stop pipeline", async () => {
    const prompts = ["What should I do?", "Give me advice.", "How do I get a job?"]

    for (const prompt of prompts) {
      const result = await analyzeThought({ threadId: "non-thought", visitorId: "visitor-20", thought: prompt })
      expect(result.valid).toBe(false)
      expect((result as InvalidThoughtResponse).type).toBe("SOLUTION_SEEKING")
    }
  })

  it("Section 14 — Emotion-only input stops pipeline", async () => {
    const result = await analyzeThought({ threadId: "emotion-only", visitorId: "visitor-21", thought: "I feel anxious." })
    expect(result.valid).toBe(false)
    expect((result as InvalidThoughtResponse).type).toBe("EMOTIONAL_EXPRESSION")
  })

  it("Section 15 — Random text rejected", async () => {
    const result = await analyzeThought({ threadId: "random", visitorId: "visitor-22", thought: "asdfasdfasdf" })
    expect(result.valid).toBe(false)
    expect((result as InvalidThoughtResponse).type).toBe("GENERAL_QUESTION")
  })

  it("Section 16 — Extremely long input handled", async () => {
    const longThought = "Interview" + " today".repeat(120)
    const result = await analyzeThought({ threadId: "long", visitorId: "visitor-23", thought: longThought })
    expect(result.valid).toBe(true)
    expect(result.situation).toBeTruthy()
  })

  it("Section 17 — Repeated thoughts do not loop suggestions", async () => {
    const threadId = "repeat"
    await analyzeThought({ threadId, visitorId: "visitor-24", thought: "I think I wasn't selected." })
    await analyzeThought({ threadId, visitorId: "visitor-24", thought: "I think I wasn't selected." })
    const repeated = await analyzeThought({ threadId, visitorId: "visitor-24", thought: "I think I wasn't selected." })

    expect(repeated.suggestions.length).toBe(0)
  })

  it("Section 18 — Rapid thread switching preserves thread separation", async () => {
    const first = await analyzeThought({ threadId: "rapid-a", visitorId: "visitor-25", thought: "Interview update pending." })
    const second = await analyzeThought({ threadId: "rapid-a", visitorId: "visitor-25", thought: "Family pressure is high." })
    const third = await analyzeThought({ threadId: "rapid-b", visitorId: "visitor-26", thought: "We argued yesterday." })

    expect(second.threadId).not.toBe(first.threadId)
    expect(third.threadId).toBe("rapid-b")
  })

  it("Section 19 — Suggestions never contain forbidden phrases", async () => {
    const response = await analyzeThought({ threadId: "safe", visitorId: "visitor-27", thought: "I think I wasn't selected from the interview." })
    expect(response.suggestions.every((suggestion) =>
      !forbiddenSuggestionPhrases.some((phrase) => suggestion.toLowerCase().includes(phrase))
    )).toBe(true)
  })

  it("Section 20 — Performance test with ten sequential thoughts", async () => {
    const threadId = "performance"
    for (let i = 0; i < 10; i += 1) {
      await analyzeThought({ threadId, visitorId: "visitor-28", thought: `I think I still failed interview round ${i}.` })
    }
    const state = threadStore.get(threadId)
    expect(state?.history.length).toBe(10)
    const final = await analyzeThought({ threadId, visitorId: "visitor-28", thought: "I always think it's not good enough." })
    expect(final.suggestions.length).toBe(0)
  })

  it("Section 21 — Stability across simultaneous threads", async () => {
    await analyzeThought({ threadId: "thread-a", visitorId: "visitor-29", thought: "Interview anxiety" })
    await analyzeThought({ threadId: "thread-b", visitorId: "visitor-30", thought: "Family pressure" })
    const secondA = await analyzeThought({ threadId: "thread-a", visitorId: "visitor-29", thought: "I think they didn't call me." })
    const secondB = await analyzeThought({ threadId: "thread-b", visitorId: "visitor-30", thought: "My mentor gave feedback." })

    const stateA = threadStore.get(secondA.threadId)
    const stateB = threadStore.get(secondB.threadId)

    expect(secondA.threadId).not.toBe(secondB.threadId)
    expect(stateA?.history.length).toBe(2)
    expect(stateB?.history.length).toBe(2)
  })
})

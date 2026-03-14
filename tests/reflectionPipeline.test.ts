import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextThoughtStage } from "../services/reflectionValidator.service"

type StoredThought = {
  situation?: string | null
  story?: string | null
  thought?: string | null
  automaticThought?: string | null
  pattern?: string | null
}

const threadStore = new Map<string, { situation: string | null; thoughts: StoredThought[] }>()

vi.mock("@/services/thought.service", () => ({
  fetchThreadContext: async (threadId: string) => {
    const existing = threadStore.get(threadId)
    return {
      situation: existing?.situation ?? null,
      story: null,
      thoughts: existing?.thoughts ?? [],
    }
  },
  updateThreadSituation: async (threadId: string, situation: string) => {
    const existing = threadStore.get(threadId) ?? { situation: null, thoughts: [] }
    threadStore.set(threadId, { ...existing, situation })
  },
}))

const DEFAULT_SITUATION = "It has been 3 days since my interviews and I have not received a response."
const DEFAULT_STORY = "I think I have not been selected."
const NEXT_SUGGESTIONS = [
  "Maybe they think my skills don\'t match this interview role yet.",
  "Maybe another candidate had more experience for the position.",
  "Maybe I didn\'t highlight the qualification they wanted.",
  "Maybe they expected someone more comfortable with this role."
]

vi.mock("@/lib/ai", () => ({
  generateFactStoryStage: async (
    thought: string,
    _previousThoughts: string[],
    situation: string | null
  ) => {
    return {
      stage: "fact_story",
      thought,
      story: DEFAULT_STORY,
      situation: situation ?? DEFAULT_SITUATION,
      emotions: ["disappointed"],
    }
  },
  generateStoryEmotionStage: async () => {
    return {
      story: "Maybe they think I\'m not a good fit for this interview.",
      emotions: ["doubt"],
    }
  },
  generateRecognitionStage: async () => ({
    stage: "recognition",
    prompt: "What else could this thought mean?",
    suggestions: ["Maybe I assumed too much"],
  }),
  generatePatternStage: async () => ({
    stage: "pattern",
    pattern: "Mind reading",
    explanation: "Assumes others have already decided.",
  }),
  generateBalancedStage: async () => ({
    stage: "balanced",
    balancedThought:
      "It has only been a few days since the interview; the recruiters may still be deciding.",
  }),
  generateNextThoughtStage: async () => ({
    stage: "next_thought",
    suggestions: NEXT_SUGGESTIONS,
  } as NextThoughtStage),
  generateReflectionCompletion: async ({ thoughtHistory }: { thoughtHistory: string[] }) =>
    thoughtHistory.length >= 3 ? "complete" : "continue",
  validateThoughtSuggestions: async () => ({ valid: true }),
  inferEmotionFromText: () => "disappointed",
}))

const THREAD_ID = "test-thread"

beforeEach(() => {
  threadStore.clear()
})

const buildTestAnalysis = (automaticThought: string, context: string[]) => ({
  automaticThought,
  context,
  emotions: [],
  pattern: null,
  balancedThought: null,
  suggestions: [],
  reflectionQuestion: null,
  normalization: null,
  coreBelief: null,
  trigger: null,
  story: null,
  situation: null,
  thought: automaticThought,
})

let buildThoughtStages: typeof import("../services/cbt/stagePipeline.service").buildThoughtStages

beforeEach(async () => {
  const pipelineModule = await vi.importActual<typeof import("../services/cbt/stagePipeline.service")>(
    "../services/cbt/stagePipeline.service"
  )
  buildThoughtStages = pipelineModule.buildThoughtStages
})

describe("CBT reflection pipeline", () => {
  it("should persist the extracted situation across passes", async () => {
    const firstThought =
      "It has been 3 days that I have given interviews but no response yet. I think I have not been selected."

    const pass1 = await buildThoughtStages(firstThought, buildTestAnalysis(firstThought, []), THREAD_ID)
    const situation1 = pass1[0].situation

    const pass2 = await buildThoughtStages(
      "Maybe they think I'm not a good fit for the role",
      buildTestAnalysis("Maybe they think I'm not a good fit for the role", [firstThought]),
      THREAD_ID
    )
    const situation2 = pass2[0].situation

    expect(situation2).toBe(situation1)
  })

  it("should keep the story separate from the situation", async () => {
    const thought =
      "It has been 3 days that I have given interviews but no response yet. I think I have not been selected."

    const stages = await buildThoughtStages(thought, buildTestAnalysis(thought, []), THREAD_ID)
    const situation = stages[0].situation
    const story = stages[0].story

    expect(story).not.toContain(situation ?? "")
  })

  it("should keep suggestions tied to the interview situation", async () => {
    const thought =
      "It has been 3 days that I have given interviews but no response yet. I think I have not been selected."

    const stages = await buildThoughtStages(thought, buildTestAnalysis(thought, []), THREAD_ID)
    const nextStage = stages.find((stage) => stage.stage === "next_thought") as NextThoughtStage

    expect(nextStage).toBeDefined()
    expect(nextStage.suggestions.length).toBeGreaterThan(0)

    for (const suggestion of nextStage.suggestions) {
      expect(suggestion).toMatch(/interview|candidate|skills|role|qualification/i)
    }
  })

  it("should eventually return a reflection_complete stage", async () => {
    let thought =
      "It has been 3 days that I have given interviews but no response yet. I think I have not been selected."
    const history: string[] = []

    for (let i = 0; i < 6; i++) {
      const stages = await buildThoughtStages(thought, buildTestAnalysis(thought, history), THREAD_ID)
      const completion = stages.find((stage) => stage.stage === "reflection_complete")

      if (completion) {
        expect(completion.stage).toBe("reflection_complete")
        return
      }

      const nextStage = stages.find((stage) => stage.stage === "next_thought") as NextThoughtStage
      const nextThought = nextStage?.suggestions[0]
      if (nextThought) {
        history.push(nextThought)
        thought = nextThought
      }
    }

    throw new Error("Reflection did not complete within expected passes")
  })
})

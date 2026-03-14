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

vi.mock("../services/thought.service", () => ({
  fetchThreadContext: async (threadId: string) => {
    const state = threadStore.get(threadId) ?? { situation: null, thoughts: [] }
    return {
      situation: state.situation,
      story: null,
      thoughts: state.thoughts,
    }
  },
  updateThreadSituation: async (threadId: string, situation: string) => {
    const previous = threadStore.get(threadId) ?? { situation: null, thoughts: [] }
    threadStore.set(threadId, { ...previous, situation })
  },
}))

const DEFAULT_SITUATION = "It has been 3 days since my interviews and I have not received a response."
const DEFAULT_STORY = "I think I have not been selected."
const NEXT_SUGGESTIONS = [
  "Maybe they believe my skills are not a fit for this role.",
  "Maybe the other candidate came across as more polished for the position.",
  "Maybe I didn't explain the qualification they wanted.",
  "Maybe I should have emphasized my experience with this team."
]

vi.mock("../lib/ai", () => ({
  generateFactStoryStage: async (
    thought: string,
    _previousThoughts: string[],
    situation: string | null
  ) => ({
    stage: "fact_story",
    thought,
    story: DEFAULT_STORY,
    situation: situation ?? DEFAULT_SITUATION,
    emotions: ["disappointed"],
  }),
  generateStoryEmotionStage: async () => ({
    story: "Maybe they think I\'m not a good fit for this interview.",
    emotions: ["doubt"],
  }),
  generateRecognitionStage: async () => ({
    stage: "recognition",
    prompt: "What does this say about how you see the situation?",
    suggestions: ["Maybe I'm assuming too much"],
  }),
  generatePatternStage: async () => ({
    stage: "pattern",
    pattern: "Mind reading",
    explanation: "Assuming others already judged me.",
  }),
  generateBalancedStage: async () => ({
    stage: "balanced",
    balancedThought:
      "It has only been a short time since the interview; they may still be reviewing candidates.",
  }),
  generateNextThoughtStage: async () => ({
    stage: "next_thought",
    suggestions: NEXT_SUGGESTIONS,
  }) as NextThoughtStage,
  generateReflectionCompletion: async ({ thoughtHistory }: { thoughtHistory: string[] }) =>
    thoughtHistory.length >= 3 ? "complete" : "continue",
  validateThoughtSuggestions: async () => ({ valid: true }),
  inferEmotionFromText: () => "disappointed",
}))

let buildThoughtStages: typeof import("../services/cbt/stagePipeline.service").buildThoughtStages
let fetchThreadContext: (threadId: string) => Promise<{
  situation: string | null
  story: string | null
  thoughts: StoredThought[]
}>

beforeEach(async () => {
  threadStore.clear()
  const [pipelineModule, thoughtServiceModule] = await Promise.all([
    vi.importActual<typeof import("../services/cbt/stagePipeline.service")>(
      "../services/cbt/stagePipeline.service"
    ),
    import("../services/thought.service"),
  ])
  buildThoughtStages = pipelineModule.buildThoughtStages
  fetchThreadContext = thoughtServiceModule.fetchThreadContext
})

const buildAnalysis = (automaticThought: string, context: string[]) => ({
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

const THREAD_ID = "e2e-test-thread"

import { fetchThreadContext } from "../services/thought.service"

describe("CBT reflection E2E", () => {
  it("should save the extracted situation after the first pass", async () => {
    const thought =
      "It has been 3 days that I have given interviews but no response yet. I think I have not been selected."

    await buildThoughtStages(thought, buildAnalysis(thought, []), THREAD_ID)
    const thread = await fetchThreadContext(THREAD_ID)

    expect(thread.situation).toBeDefined()
    expect(thread.situation).toContain("3 days")
  })

  it("should reuse the same situation across passes", async () => {
    const pass1 = await buildThoughtStages(
      "It has been 3 days that I have given interviews but no response yet. I think I have not been selected.",
      buildAnalysis("", []),
      THREAD_ID
    )
    const situation1 = pass1[0].situation

    const pass2 = await buildThoughtStages(
      "Maybe they think I'm not a good fit for the team.",
      buildAnalysis("", []),
      THREAD_ID
    )
    const situation2 = pass2[0].situation

    expect(situation2).toBe(situation1)
  })

  it("story should not repeat the situation", async () => {
    const stages = await buildThoughtStages(
      "Maybe they think I'm not a good fit for the team.",
      buildAnalysis("", []),
      THREAD_ID
    )
    const { situation, story } = stages[0]

    expect(story).not.toContain(situation ?? "")
  })

  it("suggestions should stay tied to the situation", async () => {
    const stages = await buildThoughtStages(
      "Maybe they think I'm not a good fit for the team.",
      buildAnalysis("", []),
      THREAD_ID
    )
    const nextStage = stages.find((stage) => stage.stage === "next_thought") as NextThoughtStage | undefined

    expect(nextStage).toBeDefined()
    if (nextStage) {
      for (const suggestion of nextStage.suggestions) {
        expect(suggestion).toMatch(/interview|candidate|skills|role|team|qualification/i)
      }
    }
  })

  it("reflection eventually completes", async () => {
    let thought =
      "It has been 3 days that I have given interviews but no response yet. I think I have not been selected."
    const history: string[] = []

    for (let i = 0; i < 6; i++) {
      const stages = await buildThoughtStages(
        thought,
        buildAnalysis(thought, history),
        THREAD_ID
      )
      const completion = stages.find((stage) => stage.stage === "reflection_complete")

      if (completion) {
        expect(completion.stage).toBe("reflection_complete")
        return
      }

      const nextStage = stages.find((stage) => stage.stage === "next_thought") as NextThoughtStage | undefined
      const nextThought = nextStage?.suggestions[0]
      if (nextThought) {
        history.push(nextThought)
        thought = nextThought
      }
    }

    throw new Error("Reflection did not complete within expected passes")
  })
})

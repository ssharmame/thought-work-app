import { describe, expect, it, vi, beforeEach } from "vitest"
import { handleClassification } from "@/services/decision.service"
import { classifyThoughtIntent } from "@/lib/ai"

vi.mock("@/lib/ai", () => ({
  classifyThoughtIntent: vi.fn(),
}))

type ClassificationType =
  | "THOUGHT"
  | "SOLUTION_SEEKING"
  | "SITUATION"
  | "EMOTIONAL_EXPRESSION"
  | "GENERAL_QUESTION"

type ThoughtIntentType =
  | "DISTORTED_THOUGHT"
  | "BALANCED_THOUGHT"
  | "GOAL_OR_DESIRE"
  | null

type RoutingCase = {
  input: string
  expectedClassification: ClassificationType
  expectedThoughtIntent: ThoughtIntentType
  shouldRunReflection: boolean
}

const guidanceByIntent: Record<Exclude<ThoughtIntentType, null>, string | null> = {
  DISTORTED_THOUGHT: null,
  BALANCED_THOUGHT:
    "Your thought already seems balanced and reflective. If another worrying thought or concern comes up about this situation, you can share it here.",
  GOAL_OR_DESIRE:
    "It sounds like you're thinking about a goal. When you imagine taking that step, does any worrying thought or doubt come to mind?",
}

const cases: RoutingCase[] = [
  // Group 1 — Distorted Thoughts
  {
    input: "Maybe I messed up the interview.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "My boss probably thinks I'm incompetent.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "Everyone else seems more capable than me.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "If I don't finish this perfectly I'll fail.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "They probably didn't like my presentation.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "Maybe I said something stupid in that meeting.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "I think I ruined everything.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },

  // Group 2 — Balanced Thoughts
  {
    input: "Maybe I just need to manage my schedule better.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "BALANCED_THOUGHT",
    shouldRunReflection: false,
  },
  {
    input: "I might need to give this more time.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "BALANCED_THOUGHT",
    shouldRunReflection: false,
  },
  {
    input: "Perhaps I should focus on what I can control.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "BALANCED_THOUGHT",
    shouldRunReflection: false,
  },
  {
    input: "I probably need to get more sleep.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "BALANCED_THOUGHT",
    shouldRunReflection: false,
  },
  {
    input: "I can take this one step at a time.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "BALANCED_THOUGHT",
    shouldRunReflection: false,
  },

  // Group 3 — Goal or Desire
  {
    input: "I want to start my own business.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "GOAL_OR_DESIRE",
    shouldRunReflection: false,
  },
  {
    input: "I want to switch careers.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "GOAL_OR_DESIRE",
    shouldRunReflection: false,
  },
  {
    input: "I want to move to another country.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "GOAL_OR_DESIRE",
    shouldRunReflection: false,
  },
  {
    input: "I want to become more confident.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "GOAL_OR_DESIRE",
    shouldRunReflection: false,
  },
  {
    input: "I hope to get better at public speaking.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "GOAL_OR_DESIRE",
    shouldRunReflection: false,
  },

  // Group 4 — Situation Only
  {
    input: "My boss hasn't replied to my message.",
    expectedClassification: "SITUATION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "It has been three days since my interview.",
    expectedClassification: "SITUATION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "My presentation finished earlier than expected.",
    expectedClassification: "SITUATION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "My friend didn't respond to my text.",
    expectedClassification: "SITUATION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "The meeting was moved to tomorrow.",
    expectedClassification: "SITUATION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },

  // Group 5 — Emotional Expression Only
  {
    input: "I feel anxious.",
    expectedClassification: "EMOTIONAL_EXPRESSION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "I feel overwhelmed.",
    expectedClassification: "EMOTIONAL_EXPRESSION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "I feel frustrated today.",
    expectedClassification: "EMOTIONAL_EXPRESSION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "I feel really tired lately.",
    expectedClassification: "EMOTIONAL_EXPRESSION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "I'm feeling nervous.",
    expectedClassification: "EMOTIONAL_EXPRESSION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },

  // Group 6 — Solution Seeking
  {
    input: "What should I do about my boss?",
    expectedClassification: "SOLUTION_SEEKING",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "Can you help me figure out what to do?",
    expectedClassification: "SOLUTION_SEEKING",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "Any advice for dealing with stress?",
    expectedClassification: "SOLUTION_SEEKING",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "How should I handle this situation?",
    expectedClassification: "SOLUTION_SEEKING",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "Please tell me what I should do next.",
    expectedClassification: "SOLUTION_SEEKING",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },

  // Group 7 — General Questions
  {
    input: "What is cognitive behavioral therapy?",
    expectedClassification: "GENERAL_QUESTION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "How do people manage stress?",
    expectedClassification: "GENERAL_QUESTION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "Why do people overthink?",
    expectedClassification: "GENERAL_QUESTION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "What does anxiety mean?",
    expectedClassification: "GENERAL_QUESTION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "Can you explain rumination?",
    expectedClassification: "GENERAL_QUESTION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },

  // Group 8 — Edge cases
  {
    input: "My boss hasn't replied and maybe he thinks I did something wrong.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "I want to start a business but maybe I'm not capable.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "My boss hasn't replied and I'm feeling anxious.",
    expectedClassification: "EMOTIONAL_EXPRESSION",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "It has been three days since the interview and maybe I wasn't selected.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "I feel anxious because maybe I sounded unprepared.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "DISTORTED_THOUGHT",
    shouldRunReflection: true,
  },
  {
    input: "Can you help me? Maybe I failed the interview.",
    expectedClassification: "SOLUTION_SEEKING",
    expectedThoughtIntent: null,
    shouldRunReflection: false,
  },
  {
    input: "I want to switch careers and I can start by updating my resume.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "GOAL_OR_DESIRE",
    shouldRunReflection: false,
  },
  {
    input: "The interview ended quickly, and I might be overthinking this.",
    expectedClassification: "THOUGHT",
    expectedThoughtIntent: "BALANCED_THOUGHT",
    shouldRunReflection: false,
  },
]

describe("ThoughtLens routing matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("contains at least 40 cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(40)
  })

  it.each(cases)(
    "routes: $input",
    async ({
      input,
      expectedClassification,
      expectedThoughtIntent,
      shouldRunReflection,
    }) => {
      if (expectedClassification === "THOUGHT" && expectedThoughtIntent) {
        vi.mocked(classifyThoughtIntent).mockResolvedValue({
          type: expectedThoughtIntent,
          shouldRunReflection,
          message: guidanceByIntent[expectedThoughtIntent],
        })
      }

      const valid = expectedClassification === "THOUGHT"
      const result = await handleClassification(expectedClassification, input, valid)

      if (shouldRunReflection) {
        expect(result).toEqual({ status: "continue" })
      } else {
        expect(result.status).toBe("guidance")
      }

      if (expectedClassification === "THOUGHT") {
        expect(classifyThoughtIntent).toHaveBeenCalledTimes(1)
        expect(classifyThoughtIntent).toHaveBeenCalledWith(input)
      } else {
        expect(classifyThoughtIntent).not.toHaveBeenCalled()
      }
    }
  )
})

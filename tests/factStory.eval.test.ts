import { beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("langfuse", () => ({
  default: class MockLangfuse {
    generation() {
      return {
        end() {
          return undefined
        },
      }
    }
  },
}))

type FactStoryResult = {
  stage: string
  situation: string
  story: string
  emotions: string[]
}

type EvalCase = {
  category: string
  name: string
  purpose: string
  thought: string
  previousThoughts?: string[]
  situation?: string | null
  previousPatterns?: string[]
  requiredSituationPatterns: RegExp[]
  forbiddenSituationPatterns?: RegExp[]
  requiredStoryPatterns?: RegExp[]
  forbiddenStoryPatterns?: RegExp[]
}

let generateFactStoryStage: (
  thought: string,
  previousThoughts?: string[],
  situation?: string | null,
  previousPatterns?: string[]
) => Promise<FactStoryResult>

const liveEvalCases: EvalCase[] = [
  {
    category: "attribution",
    name: "preserves another person's mental-fatigue claim",
    purpose: "Catches the exact ownership-flip bug where his excuse gets rewritten as my state.",
    thought:
      "He is distant and non responsive to me stating mental fatigue. But he is constantly available on Facebook. I think he is lying.",
    requiredSituationPatterns: [
      /\bhe\b/i,
      /mental fatigue|mentally fatigued|mentally exhausted/i,
      /facebook|active online|available online/i,
    ],
    forbiddenSituationPatterns: [
      /\bi stated mental fatigue\b/i,
      /\bmy mental fatigue\b/i,
      /\bi (said|told him) (that )?i (was|am) (mentally fatigued|mentally exhausted|fatigued)\b/i,
    ],
    requiredStoryPatterns: [
      /lying|dishonest|excuse|not honest|moved on/i,
    ],
  },
  {
    category: "attribution",
    name: "keeps his explanation attributed to him",
    purpose: "Checks that another person's explanation stays attached to them in the factual situation.",
    thought:
      "He told me he was exhausted and needed space, but he keeps posting stories and not replying to me.",
    requiredSituationPatterns: [
      /\bhe told me\b/i,
      /exhausted|needed space/i,
      /posting stories|not replying/i,
    ],
    forbiddenSituationPatterns: [
      /\bi told him i was exhausted\b/i,
      /\bi needed space\b/i,
    ],
    requiredStoryPatterns: [
      /avoiding me|not being honest|using it as an excuse|doesn't want to talk/i,
    ],
  },
  {
    category: "first_person",
    name: "still uses first person for the user's direct experience",
    purpose: "Makes sure the new attribution rule does not break legitimate first-person situations.",
    thought:
      "I told him I felt overwhelmed and he stopped replying after that. I think he doesn't care.",
    requiredSituationPatterns: [
      /\bi told him\b/i,
      /\bi felt overwhelmed\b/i,
      /he stopped replying/i,
    ],
    forbiddenSituationPatterns: [
      /\bhe felt overwhelmed\b/i,
      /\bhe told me he felt overwhelmed\b/i,
    ],
    requiredStoryPatterns: [
      /doesn't care|does not care|is pulling away|is done with me/i,
    ],
  },
  {
    category: "pronouns",
    name: "preserves her statement instead of flipping it to me",
    purpose: "Protects against pronoun confusion when the other person's statement appears before the user's interpretation.",
    thought:
      "She said she needed time to think, but she's posting normally everywhere else. I think she's just avoiding me.",
    requiredSituationPatterns: [
      /\bshe said\b/i,
      /needed time to think/i,
      /posting|active|online/i,
    ],
    forbiddenSituationPatterns: [
      /\bi needed time to think\b/i,
      /\bi said i needed time to think\b/i,
    ],
    requiredStoryPatterns: [
      /avoiding me|not honest|pulling away|doesn't want to talk/i,
    ],
  },
  {
    category: "mixed_fact_story",
    name: "separates observable delay from mind-reading",
    purpose: "Checks that the situation holds onto the response delay while the inference stays in story.",
    thought:
      "It's been 2 days since I sent the message and he has seen it but not replied. I think he regrets talking to me.",
    requiredSituationPatterns: [
      /2 days|two days/i,
      /sent the message|sent him a message/i,
      /seen it|read it|not replied|hasn't replied/i,
    ],
    forbiddenSituationPatterns: [
      /regrets talking to me|doesn't want me|is done with me/i,
    ],
    requiredStoryPatterns: [
      /regrets talking to me|doesn't want to talk to me|is pulling away/i,
    ],
  },
  {
    category: "ambiguity",
    name: "uses neutral wording when ownership is unclear",
    purpose: "Encourages neutral factual phrasing instead of guessing when the sentence is ambiguous.",
    thought:
      "After mentioning burnout things changed and now there is barely any response from him. I think something is off.",
    requiredSituationPatterns: [
      /mentioning burnout|burnout was mentioned|burnout came up/i,
      /barely any response|little response|less responsive/i,
    ],
    forbiddenSituationPatterns: [
      /\bi mentioned burnout\b/i,
      /\bhe mentioned burnout\b/i,
    ],
    requiredStoryPatterns: [
      /something is off|hiding something|not being honest|pulling away/i,
    ],
  },
  {
    category: "social_media_mismatch",
    name: "keeps social-media evidence factual and separate from conclusion",
    purpose: "Checks the common 'active online but not replying' pattern without letting the conclusion leak into the situation.",
    thought:
      "He hasn't replied to me all day but he has been active on Instagram the whole time. I think I don't matter to him.",
    requiredSituationPatterns: [
      /hasn't replied|not replied/i,
      /all day/i,
      /instagram|active online/i,
    ],
    forbiddenSituationPatterns: [
      /don't matter|doesn't care|unimportant/i,
    ],
    requiredStoryPatterns: [
      /don't matter|does not matter|doesn't care|not important/i,
    ],
  },
  {
    category: "thread_context",
    name: "keeps the current fact grounded even with prior thread context",
    purpose: "Makes sure previous thoughts do not cause the current situation extraction to drift into old story language.",
    thought:
      "He still hasn't replied since yesterday even though he viewed my story.",
    previousThoughts: [
      "I keep thinking he is losing interest in me.",
      "Maybe he has already moved on.",
    ],
    requiredSituationPatterns: [
      /hasn't replied|still hasn't replied/i,
      /since yesterday/i,
      /viewed my story|saw my story/i,
    ],
    forbiddenSituationPatterns: [
      /losing interest|moved on|doesn't care/i,
    ],
    requiredStoryPatterns: [
      /losing interest|moved on|doesn't want to talk/i,
    ],
  },
]

beforeAll(async () => {
  const aiModule = await import("@/lib/ai")
  generateFactStoryStage = aiModule.generateFactStoryStage
})

const describeIfOpenAI = process.env.OPENAI_API_KEY ? describe : describe.skip

function assertPatterns(text: string, patterns: RegExp[], assertion: "match" | "notMatch") {
  for (const pattern of patterns) {
    if (assertion === "match") {
      expect(text).toMatch(pattern)
      continue
    }

    expect(text).not.toMatch(pattern)
  }
}

describeIfOpenAI("fact_story eval", () => {
  it.each(liveEvalCases)("$category :: $name", async (evalCase) => {
    const result = await generateFactStoryStage(
      evalCase.thought,
      evalCase.previousThoughts ?? [],
      evalCase.situation ?? null,
      evalCase.previousPatterns ?? []
    )

    expect(result.stage, evalCase.purpose).toBe("fact_story")
    expect(result.situation.trim().length, evalCase.purpose).toBeGreaterThan(0)
    expect(result.story.trim().length, evalCase.purpose).toBeGreaterThan(0)

    assertPatterns(result.situation, evalCase.requiredSituationPatterns, "match")
    assertPatterns(result.situation, evalCase.forbiddenSituationPatterns ?? [], "notMatch")
    assertPatterns(result.story, evalCase.requiredStoryPatterns ?? [], "match")
    assertPatterns(result.story, evalCase.forbiddenStoryPatterns ?? [], "notMatch")
  })
})

describe("fact_story eval", () => {
  it("is skipped without OPENAI_API_KEY", () => {
    if (!process.env.OPENAI_API_KEY) {
      expect(true).toBe(true)
      return
    }

    expect(process.env.OPENAI_API_KEY.length).toBeGreaterThan(0)
  })
})

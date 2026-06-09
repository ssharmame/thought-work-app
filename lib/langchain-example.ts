/**
 * LangChain usage example
 *
 * This file shows how to rewrite one of the functions from lib/ai.ts
 * using LangChain's ChatOpenAI + PromptTemplate + output parsing.
 *
 * The original raw-OpenAI version lives in lib/ai.ts (generateAcknowledgement).
 * This is a drop-in replacement demonstrating the LangChain pattern.
 *
 * Key difference from lib/ai.ts:
 *  - No manual Langfuse generation.start() / .end() boilerplate
 *  - The Langfuse CallbackHandler in getLangChainModel() handles tracing automatically
 *  - PromptTemplate makes prompt variables explicit and testable
 */

import { PromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { getLangChainModel } from "@/lib/langchain"

export type AcknowledgementOutput = {
  acknowledgement: string
  reassurance: string
}

const acknowledgementPrompt = PromptTemplate.fromTemplate(`
You are reading someone's thought. Write two things.

ACKNOWLEDGEMENT
One warm sentence. Maximum 15 words.
Use a specific word or detail from their thought.
Do not analyse. Do not advise. Do not label.
Do not start with "I" or "That".

REASSURANCE
One short grounding sentence. Maximum 12 words.
Anchor them to what is stable or true right now.
Not a promise about the future.
Not "everything will be okay."
Something that is factually true in this moment.

Return JSON only:
{{
  "acknowledgement": "",
  "reassurance": ""
}}

Thought:
"{thought}"
`)

export async function generateAcknowledgementWithLangChain(
  thought: string,
  traceId?: string
): Promise<AcknowledgementOutput> {
  const model = getLangChainModel({ temperature: 0.4, traceId })
  const outputParser = new StringOutputParser()

  // Build a simple chain: prompt → model → parse output string
  const chain = acknowledgementPrompt.pipe(model).pipe(outputParser)

  const raw = await chain.invoke({ thought: thought.trim() })

  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start === -1 || end === -1) throw new Error("no json")
    const parsed = JSON.parse(raw.slice(start, end + 1))
    return {
      acknowledgement: typeof parsed.acknowledgement === "string" ? parsed.acknowledgement.trim() : "",
      reassurance: typeof parsed.reassurance === "string" ? parsed.reassurance.trim() : "You are here right now.",
    }
  } catch {
    return {
      acknowledgement: "",
      reassurance: "You are here right now.",
    }
  }
}

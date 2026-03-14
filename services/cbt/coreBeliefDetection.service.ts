import { detectCoreBelief } from "@/lib/ai"

type CoreBeliefResult = {
  coreBelief: string | null
}

const beliefSignals = [
  /\bi am\b/i,
  /\bi always\b/i,
  /\bi never\b/i,
  /\bnobody likes me\b/i,
  /\bi am not good enough\b/i,
  /\bi am a failure\b/i,
  /\bi am worthless\b/i,
]

function containsDeepBelief(automaticThought: string): boolean {
  const normalized = automaticThought.toLowerCase()
  return beliefSignals.some((pattern) => pattern.test(normalized))
}

export async function detectCoreBeliefForThought(
  automaticThought: string,
): Promise<CoreBeliefResult> {
  if (!automaticThought.trim() || !containsDeepBelief(automaticThought)) {
    return { coreBelief: null }
  }

  try {
    return await detectCoreBelief(automaticThought)
  } catch (error) {
    console.error("core belief detection AI failed", error)
    return { coreBelief: null }
  }
}

export type { CoreBeliefResult }

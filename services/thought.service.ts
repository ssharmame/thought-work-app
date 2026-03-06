import { processThought } from "@/lib/ai"
import { createThought } from "@/repositories/thought.repositories"

export async function processAndStoreThought(thought: string) {

  const result = await processThought(thought)

  await createThought({
    thought,
    fact: result.fact,
    story: result.story,
    emotion: result.emotion,
    reflectionQuestion: result.reflectionQuestion,
    balancedThought: result.balancedThought
  })

  return result
}
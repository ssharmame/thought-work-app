import { prisma } from "@/lib/prisma"
import { getThoughtsByThread } from "@/repositories/thought.repositories"

type Counts = Record<string, number>

type InsightResult = {
  dominantPattern: string | null
  dominantPatternCount: number
  dominantEmotion: string | null
  dominantEmotionCount: number
  dominantBelief: string | null
  dominantBeliefCount: number
  thoughtCount: number
}

function getDominant(counts: Counts): [string | null, number] {
  const entries = Object.entries(counts)
  if (!entries.length) return [null, 0]
  const [pattern, count] = entries.sort((a, b) => b[1] - a[1])[0]
  return [pattern, count]
}

export async function updateThreadInsight(threadId: string): Promise<InsightResult> {
  const thoughts = await getThoughtsByThread(threadId)
  const patternCounts: Counts = {}
  const emotionCounts: Counts = {}
  const beliefCounts: Counts = {}

  for (const entry of thoughts) {
    if (entry.pattern && entry.pattern !== "none identified yet") {
      const key = entry.pattern.trim()
      if (key) {
        patternCounts[key] = (patternCounts[key] ?? 0) + 1
      }
    }
    if (entry.emotion) {
      const key = entry.emotion.trim()
      if (key) {
        emotionCounts[key] = (emotionCounts[key] ?? 0) + 1
      }
    }
    if (entry.coreBelief && entry.coreBelief !== "not clear yet") {
      const key = entry.coreBelief.trim()
      if (key) {
        beliefCounts[key] = (beliefCounts[key] ?? 0) + 1
      }
    }
  }

  const [dominantPattern, dominantPatternCount] = getDominant(patternCounts)
  const [dominantEmotion, dominantEmotionCount] = getDominant(emotionCounts)
  const [dominantBelief, dominantBeliefCount] = getDominant(beliefCounts)
  const insight = {
    dominantPattern,
    dominantPatternCount,
    dominantEmotion,
    dominantEmotionCount,
    dominantBelief,
    dominantBeliefCount,
    thoughtCount: thoughts.length,
  }

  await prisma.threadInsight.upsert({
    where: { threadId },
    update: {
      dominantPattern,
      dominantEmotion,
      dominantBelief,
      thoughtCount: thoughts.length,
    },
    create: {
      threadId,
      dominantPattern,
      dominantEmotion,
      dominantBelief,
      thoughtCount: thoughts.length,
    },
  })

  return insight
}

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import type { ThoughtEntryFields } from "@/services/thoughtMapper"
export type { ThoughtEntryFields } from "@/services/thoughtMapper"

export async function upsertVisitor(visitorId: string) {
  return prisma.visitor.upsert({
    where: { id: visitorId },
    update: {},
    create: { id: visitorId }
  })
}

export async function upsertSession(sessionId: string, visitorId: string) {
  return prisma.session.upsert({
    where: { id: sessionId },
    update: {},
    create: {
      id: sessionId,
      visitorId
    }
  })
}

export async function upsertThread(
  threadId: string,
  sessionId: string,
  visitorId: string,
  title?: string,
  userId?: string
) {
  return prisma.thread.upsert({
    where: { id: threadId },
    update: { title },
    create: {
      id: threadId,
      sessionId,
      visitorId,
      userId: userId ?? null,
      title,
    }
  })
}

export async function getThreadById(threadId: string) {
  return prisma.thread.findUnique({
    where: { id: threadId }
  })
}

export async function setThreadSituation(threadId: string, situation: string) {
  return prisma.thread.update({
    where: { id: threadId },
    data: { situation }
  })
}

export async function createThoughtEntry(data: Prisma.ThoughtEntryUncheckedCreateInput) {
  return prisma.thoughtEntry.create({ data })
}

export function buildThoughtEntryData(
  base: {
    thought: string
    intent: string
    status: string
    threadId: string
    sessionId: string
    visitorId: string
    userId?: string
  },
  analysis: ThoughtEntryFields,
): Prisma.ThoughtEntryUncheckedCreateInput {
  return {
    thought: base.thought,
    intent: base.intent,
    status: base.status,
    threadId: base.threadId,
    sessionId: base.sessionId,
    visitorId: base.visitorId,
    userId: base.userId ?? null,
    situation: analysis.situation,
    automaticThought: analysis.automaticThought,
    story: analysis.story,
    emotion: analysis.emotion,
    coreBelief: analysis.coreBelief,
    reflectionQuestion: analysis.reflectionQuestion,
    balancedThought: analysis.balancedThought,
    pattern: analysis.pattern,
    patternExplanation: analysis.patternExplanation,
    normalization: analysis.normalization ?? undefined,
  }
}

export async function getThoughts() {
  return prisma.thoughtEntry.findMany({
    orderBy: {
      createdAt: "desc"
    }
  })
}

export async function getThoughtsByThread(threadId: string) {
  return prisma.thoughtEntry.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" }
  })
}

export async function getRecentThoughtsForSession(sessionId: string, limit = 5) {
  return prisma.thoughtEntry.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

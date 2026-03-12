import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

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

export async function upsertThread(threadId: string, sessionId: string, visitorId: string, title?: string) {
  return prisma.thread.upsert({
    where: { id: threadId },
    update: { title },
    create: {
      id: threadId,
      sessionId,
      visitorId,
      title
    }
  })
}

export async function createThoughtEntry(
  data: Prisma.ThoughtEntryCreateInput
) {
  return prisma.thoughtEntry.create({ data })
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

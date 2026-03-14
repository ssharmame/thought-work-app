import {
  buildThoughtEntryData,
  createThoughtEntry,
  getRecentThoughtsForSession,
  getThoughtsByThread,
  getThreadById,
  setThreadSituation,
  upsertSession,
  upsertThread,
  upsertVisitor,
} from "@/repositories/thought.repositories"
import type { ThoughtEntryFields } from "@/repositories/thought.repositories"

export type ContextPayload = {
  visitorId: string
  sessionId: string
  threadId: string
  threadTitle?: string
}

export type SaveThoughtParams = {
  thought: string
  intent: string
  status: "REFLECTION_COMPLETE"
  threadId: string
  sessionId: string
  visitorId: string
  analysis: ThoughtEntryFields
}

export async function ensureThreadContext(payload: ContextPayload) {
  await upsertVisitor(payload.visitorId)
  await upsertSession(payload.sessionId, payload.visitorId)
  await upsertThread(payload.threadId, payload.sessionId, payload.visitorId, payload.threadTitle)
}

export async function fetchRecentThoughts(sessionId: string, limit = 5) {
  return getRecentThoughtsForSession(sessionId, limit)
}

export async function fetchThreadContext(threadId: string) {
  const thoughts = await getThoughtsByThread(threadId)
  const thread = await getThreadById(threadId)
  if (thread && !thread.situation && thoughts.length > 0) {
    const firstThoughtWithSituation = thoughts.find(
      (entry) => entry.situation && entry.situation.trim().length > 0
    )

    if (firstThoughtWithSituation) {
      thread.situation = firstThoughtWithSituation.situation
    }
  }
  return {
    situation: thread?.situation ?? null,
    story: thoughts[0]?.story ?? null,
    thoughts,
  }
}

export async function updateThreadSituation(threadId: string, situation: string) {
  return setThreadSituation(threadId, situation)
}

export async function saveThoughtReflection(params: SaveThoughtParams) {
  const entryData = buildThoughtEntryData(
    {
      thought: params.thought,
      intent: params.intent,
      status: params.status,
      threadId: params.threadId,
      sessionId: params.sessionId,
      visitorId: params.visitorId,
    },
    params.analysis,
  )
  return createThoughtEntry(entryData)
}

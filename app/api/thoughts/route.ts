import {
  getThoughts,
  getThoughtsByThread
} from "@/repositories/thought.repositories"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const threadId = url.searchParams.get("threadId")

  const thoughts = threadId
    ? await getThoughtsByThread(threadId)
    : await getThoughts()

  return Response.json(thoughts)
}

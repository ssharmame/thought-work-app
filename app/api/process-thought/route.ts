import { processAndStoreThought } from "@/services/thought.service"

export async function POST(req: Request) {

  const { thought } = await req.json()

  const result = await processAndStoreThought(thought)

  return Response.json(result)
}
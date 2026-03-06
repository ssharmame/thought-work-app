import { getThoughts } from "@/repositories/thought.repositories"

export async function GET() {

  const thoughts = await getThoughts()

  return Response.json(thoughts)
}
import { generateAcknowledgement } from "@/lib/ai"

export async function POST(req: Request) {
  try {
    const { thought } = await req.json()

    if (!thought || typeof thought !== "string") {
      return Response.json({
        acknowledgement: "",
        reassurance: "Right now, in this moment, you are okay.",
      })
    }

    const result = await generateAcknowledgement(thought.trim())

    return Response.json(result)
  } catch (error) {
    console.error("/api/acknowledge error", error)
    return Response.json({
      acknowledgement: "",
      reassurance: "Right now, in this moment, you are okay.",
    })
  }
}

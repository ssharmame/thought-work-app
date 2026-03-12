import { processAndStoreThought } from "@/services/thought.service"

export async function POST(req: Request) {
  try {
    const { thought, visitorId, sessionId, threadId, threadTitle } = await req.json()

    if (!thought || !visitorId || !sessionId || !threadId) {
      return Response.json(
        {
          valid: false,
          message: "Missing context identifiers",
          situation: "",
          fact: "",
          story: "",
          emotion: "",
          pattern: "",
          patternExplanation: "",
          normalization: "",
          reflectionQuestion: "",
          balancedThought: "",
          suggestions: []
        },
        { status: 400 }
      )
    }

    const result = await processAndStoreThought({
      thought,
      visitorId,
      sessionId,
      threadId,
      threadTitle
    })

    if (result.type === "clarification") {
      return Response.json(result)
    }

    if (!result.valid) {
      return Response.json(result)
    }

    return Response.json(result)
  } catch (error) {
    console.error("/api/process-thought error", error)

    return Response.json(
      {
        valid: false,
        message: "Something went wrong while processing your thought.",
        situation: "",
        fact: "",
        story: "",
        emotion: "",
        pattern: "",
        patternExplanation: "",
        normalization: "",
        reflectionQuestion: "",
        balancedThought: "",
        suggestions: []
      },
      { status: 500 }
    )
  }
}

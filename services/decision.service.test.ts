import { describe, expect, it } from "vitest"
import { handleClassification } from "./decision.service"

describe("handleClassification", () => {
  it("continues on THOUGHT", () => {
    expect(handleClassification("THOUGHT", "I think this is happening.")).toEqual({
      status: "continue",
    })
  })

  it("routes SOLUTION_SEEKING to guidance", () => {
    const result = handleClassification("SOLUTION_SEEKING", "What should I do?")
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("advice")
  })

  it("upgrades SOLUTION_SEEKING to thought when belief present", () => {
    const result = handleClassification(
      "SOLUTION_SEEKING",
      "I think I failed my interview. Can you help me?",
    )
    expect(result.status).toBe("continue")
  })

  it("guides SITUATION inputs", () => {
    const result = handleClassification("SITUATION", "I went to the store.")
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("situation")
  })

  it("guides EMOTIONAL_EXPRESSION inputs", () => {
    const result = handleClassification("EMOTIONAL_EXPRESSION", "I feel sad.")
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("feeling")
  })

  it("guides GENERAL_QUESTION inputs", () => {
    const result = handleClassification("GENERAL_QUESTION", "What time is it?")
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("thought or interpretation")
  })

  it("returns safety for SELF_HARM_RISK", () => {
    const result = handleClassification("SELF_HARM_RISK", "I want to die.")
    expect(result.status).toBe("safety")
    expect(result.message).toContain("danger")
  })

  it("defaults to guidance when unknown", () => {
    const result = handleClassification("UNKNOWN", "Random input")
    expect(result.status).toBe("guidance")
  })
})

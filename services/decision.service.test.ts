import { describe, expect, it, vi } from "vitest"
import { handleClassification } from "./decision.service"
import { classifyThoughtIntent } from "@/lib/ai"

vi.mock("@/lib/ai", () => ({
  classifyThoughtIntent: vi.fn(),
}))

describe("handleClassification", () => {
  it("continues on DISTORTED_THOUGHT", async () => {
    vi.mocked(classifyThoughtIntent).mockResolvedValue({
      type: "DISTORTED_THOUGHT",
      shouldRunReflection: true,
      message: null,
    })

    await expect(
      handleClassification("THOUGHT", "I think this is happening.", true)
    ).resolves.toEqual({
      status: "continue",
    })
  })

  it("routes THOUGHT to guidance when intent is non-distorted", async () => {
    vi.mocked(classifyThoughtIntent).mockResolvedValue({
      type: "BALANCED_THOUGHT",
      shouldRunReflection: false,
      message:
        "Your thought already seems balanced and reflective. If another worrying thought or concern comes up about this situation, you can share it here.",
    })

    const result = await handleClassification(
      "THOUGHT",
      "I may not have the full picture yet.",
      true
    )
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("balanced")
  })

  it("routes SOLUTION_SEEKING to guidance when valid=false", async () => {
    const result = await handleClassification(
      "SOLUTION_SEEKING",
      "What should I do?",
      false
    )
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("rather than giving advice")
  })

  it("treats SOLUTION_SEEKING as thought when valid=true", async () => {
    vi.mocked(classifyThoughtIntent).mockResolvedValue({
      type: "DISTORTED_THOUGHT",
      shouldRunReflection: true,
      message: null,
    })

    const result = await handleClassification(
      "SOLUTION_SEEKING",
      "I think I failed my interview. Can you help me?",
      true
    )
    expect(result.status).toBe("continue")
  })

  it("guides SITUATION inputs", async () => {
    const result = await handleClassification("SITUATION", "I went to the store.", false)
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("situation")
  })

  it("guides EMOTIONAL_EXPRESSION inputs", async () => {
    const result = await handleClassification("EMOTIONAL_EXPRESSION", "I feel sad.", false)
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("feeling")
  })

  it("guides GENERAL_QUESTION inputs", async () => {
    const result = await handleClassification("GENERAL_QUESTION", "What time is it?", false)
    expect(result.status).toBe("guidance")
    expect(result.message).toContain("thought or interpretation")
  })

  it("returns safety for SELF_HARM_RISK", async () => {
    const result = await handleClassification("SELF_HARM_RISK", "I want to die.", true)
    expect(result.status).toBe("safety")
    expect(result.message).toContain("danger")
  })

  it("defaults to guidance when unknown", async () => {
    const result = await handleClassification("UNKNOWN", "Random input", false)
    expect(result.status).toBe("guidance")
  })
})

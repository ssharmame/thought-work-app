import { describe, expect, it } from "vitest"
import { validateSimpleInput } from "./simpleValidation"

describe("validateSimpleInput", () => {
  it("rejects empty input", () => {
    expect(validateSimpleInput("").valid).toBe(false)
  })

  it("rejects short input", () => {
    const result = validateSimpleInput("ok")
    expect(result.valid).toBe(false)
    expect(result.message).toContain("Try writing a thought")
  })

  it("rejects overly long input", () => {
    const long = "a".repeat(401)
    const result = validateSimpleInput(long)
    expect(result.valid).toBe(false)
    expect(result.message).toContain("long description")
  })

  it("accepts normal input", () => {
    expect(validateSimpleInput("I am worried about my interview").valid).toBe(true)
  })
})

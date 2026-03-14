export type SimpleValidationResult = {
  valid: boolean
  message?: string
}

export function validateSimpleInput(input: string): SimpleValidationResult {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length === 0) {
    return {
      valid: false,
      message: "It looks like there isn’t enough information here yet. Try writing a thought that’s on your mind.",
    }
  }

  if (trimmed.length < 3) {
    return {
      valid: false,
      message: "It looks like there isn’t enough information here yet. Try writing a thought that’s on your mind.",
    }
  }

  if (trimmed.length > 400) {
    return {
      valid: false,
      message: "Try writing a single thought instead of a long description so we can look at it more clearly.",
    }
  }

  return { valid: true }
}

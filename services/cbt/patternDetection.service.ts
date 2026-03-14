// Simple heuristics to detect common CBT distortions from an automatic thought.

const heuristicPatterns: Array<{
  regex: RegExp
  pattern: string
  explanation: string
}> = [
  {
    regex: /\b(always|never)\b/i,
    pattern: "Overgeneralization",
    explanation: "Drawing broad conclusions about the situation from a single event.",
  },
  {
    regex: /\b(maybe|probabl|probably)\b.*\b(will|happen|fail)\b/i,
    pattern: "Catastrophizing",
    explanation: "Assuming the worst possible outcome before evidence arrives.",
  },
  {
    regex: /\b(i think|i believe|i must|i should)\b/i,
    pattern: "Mind Reading",
    explanation: "Assuming you know what others think without confirmation.",
  },
  {
    regex: /\b(i am not|i am)\b.*\b(good enough|worthy|enough)\b/i,
    pattern: "Self-Criticism",
    explanation: "Judging yourself harshly rather than noticing nuance in the situation.",
  },
]

export type PatternDetectionResult = {
  pattern: string | null
  patternExplanation: string | null
}

export function detectPatternForAutomaticThought(
  automaticThought: string,
): PatternDetectionResult {
  const normalized = automaticThought.trim()
  if (!normalized) {
    return { pattern: null, patternExplanation: null }
  }

  for (const heuristic of heuristicPatterns) {
    if (heuristic.regex.test(normalized)) {
      return {
        pattern: heuristic.pattern,
        patternExplanation: heuristic.explanation,
      }
    }
  }

  return {
    pattern: null,
    patternExplanation: null,
  }
}

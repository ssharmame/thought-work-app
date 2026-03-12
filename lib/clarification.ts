export const clarificationQuestions = [
  "What exactly are you trying to explain?",
  "What part of the situation feels most difficult right now?",
  "What have you already tried?",
  "What might you try differently?"
]

export function detectSolutionSeeking(message: string) {
  const normalized = message.toLowerCase()
  const phrases = [
    "what should i do",
    "how do i fix",
    "what is the solution",
    "what can i do",
    "how do i move forward",
    "what should i do next",
    "how do i solve",
    "help me fix"
  ]
  return phrases.some((phrase) => normalized.includes(phrase))
}

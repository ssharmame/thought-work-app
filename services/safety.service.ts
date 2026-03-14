const selfHarmSignals = [
  "i want to die",
  "i want to kill myself",
  "i feel like dying",
  "everyone would be better without me",
]

export function detectSelfHarm(text: string) {
  const normalized = text.toLowerCase()
  return selfHarmSignals.some((signal) => normalized.includes(signal))
}

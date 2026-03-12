import OpenAI from "openai"

type ClassificationResult = { type: string }

type AnalysisResult = {
  situation: string
  fact: string
  automaticThought: string
  story: string
  emotion: string
  pattern: string
  patternExplanation: string
  normalization: string
  trigger: string
  coreBelief: string
  reflectionQuestion: string
  balancedThought: string
}

type SuggestionsInput = {
  situation: string
  automaticThought: string
  emotion: string
  pattern: string
  previousThoughts: string[]
}

type SuggestionsResult = {
  suggestions: string[]
}

const MODEL = "gpt-4o-mini"
let client: OpenAI | null = null

function getClient() {
  if (client) return client
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key")
  }
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return client
}

function buildContext(previousThoughts: string[]) {
  if (!previousThoughts.length) return ""
  const trimmed = previousThoughts
    .slice(-5)
    .map((entry, index) => `${index + 1}. ${entry}`)
    .join("\n")
  return `Previous thoughts in this thread:\n${trimmed}\n\n`
}

function wrapBlock(label: string, value: string | null | undefined) {
  const safe = value && value.trim() ? value.trim() : "not clearly described"
  return `${label}:\n"""\n${safe}\n"""\n`
}

async function runPrompt<T>(prompt: string): Promise<T> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.choices?.[0]?.message?.content?.trim()
  if (!text) {
    throw new Error("AI returned an empty response")
  }

  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1) {
    throw new Error("AI response did not contain JSON")
  }

  const jsonString = text.slice(start, end + 1)
  return JSON.parse(jsonString)
}

export async function classifyInput(thought: string): Promise<ClassificationResult> {
  const prompt = `
You are a classifier.

Classify the user's input into one of these categories:

THOUGHT
Interpretation, prediction, worry, or judgment.

SITUATION
Neutral description without interpretation.

SOLUTION_SEEKING
User asking for advice or instructions.

INVALID
Random or meaningless text.

Return JSON only:
{
  "type": "THOUGHT"
}

Input:
"""
${thought.trim()}
"""
`
  return runPrompt<ClassificationResult>(prompt)
}

export async function analyzeThought(
  thought: string,
  previousThoughts: string[] = [],
): Promise<AnalysisResult> {
  const contextStory = buildContext(previousThoughts)
  const prompt = `
${contextStory}You are ThoughtLens, an AI cognitive reflection assistant trained in Cognitive Behavioral Therapy (CBT).

As you analyze the following thought, follow these rules:
• Do NOT invent situations.
• Use thread context only when it clearly describes the situation.
• Separate facts (observable reality) from the story the mind tells.
• If something is unclear, respond with "not clearly described".
• Maintain a calm, reflective tone.

Thought to analyze:
"""
${thought.trim()}
"""

Return ONLY valid JSON with the exact keys below:
{
  "situation": "",
  "fact": "",
  "automaticThought": "",
  "story": "",
  "emotion": "",
  "pattern": "",
  "patternExplanation": "",
  "normalization": "",
  "trigger": "",
  "coreBelief": "",
  "reflectionQuestion": "",
  "balancedThought": ""
}
`
  return runPrompt<AnalysisResult>(prompt)
}

export async function generateSuggestions(
  input: SuggestionsInput,
): Promise<SuggestionsResult> {
  const contextStory = buildContext(input.previousThoughts)
  const prompt = `
${contextStory}Generate 3–5 possible automatic thoughts that the user's mind might produce next.

Context:
Situation: ${input.situation || "not clearly described"}
Automatic thought: ${input.automaticThought || "not clearly expressed"}
Emotion: ${input.emotion || "uncertain"}
Thinking pattern: ${input.pattern || "none"}

Rules:
• Sound like internal thoughts, continuing the same worry or interpretation.
• Stay within the same situation context.
• Reflect the same thinking pattern (if one exists).
• Maximum 12 words per sentence and no advice language.
• Avoid encouragement, positive reframes, balanced thoughts, or solutions.

Do NOT generate:
• Advice
• Solutions
• Encouragement or motivation
• Self-improvement suggestions
• Balanced thoughts

Bad examples (for reference, do not output these):
"It's possible the right opportunity hasn't come yet."
"Maybe I should improve my skills."
"I should explore other roles."

Return JSON only:
{
  "suggestions": [
    "",
    "",
    "",
    ""
  ]
}
`
  return runPrompt<SuggestionsResult>(prompt)
}

import OpenAI from "openai"
import type {
  FactStoryStage,
  RecognitionStage,
  PatternStage,
  BalancedStage,
  NextThoughtStage,
} from "@/services/reflectionValidator.service"

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

async function runPrompt<T>(prompt: string): Promise<T> {
  console.log("OPENAI CALL")
  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  })

  const message = response.choices?.[0]?.message

  if (!message) {
    console.error("AI RESPONSE ERROR:", response)
    throw new Error("AI returned no message")
  }

  let text = ""

  const content = message.content as unknown
  if (typeof content === "string") {
    text = content
  } else if (Array.isArray(content)) {
    text = content
      .map((part) => {
        if (!part || typeof part !== "object") return ""
        const maybeText = (part as { text?: unknown }).text
        return typeof maybeText === "string" ? maybeText : ""
      })
      .join("")
  }

  text = text.trim()

  console.log("AI RAW RESPONSE:", text)

  if (!text) {
    console.error("AI RESPONSE ERROR:", response)
    throw new Error("AI returned empty response")
  }

  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")

  if (start === -1 || end === -1) {
    console.error("AI invalid JSON:", text)
    console.error("AI RESPONSE ERROR:", response)
    throw new Error("AI response missing JSON")
  }

  const json = text.slice(start, end + 1)

  return JSON.parse(json)
}

type ClassificationType =
  | "THOUGHT"
  | "SELF_HARM_RISK"
  | "SOLUTION_SEEKING"
  | "SITUATION"
  | "EMOTIONAL_EXPRESSION"
  | "GENERAL_QUESTION"

const classificationCategories: Record<ClassificationType, string> = {
  THOUGHT:
    "the statement shares a belief, worry, interpretation, or internal narrative about a situation.",
  SELF_HARM_RISK:
    "language suggests the writer may be considering harming themselves or is in immediate danger.",
  SOLUTION_SEEKING:
    "the statement explicitly asks for advice, instructions, or a recommendation.",
  SITUATION:
    "the statement describes an external event or circumstance without an obvious thought attached.",
  EMOTIONAL_EXPRESSION:
    "the statement names a feeling without an accompanying interpretation.",
  GENERAL_QUESTION:
    "the statement asks a factual or curiosity-driven question unrelated to internal narrative.",
}

type ClassificationResult = {
  type: ClassificationType
  reason: string
  valid: boolean
}

export type SituationContinuityInput = {
  situation: string
  thought: string
  threadHistory: string[]
}

export type SituationContinuityResult = {
  sameSituation: boolean
}

const classificationInstructions = `
You are a careful classifier that determines the intent of a user's statement.

Place the user's message into **exactly one** of the following categories:

${Object.entries(classificationCategories)
  .map(([label, description]) => `- ${label}: ${description}`)
  .join("\n")}

Follow these rules in order:

1. **SELF_HARM_RISK has the highest priority.**
   If the text suggests the user may harm themselves or is in immediate danger, choose SELF_HARM_RISK.

2. **If the text explicitly asks for help, advice, or recommendations**, choose SOLUTION_SEEKING.
   Examples:
   "Can you help me?"
   "What should I do?"
   "Any advice?"
   "How do I handle this?"

3. If the text contains an **interpretation, belief, worry, or assumption about a situation**, choose THOUGHT.

4. If the text **only describes an external event** with no interpretation, choose SITUATION.

5. If the text **only expresses a feeling** without interpretation or request, choose EMOTIONAL_EXPRESSION.

6. If the text is a **general factual question unrelated to internal thoughts**, choose GENERAL_QUESTION.

Important clarification:

If a message contains **both a help request and a thought**, classify it as **SOLUTION_SEEKING**, but set "valid": true because the statement still contains a self-reflective thought.

Example:

Input:
"I think I didn't get the job. Can you help me?"

Output:
{
  "type": "SOLUTION_SEEKING",
  "reason": "The user asks for help while also expressing a belief about the situation.",
  "valid": true
}

Return **JSON only** using this format:

{
  "type": "THOUGHT",
  "reason": "(brief rationale for category choice)",
  "valid": true
}

Do not include any text outside the JSON.

Set "valid" to true when the text contains a self-reflective thought or safety concern.
Set "valid" to false when the text is purely a request for advice, a factual question, or a simple emotional expression without an interpretation.
`

const emotionRules: Record<string, string[]> = {
  anxiety: ["what if", "worried", "maybe", "probably", "might"],
  doubt: ["i guess", "maybe", "probably"],
  sadness: ["disappointed", "hopeless"],
  shame: ["i messed up", "i failed", "not good enough"],
}

export function inferEmotionFromText(text: string): string | null {
  const normalized = text.toLowerCase()
  for (const [emotion, keywords] of Object.entries(emotionRules)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return emotion
    }
  }
  return null
}

export async function classifyInput(text: string): Promise<ClassificationResult> {
  const prompt = `${classificationInstructions}

User input:
"""
${text.trim()}
"""
`

  return runPrompt<ClassificationResult>(prompt)
}

export async function classifySituationContinuity(
  input: SituationContinuityInput
): Promise<SituationContinuityResult> {
  const history = input.threadHistory.length
    ? input.threadHistory.slice(-5).map((item) => `- ${item}`).join("\n")
    : "- none -"

  const prompt = `
Determine whether the new thought refers to the same situation as the existing reflection thread.

Situation:
"${input.situation}"

New thought:
"${input.thought}"

Previous thoughts:
${history}

Rules:
• SAME_SITUATION if the thought is an interpretation, worry, or assumption about the same event.
• NEW_SITUATION if the thought refers to a completely different life event or topic.

Return JSON only:
{
"sameSituation": true
}
`

  return runPrompt<SituationContinuityResult>(prompt)
}

const THREAD_CONTEXT_BLOCK = `
Context:
The situation below is the same situation across the entire thread.

The user is expressing a new thought about the same situation.

The situation describes what actually happened.
SITUATION must describe something a camera could record.
The thought describes what the mind concluded.

Do NOT reinterpret the situation.
Do NOT generate a new situation.
Focus only on the user's current interpretation.

`

const IMPORTANT_SITUATION_RULE = `
Important rule:
The situation described above does not change in this thread.
Do not reinterpret or modify the situation.
The user's thoughts may change but the situation remains the same.

`

const FIRST_PERSON_RULE = `
Write responses in first-person reflection.

Always use:
"I", "my", or "this situation".

Never use third-person descriptions such as:
"the speaker"
"the individual"
"the person"

Incorrect:
"The individual has not received a response."

Correct:
"I have not received a response."

`

function buildContext(
  situation: string | null,
  previousThoughts: string[],
  previousPatterns: string[]
) {
  const normalizedSituation = situation?.trim() || "No situation recorded yet."

  const formattedThoughts = previousThoughts.length
    ? previousThoughts
        .slice(-5)
        .map((entry, index) => `${index + 1}. ${entry}`)
        .join("\n")
    : "- none yet -"

  const formattedPatterns = previousPatterns.length
    ? previousPatterns
        .slice(-5)
        .map((pattern, index) => `${index + 1}. ${pattern}`)
        .join("\n")
    : "- none yet -"

  return `Situation in this thread:
${normalizedSituation}

Previous thoughts:
${formattedThoughts}

Previous patterns:
${formattedPatterns}

`
}

export async function extractSituation(thought: string) {
  const prompt = `
You are extracting the factual situation from a user's thought.

Thought:
"""
${thought.trim()}
"""

Rules:
• Extract only the observable event.
• SITUATION must describe something a camera could record.
• Remove interpretations, conclusions, and assumptions.
• Do NOT restate opinions like "I think", "maybe", or "they probably".
• Write in first-person language using "I" or "my".
• Keep the sentence factual and short.

Example:

Input:
"It has been 3 days that I have given interviews but no response yet. I think I have not been selected."

Output:
{
"situation": "It has been 3 days since my interviews and I have not received a response."
}

Return JSON only.
{
  "situation": ""
}
`

  return runPrompt<{ situation: string }>(prompt)
}

function removeSituationFromStory(story: string, situation: string): string {
  const trimmedStory = story.trim()
  const trimmedSituation = situation.trim()
  if (!trimmedStory || !trimmedSituation) return trimmedStory

  const storyLower = trimmedStory.toLowerCase()
  const situationLower = trimmedSituation.toLowerCase()
  if (!storyLower.includes(situationLower)) return trimmedStory

  const escapedSituation = trimmedSituation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const withoutSituation = trimmedStory
    .replace(new RegExp(escapedSituation, "ig"), "")
    .replace(/\s+/g, " ")
    .trim()

  return withoutSituation
}

export async function generateFactStoryStage(
  thought: string,
  previousThoughts: string[] = [],
  situation: string | null = null,
  previousPatterns: string[] = []
): Promise<FactStoryStage> {

  const context = buildContext(situation, previousThoughts, previousPatterns)

  // Remove help requests before AI extraction
  const cleanedThought = thought
    .replace(/(can you help.*|please help.*|any advice.*|what should i do.*)$/i, "")
    .trim()

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
${context}

Scope: analyze ONLY the current thought.
Do NOT infer deeper beliefs or long-term patterns.

You are helping me separate what actually happened from what my mind concluded.

Split the thought into two parts.

SITUATION (fact)
• The observable event.
• SITUATION must describe something a camera could record.
• Something an outside observer could confirm.
• Must NOT include interpretations or conclusions.
• Written in first person.

STORY (automatic thought)
• The interpretation my mind made about the situation.
• This must contain ONLY the belief or assumption.
• Remove any description of the event itself.
• The "story" must represent the interpretation or belief, not just the emotion.
• Incorrect story: "I am worried."
• Correct story: "I might fail the exam."

Important rule:
The "situation" field must NEVER be empty.

If the user only expresses a thought, worry, or feeling without describing the event,
infer the most likely real-world situation that would produce that thought.

The situation should still represent something that could realistically happen in the world.

Examples:

Example 1
Thought:
"I am worried about my exam result."

Return:
{
"stage": "fact_story",
"situation": "I am waiting for my exam result.",
"story": "I might not do well on the exam.",
"emotions": ["worried"]
}

Example 2
Thought:
"Maybe they didn't like my answers."

Return:
{
"stage": "fact_story",
"situation": "I recently completed an interview.",
"story": "Maybe they didn't like my answers.",
"emotions": ["anxious"]
}

Example 3
Thought:
"I think my manager is upset with me."

Return:
{
"stage": "fact_story",
"situation": "My manager gave me feedback earlier today.",
"story": "My manager might be upset with me.",
"emotions": ["anxious"]
}

EMOTION RULE
• Emotions must be single-word labels such as:
anxious
worried
sad
disappointed
embarrassed

Example:

Thought:
"It has been 3 days that I have given interviews but no response yet. I think I have not been selected."

Return:

{
  "stage": "fact_story",
  "situation": "It has been 3 days since my interviews and I have not received a response.",
  "story": "I think I have not been selected.",
  "emotions": ["disappointed"]
}

Thought:
"""
${cleanedThought}
"""

Return ONLY JSON.

{
  "stage": "fact_story",
  "situation": "",
  "story": "",
  "emotions": []
}

The situation field must never be empty.
`

  const factStory = await runPrompt<FactStoryStage>(prompt)

  const extractedSituation = factStory.situation?.trim() || ""

  // TRUST AI story — do not split sentences
  let normalizedStory = factStory.story?.trim() || cleanedThought

  // Only remove duplicated situation text
  if (extractedSituation) {
    normalizedStory = removeSituationFromStory(normalizedStory, extractedSituation)
  }

  if (!normalizedStory) {
    normalizedStory = cleanedThought
  }

  const normalizedEmotions = (factStory.emotions ?? [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0)

  const fallbackEmotion = inferEmotionFromText(cleanedThought)

  const emotions =
    normalizedEmotions.length > 0
      ? normalizedEmotions
      : [fallbackEmotion ?? "anxiety"]

 return {
  ...factStory,
  situation: extractedSituation,
  story: normalizedStory,
  emotions,
}
}

export type RecognitionContext = {
  situation: string
  story: string
  emotion: string
}

export type StoryEmotionInput = {
  situation: string
  thought: string
  previousThoughts?: string[]
  previousPatterns?: string[]
}

export async function generateStoryEmotionStage(
  input: StoryEmotionInput
): Promise<{ story: string; emotions: string[] }> {
  const story = input.thought.trim()
  const context = buildContext(
    input.situation,
    input.previousThoughts ?? [],
    input.previousPatterns ?? []
  )

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
${context}
Scope: analyze ONLY the current thought.
Do NOT infer deeper beliefs or long-term patterns.

You are helping me identify emotions for an interpretation that is already extracted.

Situation:
"""
${input.situation.trim()}
"""

Interpretation (already extracted):
"""
${story}
"""

Rules:
• Do NOT change the situation.
• Do NOT reinterpret the situation.
• SITUATION must describe something a camera could record.
• The interpretation has already been extracted.
• Do NOT rewrite or modify it.
• Only identify emotions.
• Provide 1–3 short emotion words that capture how I feel (single words only).
• Describe the emotions using first-person language.
• Emotions must be words only, not phrases or sentences.

Return JSON only.
{
  "stage": "story_emotion",
  "emotions": []
}
`

  const response = await runPrompt<{ emotions: string[] }>(prompt)
  const normalizedEmotions = (response.emotions ?? [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0)
  const fallbackEmotion = inferEmotionFromText(story)

  return {
    story,
    emotions:
      normalizedEmotions.length > 0
        ? normalizedEmotions
        : [fallbackEmotion ?? "anxiety"],
  }
}

export async function generateRecognitionStage(
  context: RecognitionContext
): Promise<RecognitionStage> {

  const prompt = `
${FIRST_PERSON_RULE}
Scope: analyze ONLY the current thought.
Do NOT infer deeper beliefs or long-term patterns.

You are a thoughtful friend helping me notice my thinking.

The situation I described is:
"${context.situation}"

SITUATION must describe something a camera could record.

My current interpretation is:
"${context.story}"

The emotion I feel is:
${context.emotion}

Write a gentle prompt helping me notice this interpretation.

Return ONLY JSON. Do not include any explanation text outside the JSON.

{
 "stage": "recognition",
 "prompt": "",
 "suggestions": [
  "",
  "",
  "",
  ""
 ]
}
`

  return runPrompt<RecognitionStage>(prompt)
}

const distortions = [
  "Mind reading",
  "Fortune telling",
  "Catastrophizing",
  "All-or-nothing thinking",
  "Overgeneralization",
  "Emotional reasoning",
  "Labeling",
  "Should statements",
  "Personalization",
  "Self criticism",
  "Comparison thinking"
]

const patternExplanationMap: Record<string, string> = {
  "Mind reading":
    "Your mind seems to assume what others might be thinking.",
  "Fortune telling":
    "Your mind may be predicting a negative outcome before having enough information.",
  "Self criticism":
    "Your mind may be judging your performance very harshly.",
  "Comparison thinking":
    "Your mind may be comparing you to others in a way that makes you feel worse about yourself.",
  "Catastrophizing":
    "Your mind may be imagining the worst possible outcome.",
  "All-or-nothing thinking":
    "Your mind may be seeing things as total success or total failure.",
  "Overgeneralization":
    "Your mind may be drawing broad conclusions from one situation.",
}

const normalizedPatternExplanationMap = Object.fromEntries(
  Object.entries(patternExplanationMap).map(([key, value]) => [
    key.toLowerCase(),
    value,
  ])
)

const distortionProgression: Record<string, string[]> = {
  "Fortune telling": ["Mind reading", "Self criticism"],
  "Mind reading": ["Self criticism", "Comparison thinking"],
  "Self criticism": ["Hopelessness", "Overgeneralization"],
  "Comparison thinking": ["Self criticism"],
}

const normalizedDistortionProgression = Object.fromEntries(
  Object.entries(distortionProgression).map(([key, values]) => [
    key.toLowerCase(),
    values,
  ])
)

export function getDistortionProgression(
  pattern: string | null
): string[] | undefined {
  if (!pattern) return undefined
  return normalizedDistortionProgression[pattern.trim().toLowerCase()]
}

export function getAllowedDistortions(pattern: string | null) {
  if (!pattern) return distortions
  const progression = getDistortionProgression(pattern)
  if (!progression) return distortions
  return progression
}

export function detectPatternFromText(text: string): string | null {
  const t = text.toLowerCase()
  if (t.includes("they think") || t.includes("they must") || t.includes("they probably")) {
    return "Mind reading"
  }
  if (t.includes("going to") || t.includes("will") || t.includes("definitely")) {
    return "Fortune telling"
  }
  if (
    t.includes("i probably didn't") ||
    t.includes("i messed up") ||
    t.includes("i didn't do well") ||
    t.includes("not good enough")
  ) {
    return "Self criticism"
  }
  if (t.includes("maybe i'm not")) {
    return "Self criticism"
  }
  if (
    t.includes("better than me") ||
    t.includes("more qualified") ||
    t.includes("more impressive") ||
    t.includes("others are better")
  ) {
    return "Comparison thinking"
  }
  if (t.includes("i always")) {
    return "Overgeneralization"
  }
  return null
}

export function detectInsight(text: string): boolean {
  const t = text.toLowerCase()

  return (
    t.includes("maybe i'm") ||
    t.includes("maybe i am") ||
    t.includes("i might be") ||
    t.includes("perhaps i'm") ||
    t.includes("perhaps i am") ||
    t.includes("i could be") ||
    t.includes("i may be") ||
    t.includes("overthinking") ||
    t.includes("jumping to conclusions")
  )
}

export function detectCoreBelief(text: string): string | null {
  const t = text.toLowerCase()

  if (t.includes("not good enough")) return "I am not good enough"

  if (t.includes("i always fail") || t.includes("i never succeed"))
    return "I will fail"

  if (t.includes("people don't like me"))
    return "People will reject me"

  if (t.includes("i'm not capable") || t.includes("i can't do this"))
    return "I am not capable"

  return null
}

function isInvalidSuggestionText(suggestion: string): boolean {
  const normalized = suggestion.toLowerCase().trim()
  if (!normalized) return true

  const advicePattern = /\b(should|must|need to|have to|try to|go and)\b/
  const reassurancePattern = /\b(don't worry|it'?s okay|it will be fine|you'll be fine|everything will be okay)\b/

  if (advicePattern.test(normalized)) return true
  if (reassurancePattern.test(normalized)) return true

  return false
}

export type ThoughtContext = {
  situation: string
  interpretation: string
  emotion: string
  pattern?: string | null
  previousThoughts?: string[]
  previousPatterns?: string[]
  historyLength?: number
  balancedThought?: string
  thoughtHistory?: string[]
}

export async function generatePatternStage(
  context: ThoughtContext
): Promise<PatternStage> {

  const situation = context.situation.trim() || "I described an unfolding situation."
  const interpretation =
    context.interpretation.trim() || "A discouraging interpretation of the situation."
  const emotion = context.emotion.trim() || "uncertainty"
  const contextBlock = buildContext(
    context.situation,
    context.previousThoughts ?? [],
    context.previousPatterns ?? []
  )

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
${contextBlock}
Scope: analyze ONLY the current thought.
Do NOT infer deeper beliefs or long-term patterns.

Given a situation, current thought, and emotion, identify the cognitive distortion that best matches my interpretation.

Situation:
"""
${situation}
"""

SITUATION must describe something a camera could record.

Interpretation:
"""
${interpretation}
"""

Emotion:
${emotion}

Choose ONLY from this list:

${distortions.join("\n")}

You must choose ONLY from the provided distortion list.
Do not invent new distortion names.

If none apply return null.

Return ONLY JSON. Do not include any explanation text outside the JSON.

{
 "stage": "pattern",
 "pattern": null,
 "explanation": null
}
`

  const result = await runPrompt<PatternStage>(prompt)
  const aiPattern = result.pattern?.trim() || null
  const rulePattern = detectPatternFromText(interpretation)
  const finalPattern = rulePattern || aiPattern
  const normalizedKey = finalPattern?.trim().toLowerCase() ?? ""
  const mappedExplanation =
    normalizedKey && normalizedPatternExplanationMap[normalizedKey]
      ? normalizedPatternExplanationMap[normalizedKey]
      : result.explanation

  return {
    ...result,
    pattern: finalPattern,
    explanation: mappedExplanation,
  }
}

export async function generateBalancedStage(
  context: ThoughtContext
): Promise<BalancedStage> {

  const situation = context.situation.trim() || "I described an unfolding situation."
  const interpretation =
    context.interpretation.trim() || "A discouraging interpretation of the situation."
  const emotion = context.emotion.trim() || "uncertainty"
  const pattern = context.pattern?.trim() || "not identified"
  const contextBlock = buildContext(
    context.situation,
    context.previousThoughts ?? [],
    context.previousPatterns ?? []
  )

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
${contextBlock}
Scope: analyze ONLY the current thought.
Do NOT infer deeper beliefs or long-term patterns.

You are helping me slow down and think about my interpretation in a calmer way.

LANGUAGE STYLE (VERY IMPORTANT)

Write in simple everyday language.

Do NOT sound like a therapist, psychologist, or textbook.

Avoid technical or academic phrases such as:
"influencing perception"
"cognitive bias"
"interpretation distortion"
"evidence suggests"
"the situation contradicts"

Instead write the way a thoughtful person would talk to themselves.

Good tone examples:
"My mind might be assuming the worst."
"I may not have the full picture yet."
"There could be other explanations."

Write 2–3 short sentences.
Each sentence should express one simple idea.

Avoid:
• motivational language
• advice
• reassurance
• guarantees about the future
• statements about worth, success, or ability

The goal is simply to look at the situation in a calmer and more realistic way.

Situation:
"""
${situation}
"""

SITUATION must describe something a camera could record.

My current thought:
"""
${interpretation}
"""

Emotion I feel:
${emotion}

Thinking pattern:
${pattern}

Balanced perspective guidelines:

1. Acknowledge the feeling or uncertainty.
2. Restate the situation briefly.
3. Offer a calmer or alternative interpretation.

Write the response as if I am thinking this to myself.

Before returning the answer ask yourself:

"Would a normal person say it this way?"

If it sounds clinical or academic, simplify it.

Return JSON only.

{
"stage": "balanced",
"balancedThought": ""
}
`

  return runPrompt<BalancedStage>(prompt)
}

export async function generateNextThoughtStage(
  context: ThoughtContext
): Promise<NextThoughtStage> {

  const situation = context.situation.trim() || "I described an unfolding situation."
  const interpretation =
    context.interpretation.trim() || "A discouraging interpretation of the situation."
  const pattern = context.pattern?.trim() || "not identified"
  const previousPatterns = context.previousPatterns ?? []
  const historyLength = context.historyLength ?? previousPatterns.length
  const contextBlock = buildContext(
    context.situation,
    context.previousThoughts ?? [],
    previousPatterns
  )
  const allowed = getAllowedDistortions(context.pattern ?? null)
  const allowedList = allowed.length ? allowed : distortions
  const lastThreePatterns = previousPatterns.slice(-3)
  const stabilized =
    historyLength >= 5 &&
    lastThreePatterns.length === 3 &&
    lastThreePatterns.every(
      (value, _, arr) => value && value === arr[0]
    )

  if (stabilized) {
    return { stage: "next_thought", suggestions: [] }
  }

  if (detectInsight(interpretation)) {
    return { stage: "next_thought", suggestions: [] }
  }

  const historyForBelief = context.thoughtHistory ?? []
  const beliefSource = [...historyForBelief.slice(-3), interpretation].join(" ")
  const belief = historyForBelief.length >= 2
    ? detectCoreBelief(beliefSource)
    : null
  if (belief) {
    return {
      stage: "next_thought",
      suggestions: [],
      coreBelief: belief,
    }
  }

  const previousThoughts = context.previousThoughts ?? []

// if (previousThoughts.length < 1) {
//   return { stage: "next_thought", suggestions: [] }
// }

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
${contextBlock}
Scope: analyze patterns across multiple thoughts within the same situation.

You are generating possible directions the mind might go next if rumination continues.

Context:

Situation:
"""
${situation}
"""

SITUATION must describe something a camera could record.

Current interpretation:
"""
${interpretation}
"""

Detected thinking pattern:
${pattern}

Balanced perspective:
"""
${context.balancedThought?.trim() || "None"}
"""

Previous thoughts already expressed:
${previousThoughts.length ? previousThoughts.join("\n") : "- none -"}

Your task:

Generate 4 possible internal thought directions that could appear next if rumination continues.

Rules:
1. The thoughts must remain tied to the same situation.
2. They should follow the same cognitive distortion pattern.
3. They must feel like internal negative interpretations (automatic thoughts).
4. They must NOT be reassurance or balanced thoughts.
5. Do not repeat any previous thoughts.
6. Do NOT introduce new life events or new situations.
7. Do NOT escalate into identity-level beliefs like "I am a failure."
8. Suggestions may be short statements or internal questions.
9. These should feel like possible directions the mind could go, not definitive conclusions.

The next automatic thoughts should reflect one of these thinking patterns:
${allowedList.join("\n")}

Bad examples:
"Maybe I'm overthinking this"
"I'm unsure what this means"
"This might not be true"

Good examples:
"Maybe they didn't think my answers were strong enough."
"Maybe another candidate had more experience."
"Maybe I didn't explain my work clearly."
"Maybe they didn't see the skills they wanted."

Return JSON:
{
"stage": "next_thought",
"suggestions": [
  "thought1",
  "thought2",
  "thought3",
  "thought4"
]
}
`

  const stage = await runPrompt<NextThoughtStage>(prompt)
  const filtered = (stage.suggestions ?? []).filter(
    (suggestion) => !isInvalidSuggestionText(suggestion)
  )

  return {
    ...stage,
    suggestions: filtered,
  }
}

export type SuggestionValidationInput = {
  situation: string
  suggestions: string[]
  pattern: string | null
}

export async function validateThoughtSuggestions(
  input: SuggestionValidationInput
): Promise<{ valid: boolean }> {
  const suggestionsList = input.suggestions.length
    ? input.suggestions
        .map((suggestion, index) => `${index + 1}. ${suggestion}`)
        .join("\n")
    : "- none -"

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
You are evaluating whether the following suggestions represent automatic negative thoughts about a single situation.

Situation:
"""
${input.situation}
"""

Detected thinking pattern:
${input.pattern ?? "not identified"}

Suggestions:
${suggestionsList}

Question:
Do these suggestions continue the same situation, represent automatic negative thoughts I might have about it, and stay aligned with the detected thinking pattern?

Reject suggestions if they:
• introduce a new situation
• contain advice
• contain reassurance

Return JSON:
{
"valid": true
}
if and only if the suggestions correctly represent automatic thoughts under the same pattern and situation. Otherwise return {"valid": false}.
`

  return runPrompt<{ valid: boolean }>(prompt)
}

export type ReflectionCompletionInput = {
  situation: string
  story: string
  pattern: string | null
  balancedThought: string
  thoughtHistory: string[]
}

export async function generateReflectionCompletion(
  input: ReflectionCompletionInput
): Promise<"continue" | "complete"> {
  const recentHistory = input.thoughtHistory.length ? input.thoughtHistory.join("\\n- ") : "None"

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
Scope: analyze patterns across multiple thoughts within the same situation.

You are determining whether I have sufficiently explored my current thought about a single situation.

Situation:
"""
${input.situation}
"""

SITUATION must describe something a camera could record.

Current interpretation:
"""
${input.story}
"""

Pattern:
${input.pattern ?? "not identified"}

Balanced thought:
"""
${input.balancedThought}
"""

Recent reflections:
- ${recentHistory}

Rules:
• Only analyze whether the reflection should continue or conclude.
• If I already covered multiple facets and the balanced perspective feels grounded, return "complete".
• Otherwise return "continue".
• Do not introduce new situations or new advice.

Return JSON only.
{
  "decision": "continue"
}
`

  const response = await runPrompt<{ decision: "continue" | "complete" }>(prompt)
  return response.decision || "continue"
}

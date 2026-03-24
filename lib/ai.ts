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

type ThoughtIntentType =
  | "DISTORTED_THOUGHT"
  | "BALANCED_THOUGHT"
  | "GOAL_OR_DESIRE"
  | "SITUATION_ONLY"
  | "EMOTION_ONLY"

export type ThoughtIntentResult = {
  type: ThoughtIntentType
  shouldRunReflection: boolean
  hasContext: boolean
  message: string | null
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

export async function classifyInput(text: string, situation?: string | null): Promise<ClassificationResult> {
  const contextSection = situation?.trim()
    ? `\nThread context (the situation already established in this conversation):\n"""${situation.trim()}"""\n`
    : ""

  const prompt = `${classificationInstructions}${contextSection}
User input:
"""
${text.trim()}
"""
`

  return runPrompt<ClassificationResult>(prompt)
}

export async function classifyThoughtIntent(
  text: string,
  situation?: string | null
): Promise<ThoughtIntentResult> {
  const prompt = `
You are classifying a user's statement for a reflection tool.

The tool analyzes worrying interpretations about situations (automatic negative thoughts).

Your job is to determine whether the user's statement contains a worrying interpretation that should be explored using reflection.

Classify into exactly one type:
- DISTORTED_THOUGHT
- BALANCED_THOUGHT
- GOAL_OR_DESIRE
- SITUATION_ONLY
- EMOTION_ONLY

DISTORTED_THOUGHT
A worrying interpretation, prediction, or assumption about a situation.
Examples:
"Maybe I failed the interview."
"My boss probably thinks I'm incompetent."
"Everyone else seems better than me."

BALANCED_THOUGHT
A thought that already sounds reflective, reasonable, or solution-oriented.
These thoughts do NOT contain a worrying interpretation.
Examples:
"Maybe I just need to manage my schedule better."
"I might need to give this more time."
"Perhaps I should focus on what I can control."

GOAL_OR_DESIRE
A statement about something the person wants to do or achieve in the future.
Examples:
"I want to start my own business."
"I want to switch careers."
"I hope to move to another country."

SITUATION_ONLY
A description of what happened without interpretation.
Examples:
"My boss hasn't replied to my message."
"It has been 3 days since my interview."

EMOTION_ONLY
A statement describing a feeling without explaining the thought behind it.
Examples:
"I feel anxious."
"I feel overwhelmed."

Important rules:
1. If the statement contains a worrying interpretation -> DISTORTED_THOUGHT
2. If the statement already sounds balanced or solution-oriented -> BALANCED_THOUGHT
3. Only choose GOAL_OR_DESIRE if the user is describing a life goal or aspiration.
4. Do NOT classify balanced reflections as goals.

Also assess whether the input contains a contextual anchor — a specific person, relationship, event, action, or time reference that the thought is attached to.

hasContext = true: Input mentions something specific (e.g. "my boss", "the interview", "3 days ago", "I sent a message")
hasContext = false: Input is a floating fear or worry with no anchor (e.g. "Maybe I'm not good enough", "What if I fail", "I always mess things up")

Return JSON:
{
"type": "",
"shouldRunReflection": true,
"hasContext": true,
"message": ""
}

Rules:

DISTORTED_THOUGHT
A worrying interpretation or assumption about a situation.
shouldRunReflection = true (only if hasContext = true)
shouldRunReflection = false (if hasContext = false — context is needed first)
message = null (if hasContext = true)
message = "That sounds like a heavy thought to carry. Sometimes thoughts like this come from something that happened recently. Was there a moment or situation that brought this up for you?" (if hasContext = false)

BALANCED_THOUGHT
A thought that already sounds reasonable or reflective.
shouldRunReflection = false
message =
"That actually sounds like a healthy way to look at it. If any worry still lingers around this, we can explore that too."

GOAL_OR_DESIRE
A statement about something the person wants to do or achieve.
shouldRunReflection = false
message =
"That sounds exciting. When you imagine it happening, does any worry or hesitation come up?"

SITUATION_ONLY
A description of what happened without an interpretation.
shouldRunReflection = false
message =
"Got it. When you think about this, what's the main worry?"

EMOTION_ONLY
A feeling without a clear thought about the situation.
shouldRunReflection = false
message =
"That feeling makes sense. When you feel this way, what kind of worry usually comes with it?"

Return JSON only.
${situation?.trim() ? `\nThread context (situation already established):\n"""${situation.trim()}"""\nUse this context when classifying — a short or vague follow-up is likely a related thought, not a general question.\n` : ""}
Input:
"""
${text.trim()}
"""
`

  return runPrompt<ThoughtIntentResult>(prompt)
}

export async function classifySituationContinuity(
  input: SituationContinuityInput
): Promise<SituationContinuityResult> {
  const history = input.threadHistory.length
    ? input.threadHistory.slice(-5).map((item) => `- ${item}`).join("\n")
    : "- none -"

  const prompt = `
The user chose to "add to this thought" — meaning they consciously decided to continue an existing thread. Respect that intent.

Your only job is to catch cases where the new thought is UNMISTAKABLY about a completely different area of life — not just a different angle, emotion, or time period within the same domain.

Situation (the original event being reflected on):
"${input.situation}"

New thought:
"${input.thought}"

Previous thoughts in this thread:
${history}

Return sameSituation: false ONLY IF you are highly confident the new thought belongs to a completely unrelated life domain.

Life domains: career/work, relationships, health, finances, family, self-worth, education, etc.

Return sameSituation: false ONLY when:
• The new thought is clearly about a different life domain (e.g. situation is about a job interview, new thought is about a fight with a partner)

Return sameSituation: true for everything else, including:
• Different angle or emotion about the same situation
• Broader pattern connected to the same domain (e.g. one interview → job search fatigue)
• Different time period but same life domain
• Self-doubt or identity beliefs that flow from the same situation
• Anything where you are not highly confident it is a different domain

When in doubt → return sameSituation: true

Examples:
Situation: "I have been waiting a month for an interview result"
Thought: "I am tired of preparing for interviews for 3 months, I think I will never get a job" → sameSituation: true (same domain — career/job search)
Thought: "My partner and I had a big fight last night" → sameSituation: false (different domain — relationship)

Situation: "My manager gave critical feedback in today's meeting"
Thought: "I have been struggling at work for years and I'm just not capable" → sameSituation: true (same domain — career, flowing from the same experience)
Thought: "I have been having chest pains and I'm worried about my heart" → sameSituation: false (different domain — health)

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

${previousThoughts.length > 0
  ? `This is a follow-up thought in an ongoing thread. The situation is already established above.`
  : `Scope: analyze ONLY the current thought. Do NOT infer deeper beliefs or long-term patterns.`}

You are helping me separate what actually happened from what my mind concluded.

Split the thought into two parts.

SITUATION (fact)
• The observable event.
• SITUATION must describe something a camera could record.
• Something an outside observer could confirm.
• Must NOT include interpretations or conclusions.
• Written in first person.

STORY (automatic thought)
• The interpretation or underlying fear my mind is making.
• This must contain ONLY the belief or assumption — not a restatement of the thought.
• If the thought is already phrased as an interpretation (e.g. "I may run out of money"),
  go one level deeper to find what the mind is actually concluding or fearing beneath it.
• Ask: "What does the person's mind believe will happen — or what does it say about them or their situation?"
• The story should name the specific feared outcome or conclusion, not just rephrase the concern.
• Do NOT simply repeat the user's words back verbatim as the story.
• Do NOT write a mild or hedged version of the concern — name what the mind is really afraid of.
• Incorrect story: "I am worried." (emotion, not interpretation)
• Incorrect story: "I may be out of money soon." (verbatim restatement)
• Incorrect story: "I might not be able to sustain my startup without funding." (too mild — still hedging)
• Correct story: "My startup will fail if I don't get funding soon." (names the feared outcome directly)
• Correct story: "I might fail the exam." (the fear beneath the worry)
• Correct story: "My idea isn't good enough to attract investors." (the belief beneath the anxiety)

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
• Emotions must be single-word ADJECTIVE labels — words that can follow "feeling ___".
• Always use the adjective form, never the noun form.
• Correct: anxious (NOT anxiety), sad (NOT sadness), hopeless (NOT hopelessness), angry (NOT anger), afraid (NOT fear), overwhelmed (NOT overwhelm)
• Examples of valid emotion words:
anxious
worried
sad
disappointed
embarrassed
hopeless
afraid
overwhelmed
helpless
frustrated

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
  previousThoughts?: string[]
  previousPatterns?: string[]
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
• Emotions must be ADJECTIVE form — words that can follow "feeling ___".
• Use: anxious (NOT anxiety), sad (NOT sadness), afraid (NOT fear), angry (NOT anger), hopeless (NOT hopelessness).
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

  const previousThoughts = context.previousThoughts ?? []
  const isFollowUp = previousThoughts.length > 0

  const threadBlock = isFollowUp
    ? `Previous thoughts in this thread:
${previousThoughts.slice(-5).map((t, i) => `${i + 1}. ${t}`).join("\n")}

This is not the first thought the person has shared about this situation.
`
    : ""

  const scopeInstruction = isFollowUp
    ? `Write one short reflective line that builds on what has already been explored.
Do not repeat the same grounding question each turn.`
    : `Write one short reflective line helping me pause and notice this interpretation.`

  const prompt = `
${FIRST_PERSON_RULE}

You are a thoughtful friend helping me slow down and notice my thinking.

The situation:
"${context.situation}"

My current interpretation:
"${context.story}"

The emotion I feel:
${context.emotion}

${threadBlock}
${scopeInstruction}

This reflection appears AFTER the person has already seen their full analysis — the fact, the story, the pattern, the balanced view. It sits just before they decide whether to go deeper.

Its purpose is to create a small moment of pause. A gentle step back. Not to dive deeper into the fear — to create just enough distance to see it more clearly.

Rules:
- One short, honest reflection line. It can be a question, but does not have to be.
- Second person ("you", "your") if asking a question.
- Maximum 1 sentence. Short. Plain language.
- Write the way a close friend would actually speak — simple, warm, direct.
- Do NOT amplify or echo the fear back at them. Do NOT ask what scares them most or what they're most afraid of.
- Do NOT use formal or clinical phrasing.
- Do NOT suggest practical solutions.
- NEVER use generic references like "this thought" or "that thought" — always name the actual thought using the person's own words. Example: instead of "When your mind says this thought…" write "When your mind says 'I might get a speeding ticket'…"

The reflection should do ONE of these things:
1. Create distance: help them see the thought from the outside ("What would you tell a friend who was thinking 'I might get a speeding ticket'?")
2. Ground in reality: bring them back to what's actually known ("What do you actually know for certain right now?")
3. Gently open the belief: point toward what assumption is underneath, without amplifying the anxiety ("What does thinking 'I might not get the job' say about what you expect from yourself?")

Good examples:
- "What would you tell a close friend who had this exact thought?"
- "Is there anything about this situation you might not be seeing fully?"
- "What would it look like to hold this thought a little more loosely?"
- "What do you know about how she feels about you right now?" (for relationship fears)

Bad examples:
- "What are you most afraid this means for the future?" (amplifies fear)
- "What's the part of this that scares you most?" (amplifies fear)
- "What does it mean to you to feel like..." (clinical, convoluted)
- "What if there are other ways to..." (practical, not reflective)

Return ONLY JSON. Do not include any explanation text outside the JSON.

{
 "stage": "recognition",
 "reflection": ""
}
`

  return runPrompt<RecognitionStage>(prompt)
}

const distortions = [
  "Mind reading",
  "Fortune telling",
  "Catastrophizing",
  "Uncertainty intolerance",
  "All-or-nothing thinking",
  "Overgeneralization",
  "Emotional reasoning",
  "Labeling",
  "Should statements",
  "Personalization",
  "Self criticism",
  "Comparison thinking"
]

// ------------------------------------
// PATTERN DISPLAY MAP
// Used by frontend to show human-friendly label
// and a fixed reflection question per distortion.
// Clinical label is stored internally only.
// ------------------------------------

export const PATTERN_DISPLAY: Record<string, {
  label: string
  question: string
}> = {
  "fortune telling": {
    label: "Jumping to what might happen",
    question: "What do you actually know for certain right now?",
  },
  "mind reading": {
    label: "Assuming what others think",
    question: "What evidence do you have for what they're thinking?",
  },
  "catastrophizing": {
    label: "Leaning toward the worst-case outcome",
    question: "What's the most realistic outcome — not the worst?",
  },
  "uncertainty intolerance": {
    label: "Uncertainty starts feeling dangerous",
    question: "What can you do right now, without needing to know the outcome?",
  },
  "self criticism": {
    label: "Being hard on yourself",
    question: "What would you tell a close friend in this exact situation?",
  },
  "overgeneralization": {
    label: "One moment becoming always",
    question: "Is this always true, or is this one difficult moment?",
  },
  "comparison thinking": {
    label: "Measuring yourself against others",
    question: "Are you seeing their full picture or just the surface?",
  },
  "all-or-nothing thinking": {
    label: "Seeing only two extremes",
    question: "What does the middle ground look like here?",
  },
  "emotional reasoning": {
    label: "Feeling it means it's true",
    question: "Is this a fact about the situation or a feeling about it?",
  },
  "personalization": {
    label: "Taking it personally",
    question: "What other factors outside you might have caused this?",
  },
  "should statements": {
    label: "Holding yourself to rigid rules",
    question: "Where did this rule come from — and is it fair to you?",
  },
  "labeling": {
    label: "Defining yourself by one moment",
    question: "Is this one moment or a permanent truth about you?",
  },
}

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

export function detectPatternFromText(_text: string): string | null {
  // Pattern detection is handled entirely by AI prompts.
  // String matching has been removed to avoid overriding
  // nuanced AI classification with brittle keyword rules.
  return null
}

export function detectInsight(_text: string): boolean {
  // Insight detection is handled entirely by AI prompts.
  // String matching has been removed to avoid false positives
  // from brittle keyword rules.
  return false
}

export function detectCoreBelief(_text: string): string | null {
  // Core belief detection is handled entirely by AI prompts.
  // String matching has been removed to avoid oversimplified
  // keyword-based classification.
  return null
}

function isInvalidSuggestionText(suggestion: string): boolean {
  // Filtering is handled by AI prompt instructions.
  // Only remove empty strings here.
  return !suggestion.toLowerCase().trim()
}

export type ThoughtContext = {
  situation: string
  interpretation: string
  emotion: string
  originalThought?: string
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

  const isFollowUp = (context.previousThoughts ?? []).length > 0

  const originalThought = context.originalThought?.trim() || null

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
${contextBlock}
${isFollowUp
  ? `This is not the first thought in this thread. When writing the patternMessage, be aware of the full arc of thoughts. If the same pattern is appearing again in a new form, name that — e.g. "this is the same mind doing the same thing from a different angle." If it's a connected but different pattern, note how it builds on what came before.`
  : `Scope: analyze ONLY the current thought. Do NOT infer deeper beliefs or long-term patterns.`}

You are identifying the thinking pattern behind this interpretation
and writing a personal message that helps the person notice it.

Situation:
"""
${situation}
"""

${originalThought ? `The person's original thought (exact words they typed):
"""
${originalThought}
"""

CRITICAL: Choose the pattern based on the ORIGINAL THOUGHT above — what the person actually said, in their own words and tone. The "Interpretation" below is a cleaned-up extraction, not what the person said. Use it only for context, not for pattern classification.

If the original thought uses uncertain language ("what will happen", "I don't know", "what if", "maybe") → the pattern is about uncertainty, not catastrophizing.
If the original thought names a specific bad outcome as likely or certain → only then consider Catastrophizing.

` : ""}Interpretation (for context):
"""
${interpretation}
"""

Emotion:
${emotion}

STEP 1 — Choose the pattern

Choose ONLY from this list:
${distortions.join("\n")}

You must choose ONLY from this list.
Do not invent new names.
If none apply, return null for pattern and patternMessage.

STEP 2 — Write a contextual patternMessage

Write 1–2 sentences that help the person notice this pattern
in their own specific thought.

STRICT RULES for patternMessage:
- Reference something specific from the CURRENT THOUGHT — a timeframe,
  a word, a fact the person mentioned in what they just wrote.
- If the current thought introduces new context (e.g. "3 months of searching"),
  use THAT, not the original situation's details.
- Do NOT write a generic description of the pattern.
- Do NOT use clinical or textbook language.
- Do NOT start with "Your mind" every time — vary the opening.
- If your message could apply to any person in any situation,
  rewrite it until it could not.
- Write in second person ("you", "your") — warm, not cold.
- Maximum 2 sentences. Keep it short.

TONE GUIDE — use the style that matches the pattern:

Fortune telling
Name what the mind jumped to before the facts arrived.
Focus on the gap between what happened and what was concluded.
Example: "Three days of silence and you've already written
the ending — but silence isn't the same as a no."

IMPORTANT disambiguation — Fortune telling vs Overgeneralization:
Fortune telling = predicting a specific upcoming event ("I won't get this job", "they'll reject me")
Overgeneralization = using absolute words like "never", "always", "no one", "everyone" to
declare a permanent truth from limited experience ("I will NEVER get a job", "nothing ever works out")
If the person used "never", "always", or similar absolute language → choose Overgeneralization, NOT Fortune telling.

Mind reading
Name what they're assuming about someone else's internal state.
Focus on the assumption being treated as fact.
Example: "You're reading their expression as a verdict —
but you can't know what was happening in their mind."

Self criticism
Separate the external event from the self-judgment.
Focus on the leap from 'this didn't go well' to
'I am not good enough.'
Example: "Your mind has taken one difficult moment
and turned it into a verdict about your worth —
those are two very different things."

Overgeneralization
Name the leap from one specific moment to a permanent truth.
Focus on words like always, never, everyone, no one.
Example: "Three months of trying hasn't worked yet —
but your mind has turned 'not yet' into 'never.'"

Catastrophizing
ONLY choose this when the person has explicitly stated or strongly implied
a specific bad outcome — not just expressed general worry or open-ended uncertainty.
The person must have named or clearly implied the disaster (e.g. "I'll fail", "this is over",
"I'll lose everything", "my startup will collapse").
NEVER choose catastrophizing for statements using uncertain language like:
"I may...", "I might...", "I could...", "I wonder if...", "what will happen..."
These are uncertainty, not catastrophizing — use Uncertainty intolerance or Fortune telling instead.
A clear test: has the person stated a specific bad outcome as if it's likely or certain? If they used
"may" or "might", the answer is no — they're sitting in uncertainty, not predicting disaster.
Name the jump from uncertain to a specific worst-case outcome.
Focus on how many steps the mind skipped to get there.
Example: "Your mind went from uncertainty straight to
the worst possible ending — skipping everything in between."

Disambiguation examples:
"I may be out of money soon" → Uncertainty intolerance (not catastrophizing — "may" = sitting in fear of the unknown)
"I am going to run out of money and lose everything" → Catastrophizing (specific outcome stated as likely)
"I will never get a job" → Overgeneralization (not catastrophizing — "never" is a permanent verdict from limited experience, not a worst-case escalation chain)
"I'll never get a job, I'll end up with nothing, my life is over" → Catastrophizing (escalating chain of worst outcomes)

Uncertainty intolerance
Choose this when the distress is coming from not knowing the outcome,
rather than from predicting a specific bad one. The person is treating
the open question itself as unbearable, not necessarily expecting disaster.
Common signals: "what will happen?", "I don't know what's next",
"I can't stand not knowing", or any thought where the anxiety is about
uncertainty itself rather than a specific feared outcome.
Name the discomfort with not knowing, and the mind's urge to resolve it.
Focus on how the uncertainty — not any specific outcome — is the thing
the mind is reacting to.
Example: "No funding yet, and your mind is treating the open question
itself as the threat — as if not knowing is the same as knowing it goes badly."

Comparison thinking
Name what they're measuring themselves against and why
the comparison is incomplete or unfair.
Focus on the fact they're seeing someone else's surface,
not their full picture.
Example: "You're measuring your inside against someone
else's outside — that comparison will always feel unfair."

All-or-nothing thinking
Name the binary the mind created — the two extremes
with nothing in between.
Focus on what the middle ground actually looks like.
Example: "Your mind has made this either a complete
success or a total failure — with no space for
anything in between."

Emotional reasoning
Name the emotion being used as evidence for a fact.
Focus on the difference between feeling something is true
and it actually being true.
Example: "Because it feels certain, your mind is treating
it as certain — but a feeling isn't the same as a fact."

Personalization
Name the external event the person has taken full
responsibility for.
Focus on the other factors outside them that also played a part.
Example: "Your mind has made you the single cause of
something that had many moving parts beyond your control."

Should statements
Name the specific rigid rule the mind is applying.
Focus on the standard being held and how little room it leaves.
Example: "There's a rule running in your mind about how
this should have gone — and it leaves no room for
things being genuinely hard."

Labeling
Name the permanent label being attached to a temporary event.
Focus on the difference between one moment and a fixed identity.
Example: "One difficult experience and your mind has
attached a label — as if a single moment defines
everything you are."

Return ONLY JSON. No explanation outside the JSON.

{
  "stage": "pattern",
  "pattern": null,
  "patternMessage": null
}
`

  const result = await runPrompt<PatternStage & { patternMessage?: string }>(prompt)
  const finalPattern = result.pattern?.trim() || null

  return {
    stage: "pattern",
    pattern: finalPattern,
    explanation: result.patternMessage?.trim() || null,
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

  const isFollowUp = (context.previousThoughts ?? []).length > 0

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
${contextBlock}
${isFollowUp
  ? `This is not the first thought in this thread. The previous thoughts are listed above.

CRITICAL RULE: Do NOT write a balanced perspective that only addresses the current thought in isolation.
You must synthesize the full arc of thoughts in this thread.

How to do this:
- Notice the spiral: what has the person's mind been doing across all their thoughts?
- Name the overall fear or pattern they keep circling back to, not just the latest thought
- Offer a calm, realistic perspective that speaks to the whole picture

The response should feel like: "I notice I've been going deeper into the same fear across all these thoughts — first X, then Y, now Z. But what's actually true is..."
NOT like: "I feel anxious about [current thought]. It's possible I'm jumping to conclusions."`
  : `Scope: analyze ONLY the current thought. Do NOT infer deeper beliefs or long-term patterns.`}

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

1. Acknowledge the feeling or uncertainty — one sentence.
2. Offer a calmer or more realistic alternative interpretation — one sentence.
3. If there is a specific grounding fact that makes the fear less certain
   — for example, if someone is waiting for interview results, note that
   a few days is within normal response time — add it as a third sentence.
   Only include this if it is factually grounded in the situation.
   Do not invent facts.
   IMPORTANT: Do NOT use generic industry statistics or platitudes as grounding facts.
   Bad example: "Many startups take a while to secure funding." (generic, impersonal)
   Bad example: "Most founders face this at some point." (reassurance, not grounding)
   Good example: "I haven't heard back yet, but I haven't been rejected either." (specific to the actual situation)

Total: 2–3 short sentences maximum.

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
  const previousThoughts = context.previousThoughts ?? []

  const prompt = `
${THREAD_CONTEXT_BLOCK}
${IMPORTANT_SITUATION_RULE}
${FIRST_PERSON_RULE}
${contextBlock}
Scope: analyze patterns across multiple thoughts within the same situation.

You are helping me explore my thinking more deeply — not spiral further into negativity.

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

Generate 3 suggestions that help me understand my thinking more clearly.
Each suggestion must do exactly ONE of these three things:

TYPE A — Surface the deeper belief underneath the pattern.
Not more examples of the same fear — but the root belief driving it.
Example: "Maybe I'm afraid this means I'm not good enough."
Example: "Maybe I'm scared that failure here says something permanent about me."

TYPE B — Introduce a genuine alternative explanation for the situation.
A realistic possibility the mind hasn't considered.
Example: "Maybe they're still reviewing all candidates."
Example: "Maybe the delay is about their process, not my performance."

TYPE C — Redirect toward something I can actually control or do.
A grounded, agency-restoring thought — not advice, just a direction.
Example: "Maybe I could follow up after a few more days."
Example: "Maybe I could ask for feedback regardless of the outcome."

STRICT RULES:
1. Generate exactly one suggestion of each type — one A, one B, one C.
2. NEVER generate thoughts that assume what others think negatively about me.
3. NEVER generate thoughts that predict failure or rejection.
4. NEVER extend or deepen the current negative pattern.
5. NEVER give advice using "should" or "must".
6. NEVER offer reassurance like "it will be fine".
7. Do not repeat any previous thoughts.
8. Write in first person as an internal thought.
9. Keep each suggestion to one short sentence.

BAD examples — never generate these:
"Maybe they didn't think my answers were strong enough."
"Maybe another candidate had more experience."
"Maybe I didn't explain my work clearly."
"Maybe they believe someone else is more qualified."
"Maybe I'm just not cut out for this."

GOOD examples — generate these instead:
"Maybe I'm scared this says something about my worth."
"Maybe they're still in the middle of their process."
"Maybe I could reach out after a few more days."

Return JSON:
{
"stage": "next_thought",
"suggestions": [
  "TYPE A thought here",
  "TYPE B thought here",
  "TYPE C thought here"
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

// ------------------------------------
// ACKNOWLEDGEMENT
// Fast pre-call — runs in parallel with main pipeline.
// Returns a personal acknowledgement and grounding
// reassurance based on the user's actual thought.
// ------------------------------------

export type AcknowledgementOutput = {
  acknowledgement: string
  reassurance: string
}

export async function generateAcknowledgement(
  thought: string
): Promise<AcknowledgementOutput> {
  const prompt = `
You are reading someone's thought. Write two things.

ACKNOWLEDGEMENT
One warm sentence. Maximum 15 words.
Use a specific word or detail from their thought.
Do not analyse. Do not advise. Do not label.
Do not start with "I" or "That".

REASSURANCE
One short grounding sentence. Maximum 12 words.
Anchor them to what is stable or true right now.
Not a promise about the future.
Not "everything will be okay."
Something that is factually true in this moment.

Examples:

Thought: "I think I'm going to be fired"
Acknowledgement: "Waiting for news like that is one of the worst feelings."
Reassurance: "Right now, in this moment, you are safe."

Thought: "I'm running a startup with no funding"
Acknowledgement: "Building something without a safety net takes real courage — and real worry."
Reassurance: "The startup is still running. You are still here."

Thought: "My dad didn't come to my graduation"
Acknowledgement: "That kind of absence on an important day stays with you."
Reassurance: "What happened was real. So is the fact that you got through it."

Thought: "I said something awkward and can't stop thinking about it"
Acknowledgement: "The mind replays those moments far longer than anyone else remembers them."
Reassurance: "The moment has passed. You are okay right now."

Thought: "I have been unemployed for 3 months"
Acknowledgement: "Three months of uncertainty takes a real toll on a person."
Reassurance: "You are still here. You are still trying."

Thought: "Maybe people only tolerate me, they don't actually like me"
Acknowledgement: "Wondering whether people genuinely like you is a lonely place to be."
Reassurance: "That thought is not the same as it being true."

Return JSON only:
{
  "acknowledgement": "",
  "reassurance": ""
}

Thought:
"${thought.trim()}"
`

  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    max_tokens: 80,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.choices?.[0]?.message?.content?.trim() ?? ""

  try {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start === -1 || end === -1) throw new Error("no json")
    const parsed = JSON.parse(text.slice(start, end + 1))
    return {
      acknowledgement: typeof parsed.acknowledgement === "string"
        ? parsed.acknowledgement.trim()
        : "",
      reassurance: typeof parsed.reassurance === "string"
        ? parsed.reassurance.trim()
        : "Right now, in this moment, you are okay.",
    }
  } catch {
    return {
      acknowledgement: "",
      reassurance: "Right now, in this moment, you are okay.",
    }
  }
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

// ------------------------------------
// REFLECTION CARD
// ------------------------------------

export type ReflectionCardInput = {
  situation: string
  story: string
  emotion: string
  pattern: string | null
}

export type ReflectionCardOutput = {
  question: string
}

export async function generateReflectionCard(
  input: ReflectionCardInput
): Promise<ReflectionCardOutput> {
  const prompt = `
${FIRST_PERSON_RULE}

You are a thoughtful guide helping someone reflect on their own thinking.

The person has just seen their thought broken down into:
- What actually happened (situation)
- What their mind assumed it meant (story)
- How it made them feel (emotion)
- The thinking pattern involved (pattern)

Your job is to ask ONE short, open question that helps them
arrive at their own balanced perspective — without telling
them what to think.

The question should:
• Be warm and gentle — not clinical
• Help them see the situation from a slightly wider angle
• Be answerable in 1–2 sentences
• Feel like something a thoughtful friend would ask
• NOT ask about the future or make predictions
• NOT contain the word "really"
• NOT be a yes/no question

Situation:
"${input.situation}"

Their interpretation:
"${input.story}"

Emotion:
${input.emotion}

Thinking pattern:
${input.pattern ?? "not identified"}

Examples of good questions:
"What's one thing you know for certain right now?"
"What would you tell a close friend who came to you with this same thought?"
"Is there any part of this situation that might have a different explanation?"
"What evidence do you have that supports this interpretation — and what might challenge it?"

Return JSON only:
{
  "question": ""
}
`

  return runPrompt<ReflectionCardOutput>(prompt)
}

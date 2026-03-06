import OpenAI from "openai";

export async function processThought(thought: string) {
const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY})
const prompt = `
You are a compassionate cognitive reflection assistant trained in cognitive behavioral therapy (CBT).

Your job is to analyze the user's thought and separate **objective reality** from **interpretation, fear, or assumption**.

Definitions:
- Fact: What actually happened. Something that could be observed or verified by another person.
- Story: The meaning, interpretation, or assumption the user is adding to the situation.
- Emotion: The primary feeling behind the thought. Use a single word (fear, sadness, anxiety, shame, anger, etc).
- ReflectionQuestion: A gentle question that helps the user examine whether their story is completely true.
- BalancedThought: A calmer and more realistic perspective that acknowledges the emotion but reduces distortion.

Important Guidelines:
- Be empathetic and non-judgmental.
- Do NOT invalidate the user's feelings.
- Help identify hidden fears or assumptions.
- The balanced thought should feel supportive and realistic, not overly positive.

User Thought:
"${thought}"

Return ONLY valid JSON in this format:

{
  "fact": "...",
  "story": "...",
  "emotion": "...",
  "reflectionQuestion": "...",
  "balancedThought": "..."
}
`

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: prompt }
    ]
  })

  const text = response.choices[0].message.content || ""

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()

  return JSON.parse(cleaned)
}
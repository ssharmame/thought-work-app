import OpenAI from "openai";
const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY})
console.log("API KEY LOADED:", process.env.OPENAI_API_KEY?.slice(0,10));
export async function processThought(thought: string) {

  const prompt = `
You are a cognitive reflection assistant.

Analyze the user's thought and return structured JSON with:

1. fact (objective event)
2. story (interpretation or assumption)
3. emotion (one word feeling)
4. reflectionQuestion (a question that challenges the story)
5. balancedThought (a constructive alternative perspective)

User Thought:
"${thought}"

Return ONLY valid JSON.
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